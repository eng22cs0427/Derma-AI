import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection, ObjectId } from '@/lib/mongodb'
import type { IProfile, ISkinAnalysis, IMedicalHistory } from '@/database/mongodb-schema'
import { uploadAnalysisImage } from '@/lib/cloudinary'

const DISEASE_INFO: Record<string, string> = {
  akiec: 'Actinic keratoses (precancerous patches)',
  bcc: 'Basal cell carcinoma (common skin cancer)',
  bkl: 'Benign keratosis (non-cancerous growth)',
  df: 'Dermatofibroma (benign nodule)',
  mel: 'Melanoma (serious skin cancer)',
  nv: 'Melanocytic nevus (mole)',
  vasc: 'Vascular lesion (blood vessel abnormality)',
  carcinoma: 'Carcinoma (malignant epithelial tumor)',
}

const RISK_LEVEL: Record<string, { risk: string; stage: number; action: string }> = {
  akiec: { risk: 'High', stage: 2, action: 'Consult a dermatologist within 2 weeks.' },
  bcc: { risk: 'High', stage: 2, action: 'Immediate medical consultation required for biopsy.' },
  bkl: { risk: 'Low', stage: 1, action: 'Generally benign — monitor for changes.' },
  df: { risk: 'Low', stage: 1, action: 'Benign — no treatment usually needed.' },
  mel: { risk: 'Very High', stage: 3, action: 'URGENT — immediate dermatologist consultation.' },
  nv: { risk: 'Low', stage: 1, action: 'Common mole — monitor ABCDEs.' },
  vasc: { risk: 'Medium', stage: 1, action: 'Dermatologist check-up recommended.' },
  carcinoma: { risk: 'Very High', stage: 3, action: 'Immediate biopsy and treatment needed.' },
  default: { risk: 'Medium', stage: 2, action: 'Please consult a specialist.' },
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const predictionRaw = formData.get('prediction') as string

    if (!file || !predictionRaw) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const data = JSON.parse(predictionRaw)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''

    const profiles = await getCollection<IProfile>('profiles')
    let profileDoc = await profiles.findOne({ $or: [{ clerkUserId: user.id }, { email: primaryEmail }] })

    if (!profileDoc) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail.split('@')[0]
      const now = new Date()
      const res = await profiles.insertOne({
        clerkUserId: user.id, email: primaryEmail, fullName,
        role: 'patient', isActive: true, isOnboarded: false,
        createdAt: now, updatedAt: now,
      })
      profileDoc = await profiles.findOne({ _id: res.insertedId })
    }

    const profileId = profileDoc!._id!

    // Upload to Cloudinary
    let imageUrl = ''
    let imageKey = ''
    try {
      const result = await uploadAnalysisImage(profileId.toString(), fileBuffer, file.type)
      imageUrl = result.url
      imageKey = result.key
    } catch (err) {
      console.error('[save-analysis] Cloudinary upload failed:', err)
    }

    const predictionKey = (data.prediction || '').toLowerCase()
    const matchedKey = Object.keys(RISK_LEVEL).find(
      (k) => k.toLowerCase() === predictionKey || predictionKey.includes(k.toLowerCase())
    )
    const riskData = RISK_LEVEL[matchedKey || 'default']
    const assessment = DISEASE_INFO[matchedKey || ''] || 'Detailed assessment required'

    const detailsObj = {
      Patient_Name: profileDoc!.fullName || 'Patient',
      Diagnosis: data.prediction,
      Confidence: `${(data.confidence * 100).toFixed(2)}%`,
      Risk_Level: riskData.risk,
      Severity_Stage: riskData.stage,
      Assessment: assessment,
      Recommendation: riskData.action,
      imageUrl,
      analysis_time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' (IST)',
    }

    const now = new Date()

    // Insert medical history
    const histCol = await getCollection<IMedicalHistory>('medical_history')
    const histResult = await histCol.insertOne({
      userId: profileId,
      type: 'Analysis',
      data: `Skin Analysis — ${data.prediction} Detected`,
      details: detailsObj,
      date: now,
      createdAt: now,
      updatedAt: now,
    })

    // Insert skin analysis record
    const analysisCol = await getCollection<ISkinAnalysis>('skin_analyses')
    await analysisCol.insertOne({
      userId: profileId,
      imageUrl,
      imageKey,
      predictionClass: data.prediction,
      predictionName: data.prediction_name || data.prediction,
      confidenceScore: data.confidence * 100,
      riskLevel: riskData.risk as ISkinAnalysis['riskLevel'],
      severityStage: riskData.stage as 1 | 2 | 3,
      allPredictions: data.class_probabilities ?? {},
      pdfReportUrl: data.pdf_report_url || undefined,
      azureQualityScore: data.azure_quality_score,
      preprocessingApplied: data.preprocessing_applied || [],
      doctorReviewed: false,
      followUpRequired: false,
      createdAt: now,
    })

    return NextResponse.json({ success: true, savedData: { ...detailsObj, id: histResult.insertedId.toString() } })
  } catch (error) {
    console.error('[save-analysis] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
