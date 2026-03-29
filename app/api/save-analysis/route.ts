import { type NextRequest, NextResponse } from "next/server"
import { currentUser } from '@clerk/nextjs/server'
import { query } from '@/lib/aws-database'
import { uploadAnalysisImage } from "@/lib/aws-s3"

// ─── Disease / Risk lookup tables ────────────────────────────────────────────
const DISEASE_INFO: Record<string, string> = {
  akiec: "Actinic keratoses (precancerous patches)",
  bcc:   "Basal cell carcinoma (common skin cancer)",
  bkl:   "Benign keratosis (non-cancerous growth)",
  df:    "Dermatofibroma (benign nodule)",
  mel:   "Melanoma (serious skin cancer)",
  nv:    "Melanocytic nevus (mole)",
  vasc:  "Vascular lesion (blood vessel abnormality)",
  carcinoma: "Carcinoma (malignant epithelial tumor)",
  "Basal Cell Carcinoma": "Common skin cancer, usually curable",
  "Melanoma": "Serious type of skin cancer",
  "Squamous Cell Carcinoma": "Common form of skin cancer",
  "Actinic Keratosis": "Precancerous skin patch"
}

const RISK_LEVEL: Record<string, { risk: string; action: string }> = {
  akiec:     { risk: "High",      action: "Consult a dermatologist for further evaluation and treatment options." },
  bcc:       { risk: "High",      action: "Immediate medical consultation required for biopsy and treatment." },
  bkl:       { risk: "Low",       action: "Generally benign, but monitor for changes. Consult a dermatologist if concerned." },
  df:        { risk: "Low",       action: "Benign, usually no treatment needed. Consult if it grows or causes discomfort." },
  mel:       { risk: "Very High", action: "Urgent medical consultation required — high malignancy risk." },
  nv:        { risk: "Low",       action: "Common mole. Monitor for ABCDEs. Consult if any changes occur." },
  vasc:      { risk: "Low",       action: "Usually benign. Consult a dermatologist for diagnosis if desired." },
  carcinoma: { risk: "Very High", action: "Immediate medical consultation required — biopsy and treatment needed." },
  default:   { risk: "Medium",    action: "Please consult a specialist." }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const predictionRaw = formData.get("prediction") as string
    
    if (!file || !predictionRaw) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const data = JSON.parse(predictionRaw)
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // ── Execute Save Process (same logic as before)
    const savedInfo = await saveAnalysisToAWS(user, fileBuffer, file.type, file.name, data)

    if (!savedInfo) {
      return NextResponse.json({ error: "Database save failed completely — Timeout or internal error." }, { status: 500 })
    }

    return NextResponse.json({ success: true, savedData: savedInfo }, { status: 200 })

  } catch (error) {
    console.error("[save-analysis] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── Perform persist analysis to RDS + S3 ───────────────────────────────────
async function saveAnalysisToAWS(user: any, fileBuffer: Buffer, mimeType: string, fileName: string, data: any) {
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
  
  try {
    let profileRes = await query(
      `SELECT id, full_name, date_of_birth FROM profiles WHERE cognito_user_id = $1 OR email = $2 LIMIT 1`,
      [user.id, primaryEmail]
    )

    if (profileRes.rows.length === 0) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || primaryEmail.split('@')[0]
      profileRes = await query(
        `INSERT INTO profiles (cognito_user_id, email, full_name, role, is_active, is_onboarded)
         VALUES ($1, $2, $3, 'patient', true, false)
         ON CONFLICT (cognito_user_id) DO UPDATE SET email = $2
         RETURNING id, full_name, date_of_birth`,
        [user.id, primaryEmail, fullName]
      )
    }

    const profile = profileRes.rows[0]
    const dbProfileId = profile.id
    
    // Step 3: S3 Upload
    let imageUrl = ''
    let imageKey = ''
    try {
      const s3Result = await uploadAnalysisImage(dbProfileId, fileBuffer, mimeType)
      imageUrl = s3Result.url
      imageKey = s3Result.key
    } catch (s3Err) {
      console.error("[save-analysis] S3 fallback triggered");
    }

    // Prepare specifics
    const predictionKey = (data.prediction || '').toLowerCase()
    
    // Find the correct risk logic fallback cleanly, handling both short acronyms and full names (like "Carcinoma")
    let activeKey = Object.keys(RISK_LEVEL).find(k => k.toLowerCase() === predictionKey || predictionKey.includes(k.toLowerCase()));
    
    const riskData = RISK_LEVEL[activeKey || 'default'] || RISK_LEVEL['default']
    const assessment = Object.keys(DISEASE_INFO).find(k => k.toLowerCase() === predictionKey || predictionKey.includes(k.toLowerCase())) 
        ? DISEASE_INFO[activeKey || 'default'] 
        : 'Detailed assessment required'

    // Step 4: Medical History Insert
    const detailsObj = {
      Patient_Name: profile.full_name || 'Patient',
      Diagnosis: data.prediction,
      Confidence: `${(data.confidence * 100).toFixed(2)}%`,
      Risk_Level: riskData.risk,
      Assessment: assessment,
      Recommendation: riskData.action,
      imageUrl: imageUrl,
      analysis_time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' (IST)'
    };

    const newHistory = await query(
      `INSERT INTO medical_history (user_id, type, data, details)
       VALUES ($1, 'Analysis', $2, $3) RETURNING id`,
      [dbProfileId, `Skin Analysis — ${data.prediction} Detected`, JSON.stringify(detailsObj)]
    )

    // Log technically
    await query(
      `INSERT INTO skin_analyses (user_id, image_url, image_key, prediction_class, confidence_score, risk_level, all_predictions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [dbProfileId, imageUrl, imageKey, data.prediction, data.confidence * 100, riskData.risk, JSON.stringify(data.class_probabilities ?? {})]
    ).catch(() => {});

    return { ...detailsObj, id: newHistory.rows[0].id };

  } catch (err) {
    console.error(`[saveAnalysisToAWS] Critical database error (timeout/unreachable):`, err)
    return null;
  }
}
