import { type NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/mongodb'
import { uploadAnalysisImage } from '@/lib/cloudinary'
import { analyzeImageWithAzure } from '@/lib/azure-vision'
import { analyzeWithGPT4oVision } from '@/lib/azure-openai-vision'
import { DISEASE_DB } from '@/lib/skin-disease-db'
import type { IProfile, ISkinAnalysis, IMedicalHistory } from '@/database/mongodb-schema'

const ML_API_URL = process.env.ML_API_URL || ''

type SeverityLevel = 'Critical' | 'High' | 'Moderate' | 'Low' | 'None'

/**
 * DermaSense AI — 3-Engine Parallel Analysis Pipeline
 *
 * Stage 1 (parallel): Azure Computer Vision — image quality + skin tag detection + color
 * Stage 2 (parallel): HF ML Model          — CNN classification (7 core classes)
 * Stage 3 (serial):   Azure OpenAI GPT-4o  — visual medical reasoning (40+ conditions)
 * Fusion:             Cross-validate + weight results + determine severity
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const selectedBodyPart = (formData.get('bodyPart') as string) || 'other'

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ── STAGE 1 & 2: Run Azure CV and ML Model in PARALLEL ─────────────────
    const [azureSettled, mlSettled] = await Promise.allSettled([
      analyzeImageWithAzure(buffer),
      callMLModel(file),
    ])

    const azureResult = azureSettled.status === 'fulfilled' ? azureSettled.value : null
    const mlResult = mlSettled.status === 'fulfilled' ? mlSettled.value : null

    // ── STAGE 3: GPT-4o Reasoning (most accurate, runs last) ────────────────
    const gptResult = await analyzeWithGPT4oVision(buffer, selectedBodyPart)

    // ── FUSION ENGINE ────────────────────────────────────────────────────────
    const finalResult = fuseResults(azureResult, mlResult, gptResult, selectedBodyPart)

    // ── PERSIST TO MONGODB + CLOUDINARY ─────────────────────────────────────
    if (user && file) {
      try {
        const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
        const profiles = await getCollection<IProfile>('profiles')
        const profileDoc = await profiles.findOne({
          $or: [{ clerkUserId: user.id }, { email: primaryEmail }],
        })

        if (profileDoc) {
          const profileId = profileDoc._id!
          const fullName = profileDoc.fullName || 'Unknown User'

          let age = 'N/A'
          if (profileDoc.dateOfBirth) {
            const birth = new Date(profileDoc.dateOfBirth)
            const now = new Date()
            let a = now.getFullYear() - birth.getFullYear()
            if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() - birth.getMonth() === 0 && now.getDate() < birth.getDate())) a--
            age = `${a} years`
          }

          const { url: imageUrl, key: imageKey } = await uploadAnalysisImage(
            profileId.toString(), buffer, file.type
          )

          const now = new Date()
          const analysisCol = await getCollection<ISkinAnalysis>('skin_analyses')
          await analysisCol.insertOne({
            userId: profileId,
            imageUrl,
            imageKey,
            predictionClass: finalResult.prediction,
            predictionName: finalResult.prediction_name,
            confidenceScore: finalResult.confidence * 100,
            riskLevel: mapSeverityToRisk(finalResult.severity) as ISkinAnalysis['riskLevel'],
            severityStage: mapSeverityToStage(finalResult.severity) as 1 | 2 | 3,
            severityLabel: finalResult.severity_label,
            allPredictions: finalResult.class_probabilities ?? {},
            azureQualityScore: finalResult.azure_quality_score,
            preprocessingApplied: [],
            doctorReviewed: false,
            followUpRequired: finalResult.severity === 'Critical' || finalResult.severity === 'High',
            createdAt: now,
          })

          const histCol = await getCollection<IMedicalHistory>('medical_history')
          await histCol.insertOne({
            userId: profileId,
            type: 'Analysis',
            data: `Skin Analysis — ${finalResult.prediction_name} (${selectedBodyPart})`,
            details: {
              Patient_Name: fullName,
              Patient_Age: age,
              Diagnosis: finalResult.prediction,
              Diagnosis_Name: finalResult.prediction_name,
              Confidence: `${(finalResult.confidence * 100).toFixed(2)}%`,
              Risk_Level: finalResult.severity,
              Severity_Stage: mapSeverityToStage(finalResult.severity),
              Body_Part: selectedBodyPart,
              Fitzpatrick: finalResult.fitzpatrick_type,
              Skin_Tone: finalResult.skin_tone,
              ICD10: finalResult.icd10,
              Recommended_Specialist: DISEASE_DB[finalResult.prediction]?.specialists?.[0],
              imageUrl,
              source: 'DermaSense AI Engine v3.0 (Azure CV + GPT-4o + ML)',
              analysis_time: now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
            },
            date: now,
            createdAt: now,
            updatedAt: now,
          })
        }
      } catch (dbErr) {
        console.error('[predict-azure] DB save error:', dbErr)
      }
    }

    return NextResponse.json(finalResult)
  } catch (err) {
    console.error('[predict-azure] Error:', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}

// ── ML Model Call ──────────────────────────────────────────────────────────
async function callMLModel(file: File) {
  if (!ML_API_URL || ML_API_URL === 'disabled') return null

  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${ML_API_URL}/predict`, { method: 'POST', body: formData })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

// ── Fusion Engine ──────────────────────────────────────────────────────────
import type { AzureVisionResult } from '@/lib/azure-vision'

function fuseResults(
  azure: AzureVisionResult | null,
  ml: Record<string, unknown> | null,
  gpt: Awaited<ReturnType<typeof analyzeWithGPT4oVision>>,
  bodyPart: string
) {
  // Check if it's a skin image at all
  const azureSkinConf = azure?.skinConfidence ?? 0.5
  if (!gpt.is_skin_image && azureSkinConf < 0.2) {
    return {
      error: 'not_skin_image',
      prediction: 'error',
      prediction_name: 'Image Not Recognized',
      confidence: 0,
      severity: 'None' as SeverityLevel,
      severity_label: 'Please retake with a clear skin image',
      message: 'Please capture a clear, close-up image of the skin area to be analyzed.',
      class_probabilities: {},
      icd10: '',
      fitzpatrick_type: 'II',
      skin_tone: '',
      abcde: { asymmetry: '', border: '', color: [], diameter_estimate: '', evolution_indicators: '' },
      lesion_morphology: '',
      location: bodyPart,
      differential_diagnoses: [],
      clinical_notes: '',
      urgency: 'No action needed',
      azure_quality_score: azureSkinConf,
      needs_doctor_review: false,
      engines_used: { azure_cv: !!azure, gpt4o: true, ml_model: !!ml },
      body_part: bodyPart,
      body_part_matches: gpt.body_part_matches_selection,
    }
  }

  const mlConfidence = typeof ml?.confidence === 'number' ? (ml.confidence as number) : 0
  const gptConfidence = gpt.confidence

  // Healthy skin detection
  const isHealthy =
    (mlConfidence < 0.28 && gptConfidence < 0.28) ||
    gpt.condition_code === 'healthy' ||
    (typeof ml?.prediction === 'string' && ml.prediction === 'nv' && mlConfidence < 0.40 && gptConfidence < 0.30)

  if (isHealthy) {
    const diseaseInfo = DISEASE_DB['healthy']
    return {
      prediction: 'healthy',
      prediction_name: 'Healthy Skin',
      icd10: 'Z00.0',
      confidence: Math.max(mlConfidence, gptConfidence, 0.15),
      severity: 'None' as SeverityLevel,
      severity_label: 'No Concern',
      fitzpatrick_type: gpt.fitzpatrick_type || 'II',
      skin_tone: gpt.skin_tone_description || 'Light to Medium',
      abcde: gpt.abcde || { asymmetry: 'Symmetric', border: 'Regular', color: ['Uniform'], diameter_estimate: 'N/A', evolution_indicators: 'None' },
      lesion_morphology: 'none',
      location: gpt.detected_body_part || bodyPart,
      differential_diagnoses: [],
      clinical_notes: `The analyzed ${gpt.detected_body_part || bodyPart} area shows normal texture, even pigmentation, and no concerning lesion morphology. Continue routine skin care and schedule annual dermatology check-ups.`,
      urgency: 'No action needed',
      class_probabilities: (ml?.class_probabilities as unknown as Record<string, number>) || {},
      azure_quality_score: azureSkinConf,
      needs_doctor_review: false,
      engines_used: { azure_cv: !!azure, gpt4o: true, ml_model: !!ml },
      body_part: bodyPart,
      body_part_matches: gpt.body_part_matches_selection,
      symptoms: diseaseInfo?.symptoms || [],
      treatments: diseaseInfo?.treatments || [],
      precautions: diseaseInfo?.precautions || [],
      specialists: diseaseInfo?.specialists || [],
    }
  }

  // Determine winning prediction
  const mlPrediction = typeof ml?.prediction === 'string' ? ml.prediction : ''
  const usePrimary = gptConfidence >= mlConfidence ? 'gpt' : 'ml'
  const predictionCode = usePrimary === 'gpt' ? gpt.condition_code : mlPrediction
  const predictionName = usePrimary === 'gpt' ? gpt.primary_condition : (DISEASE_DB[mlPrediction]?.name || mlPrediction)

  // Weighted confidence fusion
  const finalConfidence = gptConfidence * 0.55 + mlConfidence * 0.35 + azureSkinConf * 0.10

  // Doctor review if engines disagree strongly
  const needsDoctorReview = Math.abs(gptConfidence - mlConfidence) > 0.40

  const diseaseInfo = DISEASE_DB[predictionCode]
  const azureData = azure

  return {
    prediction: predictionCode,
    prediction_name: predictionName,
    icd10: gpt.icd10 || diseaseInfo?.icd10 || '',
    confidence: Math.min(finalConfidence, 0.99),
    severity: (gpt.severity || diseaseInfo?.severity || 'Low') as SeverityLevel,
    severity_label: getSeverityLabel(gpt.severity || diseaseInfo?.severity || 'Low'),
    fitzpatrick_type: gpt.fitzpatrick_type || azureData?.fitzpatrickEstimate || 'II',
    skin_tone: gpt.skin_tone_description || azureData?.skinToneDescription || 'Light to Medium',
    abcde: gpt.abcde,
    lesion_morphology: gpt.lesion_morphology || 'papule',
    location: gpt.detected_body_part || bodyPart,
    differential_diagnoses: gpt.differential_diagnoses || [],
    clinical_notes: gpt.clinical_notes || '',
    urgency: gpt.urgency || diseaseInfo?.urgency || 'Routine',
    class_probabilities: (ml?.class_probabilities as unknown as Record<string, number>) || {},
    azure_quality_score: azureSkinConf,
    needs_doctor_review: needsDoctorReview,
    engines_used: { azure_cv: !!azure, gpt4o: true, ml_model: !!ml },
    body_part: bodyPart,
    body_part_matches: gpt.body_part_matches_selection,
    // Disease DB enrichment
    symptoms: diseaseInfo?.symptoms || [],
    treatments: diseaseInfo?.treatments || [],
    precautions: diseaseInfo?.precautions || [],
    specialists: diseaseInfo?.specialists || [],
    category: diseaseInfo?.category,
    icd10_full: diseaseInfo?.icd10,
    contagious: diseaseInfo?.contagious,
    recurrence_risk: diseaseInfo?.recurrenceRisk,
  }
}

function getSeverityLabel(severity: string) {
  const map: Record<string, string> = {
    Critical: 'Requires immediate medical attention',
    High: 'See a specialist soon',
    Moderate: 'Monitor closely and consult a doctor',
    Low: 'Routine monitoring recommended',
    None: 'No medical concern',
  }
  return map[severity] || 'Consult a dermatologist'
}

function mapSeverityToRisk(severity: string): string {
  const map: Record<string, string> = {
    Critical: 'Very High', High: 'High', Moderate: 'Medium', Low: 'Low', None: 'Low',
  }
  return map[severity] || 'Low'
}

function mapSeverityToStage(severity: string): number {
  const map: Record<string, number> = { Critical: 3, High: 3, Moderate: 2, Low: 1, None: 1 }
  return map[severity] || 1
}
