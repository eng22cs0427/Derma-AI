/**
 * DermaAI — Doctor Portal Dummy Data (Showcase / Demo)
 * All pages in the doctor dashboard use this file as the single source of truth.
 * 4 patients · 5 analyses · 4 appointments — fully cross-referenced.
 */

// ──────────────────────────────────────────────────
// PATIENTS  (id used as foreign key in analyses & appts)
// ──────────────────────────────────────────────────
export const DUMMY_PATIENTS = [
  {
    id: "p-001",
    full_name: "Priya Ramesh Sharma",
    email: "priya.sharma@gmail.com",
    gender: "Female",
    date_of_birth: "1990-07-14",
    contact_number: "+91 98456 78901",
    city: "Mumbai",
    created_at: "2024-11-10T08:30:00Z",
    total_analyses: 2,
    total_appointments: 1,
  },
  {
    id: "p-002",
    full_name: "Arjun Suresh Nair",
    email: "arjun.nair@hotmail.com",
    gender: "Male",
    date_of_birth: "1985-03-22",
    contact_number: "+91 77821 34567",
    city: "Bangalore",
    created_at: "2025-01-05T10:15:00Z",
    total_analyses: 1,
    total_appointments: 1,
  },
  {
    id: "p-003",
    full_name: "Deepika Venkat Rao",
    email: "deepika.rao@yahoo.in",
    gender: "Female",
    date_of_birth: "1998-12-03",
    contact_number: "+91 90012 56789",
    city: "Hyderabad",
    created_at: "2025-02-18T14:00:00Z",
    total_analyses: 1,
    total_appointments: 1,
  },
  {
    id: "p-004",
    full_name: "Karan Mehta",
    email: "karan.mehta@gmail.com",
    gender: "Male",
    date_of_birth: "1979-06-30",
    contact_number: "+91 88234 67890",
    city: "Delhi",
    created_at: "2025-03-01T09:00:00Z",
    total_analyses: 1,
    total_appointments: 1,
  },
]

// ──────────────────────────────────────────────────
// ANALYSES  (patient_id links back to DUMMY_PATIENTS)
// ──────────────────────────────────────────────────
export const DUMMY_ANALYSES = [
  {
    id: "a-001",
    patient_id: "p-001",
    patient_name: "Priya Ramesh Sharma",
    patient_email: "priya.sharma@gmail.com",
    gender: "Female",
    date_of_birth: "1990-07-14",
    contact_number: "+91 98456 78901",
    data: "Skin Analysis — Melanoma Detected",
    date: "2026-03-20T09:45:00Z",
    details: {
      Patient_Name: "Priya Ramesh Sharma",
      Patient_Age: "35 years",
      Diagnosis: "Melanoma (mel)",
      Confidence: "91.40%",
      Risk_Level: "Very High",
      Assessment: "Melanoma (serious skin cancer) — develops from melanocytes and can spread rapidly if not detected early.",
      Recommendation: "Immediate medical consultation required. Refer to oncological dermatologist without delay.",
      analysis_time: "09:45 AM (IST)",
      source: "DermaSense AI Engine",
    },
  },
  {
    id: "a-002",
    patient_id: "p-001",
    patient_name: "Priya Ramesh Sharma",
    patient_email: "priya.sharma@gmail.com",
    gender: "Female",
    date_of_birth: "1990-07-14",
    contact_number: "+91 98456 78901",
    data: "Skin Analysis — Melanocytic Nevus Detected",
    date: "2025-11-12T14:20:00Z",
    details: {
      Patient_Name: "Priya Ramesh Sharma",
      Patient_Age: "35 years",
      Diagnosis: "Melanocytic Nevus (nv)",
      Confidence: "78.60%",
      Risk_Level: "Medium",
      Assessment: "Melanocytic nevus (mole) — benign pigment-producing cell lesion. Monitor for changes in size or colour.",
      Recommendation: "Regular monitoring recommended. Consult dermatologist if mole changes shape or colour.",
      analysis_time: "02:20 PM (IST)",
      source: "DermaSense AI Engine",
    },
  },
  {
    id: "a-003",
    patient_id: "p-002",
    patient_name: "Arjun Suresh Nair",
    patient_email: "arjun.nair@hotmail.com",
    gender: "Male",
    date_of_birth: "1985-03-22",
    contact_number: "+91 77821 34567",
    data: "Skin Analysis — Basal Cell Carcinoma Detected",
    date: "2026-03-22T11:10:00Z",
    details: {
      Patient_Name: "Arjun Suresh Nair",
      Patient_Age: "41 years",
      Diagnosis: "Basal Cell Carcinoma (bcc)",
      Confidence: "87.20%",
      Risk_Level: "High",
      Assessment: "Basal cell carcinoma — most common type of skin cancer, caused by UV exposure. Grows slowly, rarely spreads.",
      Recommendation: "Seek evaluation for potential treatment. Cryotherapy or Mohs surgery recommended based on size.",
      analysis_time: "11:10 AM (IST)",
      source: "DermaSense AI Engine",
    },
  },
  {
    id: "a-004",
    patient_id: "p-003",
    patient_name: "Deepika Venkat Rao",
    patient_email: "deepika.rao@yahoo.in",
    gender: "Female",
    date_of_birth: "1998-12-03",
    contact_number: "+91 90012 56789",
    data: "Skin Analysis — Benign Keratosis Detected",
    date: "2026-03-15T16:30:00Z",
    details: {
      Patient_Name: "Deepika Venkat Rao",
      Patient_Age: "27 years",
      Diagnosis: "Benign Keratosis (bkl)",
      Confidence: "83.50%",
      Risk_Level: "Low",
      Assessment: "Benign keratosis — non-cancerous skin growth (seborrheic keratoses). Generally harmless.",
      Recommendation: "No immediate treatment required. Monitor for any changes and consult a dermatologist periodically.",
      analysis_time: "04:30 PM (IST)",
      source: "DermaSense AI Engine",
    },
  },
  {
    id: "a-005",
    patient_id: "p-004",
    patient_name: "Karan Mehta",
    patient_email: "karan.mehta@gmail.com",
    gender: "Male",
    date_of_birth: "1979-06-30",
    contact_number: "+91 88234 67890",
    data: "Skin Analysis — Actinic Keratoses Detected",
    date: "2026-03-25T10:00:00Z",
    details: {
      Patient_Name: "Karan Mehta",
      Patient_Age: "46 years",
      Diagnosis: "Actinic Keratoses (akiec)",
      Confidence: "89.10%",
      Risk_Level: "High",
      Assessment: "Actinic keratoses — precancerous patches caused by long-term sun exposure. May develop into squamous cell carcinoma.",
      Recommendation: "Consult a dermatologist for cryotherapy or topical treatment to address precancerous lesions early.",
      analysis_time: "10:00 AM (IST)",
      source: "DermaSense AI Engine",
    },
  },
]

// ──────────────────────────────────────────────────
// APPOINTMENTS  (patient_id links back to DUMMY_PATIENTS)
// ──────────────────────────────────────────────────
export const DUMMY_APPOINTMENTS = [
  {
    id: "appt-001",
    patient_id: "p-001",
    patient_name: "Priya Ramesh Sharma",
    time: "09:30 AM",
    condition: "Melanoma Follow-up",
    risk: "Very High",
    type: "In-Person",
    avatar: "PR",
    analysis_ref: "a-001",
  },
  {
    id: "appt-002",
    patient_id: "p-002",
    patient_name: "Arjun Suresh Nair",
    time: "11:00 AM",
    condition: "Basal Cell Carcinoma Review",
    risk: "High",
    type: "Video Call",
    avatar: "AN",
    analysis_ref: "a-003",
  },
  {
    id: "appt-003",
    patient_id: "p-003",
    patient_name: "Deepika Venkat Rao",
    time: "02:00 PM",
    condition: "Benign Keratosis Check-up",
    risk: "Low",
    type: "In-Person",
    avatar: "DV",
    analysis_ref: "a-004",
  },
  {
    id: "appt-004",
    patient_id: "p-004",
    patient_name: "Karan Mehta",
    time: "04:00 PM",
    condition: "Actinic Keratoses Treatment Plan",
    risk: "High",
    type: "Video Call",
    avatar: "KM",
    analysis_ref: "a-005",
  },
]

// ──────────────────────────────────────────────────
// COMPUTED STATS  (derived from above, single source of truth)
// ──────────────────────────────────────────────────
export const DUMMY_STATS = {
  totalPatients: DUMMY_PATIENTS.length,                                                              // 4
  totalAnalyses: DUMMY_ANALYSES.length,                                                              // 5
  highRiskCases: DUMMY_ANALYSES.filter(a => (a.details.Risk_Level as string).includes("High")).length, // 3
  recentAnalyses: DUMMY_ANALYSES.filter(a => new Date(a.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, // dynamic
}
