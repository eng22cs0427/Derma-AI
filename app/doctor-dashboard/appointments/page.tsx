"use client"

import { useState, useEffect } from "react"

import { Calendar, Clock, Video, MapPin, Stethoscope } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DUMMY_APPOINTMENTS, DUMMY_PATIENTS, DUMMY_ANALYSES } from "@/lib/doctor-dummy-data"
import { cn } from "@/lib/utils"

const avatarColors = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
]

function getRiskColor(risk: string) {
  if (risk === "Very High") return "bg-red-100 text-red-700 border-red-200"
  if (risk === "High") return "bg-orange-100 text-orange-700 border-orange-200"
  if (risk === "Medium") return "bg-yellow-100 text-yellow-700 border-yellow-200"
  return "bg-emerald-100 text-emerald-700 border-emerald-200"
}

export default function DoctorAppointmentsPage() {
  const now = new Date()
  const currentHour = now.getHours()

  const [realAppointments, setRealAppointments] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/doctor/appointments')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
           // Restructure DB response to fit UI template shape
           const mappedReal = data.map(dbA => ({
             id: 'real_' + dbA.id,
             patient_id: dbA.patient_id,
             patient_name: dbA.patient_name || 'Patient',
             time: dbA.appointment_time || '10:00 AM',
             type: 'Video Call', // default for real bookings currently
             risk: 'Medium',     // default unless hooked to specific analysis
             condition: dbA.specialty || 'General Consultation',
             confidence: 'N/A',
             patient: {
                email: dbA.patient_email,
                contact_number: dbA.patient_contact,
                city: dbA.patient_city
             },
             is_real: true
           }))
           setRealAppointments(mappedReal)
        }
      }).catch(e => console.error(e))
  }, [])

  // Link any dummy appt to the dummy data maps
  const dummyEnriched = DUMMY_APPOINTMENTS.map((appt) => {
    const patient = DUMMY_PATIENTS.find((p) => p.id === appt.patient_id)
    const analysis = DUMMY_ANALYSES.find((a) => a.id === appt.analysis_ref)
    const details = (analysis?.details as Record<string, unknown>) ?? {}
    const confidence = (details.Confidence as string) ?? "N/A"
    return { ...appt, patient, analysis, confidence, is_real: false }
  })

  // Mix Real + Dummy and sort 
  const allAppointments = [...realAppointments, ...dummyEnriched]
  
  const enriched = allAppointments.map((a, idx) => ({
      ...a, colorIdx: idx % avatarColors.length,
      avatar: (a.patient_name || a.patient?.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  }))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> Today's Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 w-fit">
          <Clock className="h-3.5 w-3.5" /> Add Slot
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Today", value: enriched.length, color: "text-slate-900 dark:text-white" },
          { label: "Video Calls", value: enriched.filter((a) => a.type === "Video Call").length, color: "text-blue-600" },
          { label: "In-Person", value: enriched.filter((a) => a.type === "In-Person").length, color: "text-emerald-600" },
          { label: "High Risk", value: enriched.filter((a) => a.risk === "Very High" || a.risk === "High").length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 text-center">
              <p className={cn("text-3xl font-black", color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Appointment Timeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">Patient details and linked AI diagnoses — all from the same records</p>
        </div>
        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
          {enriched.map((appt, idx) => {
            const apptHourNum = parseInt(appt.time.split(":")[0])
            const isPM = appt.time.includes("PM")
            const apptHour = apptHourNum === 12 ? 12 : isPM ? apptHourNum + 12 : apptHourNum
            const isPast = apptHour < currentHour
            const isCurrent = apptHour === currentHour

            return (
              <div key={appt.id} className={cn("flex items-start gap-4 px-4 sm:px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", isPast && "opacity-50", isCurrent && "bg-blue-50/50 dark:bg-blue-950/20")}>
                {/* Time */}
                <div className="w-24 text-right flex-shrink-0 pt-1">
                  <p className={cn("text-sm font-black tabular-nums", isCurrent ? "text-blue-600" : "text-slate-700 dark:text-slate-300")}>{appt.time}</p>
                  {isCurrent && <p className="text-[10px] text-blue-500 font-semibold">NOW</p>}
                </div>

                {/* Dot */}
                <div className="flex flex-col items-center pt-2 flex-shrink-0">
                  <div className={cn("w-3 h-3 rounded-full border-2", isCurrent ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-200" : isPast ? "bg-slate-300 border-slate-200" : "bg-white border-blue-400")} />
                </div>

                {/* Avatar */}
                <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm", avatarColors[appt.colorIdx])}>
                  {appt.avatar}
                </div>

                {/* Card body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{appt.patient_name || appt.patient?.name}</p>
                        {appt.is_real && (
                           <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold ml-1">LIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", getRiskColor(appt.risk))}>{appt.risk} Risk</span>
                      <span className={cn("text-[11px] font-medium flex items-center gap-1", appt.type === "Video Call" ? "text-blue-600" : "text-emerald-600")}>
                        {appt.type === "Video Call" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {appt.type}
                      </span>
                    </div>
                  </div>

                  {/* Linked analysis summary */}
                  <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Linked AI Analysis</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{appt.condition}</p>
                    <p className="text-xs text-slate-500 mt-0.5">AI Confidence: <span className="font-semibold text-slate-700 dark:text-slate-300">{appt.confidence}</span></p>
                    {appt.patient?.city && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{appt.patient.city}</p>
                    )}
                    {appt.patient?.contact_number && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">📞 {appt.patient.contact_number}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
        <Stethoscope className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">All Data Synchronized</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            Each appointment above is linked to the same patient record and AI analysis shown in the <strong>Patients</strong> and <strong>AI Analyses</strong> tabs. All data is cross-referenced from the same source.
          </p>
        </div>
      </div>
    </div>
  )
}
