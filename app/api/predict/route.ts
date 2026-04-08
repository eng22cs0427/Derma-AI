import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import { uploadAnalysisImage } from '@/lib/cloudinary'
import type { IProfile, ISkinAnalysis, IMedicalHistory } from '@/database/mongodb-schema'

const API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const apiUrl = API_URL || ''
  const mlDisabled =
    apiUrl === 'disabled' ||
    !apiUrl ||
    (apiUrl.includes('localhost') && isProduction) ||
    (apiUrl.includes('127.0.0.1') && isProduction)

  if (mlDisabled) {
    return NextResponse.json(
      { error: 'ML service unavailable', message: 'FastAPI backend not deployed yet.', status: 'disabled' },
      { status: 503 }
    )
  }

  try {
    const user = await currentUser()
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    const formData = await request.formData()
    const file = formData.get('file') as File

    // Forward to FastAPI
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { ...(authToken && { Authorization: `Bearer ${authToken}` }) },
      body: formData,
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (!response.ok) {
      if (response.status === 503) {
        return NextResponse.json({ error: 'AI Brain is waking up (Cold Start). Please wait around 30 seconds and try again.' }, { status: 503 })
      }
      if (isJson) {
        const errorData = await response.json()
        return NextResponse.json({ error: errorData.detail || 'Failed to process image' }, { status: response.status })
      }
      const errorText = await response.text()
      return NextResponse.json({ error: 'AI service non-JSON error', details: errorText.slice(0, 200) }, { status: response.status })
    }

    if (!isJson) {
      const bodyText = await response.text()
      return NextResponse.json({ error: 'Invalid AI response format', details: bodyText.slice(0, 200) }, { status: 502 })
    }

    let data = await response.json()

    // Map Hugging Face response format to the expected format if prediction is an object
    if (data.prediction && typeof data.prediction === 'object' && data.prediction !== null) {
      const hfPredName = data.prediction.name || 'Unknown'
      const lowerName = hfPredName.toLowerCase()
      
      let mappedPrediction = 'nv' // default to benign nevus code
      if (lowerName.includes('melanoma') || lowerName.includes('mel')) mappedPrediction = 'mel'
      else if (lowerName.includes('basal') || lowerName.includes('bcc')) mappedPrediction = 'bcc'
      else if (lowerName.includes('actinic') || lowerName.includes('akiec')) mappedPrediction = 'akiec'
      else if (lowerName.includes('carcinoma')) mappedPrediction = 'carcinoma'
      else if (lowerName.includes('vascular') || lowerName.includes('vasc')) mappedPrediction = 'vasc'
      else if (lowerName.includes('benign')) mappedPrediction = 'bkl'

      const classProbs: Record<string, number> = {}
      if (Array.isArray(data.top_predictions)) {
         data.top_predictions.forEach((t: any) => { classProbs[t.label] = t.confidence })
      }

      data = {
         ...data,
         prediction: mappedPrediction,
         prediction_name: hfPredName,
         confidence: data.prediction.confidence !== undefined ? data.prediction.confidence : 0.8,
         class_probabilities: classProbs,
         risk_level: data.prediction.severity === 'Severe' ? 'High' : 'Low',
         severity_stage: data.prediction.severity === 'Severe' ? 3 : 1,
         heatmap_image: data.heatmap_image || '', 
      }
    }

    // Persist to MongoDB + Cloudinary if user is logged in
    if (user && file) {
      try {
        const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
        const profiles = await getCollection<IProfile>('profiles')
        const profileDoc = await profiles.findOne({ $or: [{ clerkUserId: user.id }, { email: primaryEmail }] })

        if (profileDoc) {
          const profileId = profileDoc._id!
          const fullName = profileDoc.fullName || 'Unknown User'

          // Calculate age
          let age = 'N/A'
          if (profileDoc.dateOfBirth) {
            const birth = new Date(profileDoc.dateOfBirth)
            const now = new Date()
            let calculatedAge = now.getFullYear() - birth.getFullYear()
            const m = now.getMonth() - birth.getMonth()
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) calculatedAge--
            age = `${calculatedAge} years`
          }

          // Upload to Cloudinary
          const buffer = Buffer.from(await file.arrayBuffer())
          const { url: imageUrl, key: imageKey } = await uploadAnalysisImage(profileId.toString(), buffer, file.type)

          const riskLevel = data.risk_level || data.details?.risk || (
            ['mel', 'carcinoma', 'bcc'].includes(data.prediction?.toLowerCase()) ? 'Very High' : 'Low'
          )
          const now = new Date()

          // Store analysis record
          const analysisCol = await getCollection<ISkinAnalysis>('skin_analyses')
          await analysisCol.insertOne({
            userId: profileId,
            imageUrl,
            imageKey,
            predictionClass: data.prediction,
            predictionName: data.prediction_name || data.prediction,
            confidenceScore: data.confidence * 100,
            riskLevel: riskLevel as ISkinAnalysis['riskLevel'],
            severityStage: (data.severity_stage || 1) as 1 | 2 | 3,
            severityLabel: data.severity_label,
            allPredictions: data.class_probabilities ?? {},
            pdfReportUrl: data.pdf_report_url,
            azureQualityScore: data.azure_quality_score,
            preprocessingApplied: data.preprocessing_applied || [],
            doctorReviewed: false,
            followUpRequired: false,
            createdAt: now,
          })

          // Store in medical history
          const histCol = await getCollection<IMedicalHistory>('medical_history')
          await histCol.insertOne({
            userId: profileId,
            type: 'Analysis',
            data: `Skin Analysis — ${data.prediction} Detected`,
            details: {
              Patient_Name: fullName,
              Patient_Age: age,
              Diagnosis: data.prediction,
              Diagnosis_Name: data.prediction_name || data.prediction,
              Confidence: `${(data.confidence * 100).toFixed(2)}%`,
              Risk_Level: riskLevel,
              Severity_Stage: data.severity_stage || 1,
              Recommended_Specialist: data.recommended_specialist,
              imageUrl,
              source: 'DermaSense AI Engine v2.0',
              analysis_time: now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' (IST)',
            },
            date: now,
            createdAt: now,
            updatedAt: now,
          })
        }
      } catch (dbError) {
        console.error('[predict] DB/Storage save failed:', dbError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'AI service connection failed. The Hugging Face backend might be temporarily unreachable.' },
          { status: 503 }
        )
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
