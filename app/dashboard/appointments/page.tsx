"use client"

import { useState, useEffect, useCallback } from "react"
import { useProfile } from "@/contexts/ProfileContext"
import { toast } from "sonner"
import {
  Calendar, Clock, Video, MapPin, Star,
  Search, ChevronDown, Stethoscope, User, CheckCircle2, AlertCircle,
  RefreshCw, ExternalLink, Loader2, Building2, FileText, Paperclip, X,
  ArrowRight, ArrowLeft, Ban,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ViewMode = "browse" | "book" | "my-appointments"

interface Doctor {
  id: string
  name: string
  specialty: string
  qualifications: string
  experience: number
  hospital: string
  hospitalAddress: string
  city: string
  state: string
  image: string
  rating: number
  totalPatients: number
  consultationFee: number
  availableDays: string[]
  professionalBio: string
  meetingLink: string
  languages: string[]
  isVerified: boolean
  isLive: boolean
}

interface SlotInfo {
  id: string
  date: string
  timeSlot: string
  isBooked: boolean
}

interface Appointment {
  id: string
  doctorName: string
  doctorSpecialty: string
  doctorHospital: string
  doctorImage: string
  appointmentDate: string
  appointmentTime: string
  type: string
  status: string
  reason: string
  meetingLink: string
  fee: number
  notes: string
  createdAt: string
  attachedAnalysisId?: string | null
  attachedAnalysisDiagnosis?: string | null
}

interface AnalysisTicket {
  id: string
  diagnosis: string
  riskLevel: string
  confidence: string
  analysisDate: string
  ticketStatus: string
  assessment: string
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function getNext14Days() {
  const days: { iso: string; label: string; dayName: string }[] = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    days.push({ iso, label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`, dayName: DAY_NAMES[d.getDay()].slice(0,3) })
  }
  return days
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    Scheduled: { cls: "bg-blue-100 text-blue-700 border-blue-200", label: "Scheduled" },
    Confirmed: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Confirmed" },
    Completed: { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Completed" },
    Cancelled: { cls: "bg-red-100 text-red-700 border-red-200", label: "Cancelled" },
  }
  const c = cfg[status] || { cls: "bg-slate-100 text-slate-600 border-slate-200", label: status }
  return <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border", c.cls)}>{c.label}</span>
}

function DoctorCard({ doctor, onBook }: { doctor: Doctor; onBook: (d: Doctor) => void }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden">
            {doctor.image ? (
              <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
            ) : (
              doctor.name.split(" ").map(n => n[0]).join("").slice(0, 2)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{doctor.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{doctor.specialty}</p>
                <p className="text-xs text-slate-400">{doctor.qualifications}</p>
              </div>
              {doctor.isVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex-shrink-0">Verified</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{doctor.hospital}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{doctor.city}</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{doctor.rating.toFixed(1)}</span>
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{doctor.experience} yrs exp</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>
            <p className="text-xs text-slate-400">Consultation Fee</p>
            <p className="font-bold text-slate-900 dark:text-white">₹{doctor.consultationFee}</p>
          </div>
          <div className="flex gap-2">
            {doctor.languages && doctor.languages.length > 0 && (
              <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{doctor.languages.slice(0,2).join(", ")}</span>
            )}
            <Button size="sm" onClick={() => onBook(doctor)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs">
              Book
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BookingPanel({
  doctor,
  patientName,
  patientContact,
  onBack,
  onSuccess,
}: {
  doctor: Doctor
  patientName: string
  patientContact: string
  onBack: () => void
  onSuccess: () => void
}) {
  const days = getNext14Days()
  const [step, setStep] = useState<"slot" | "attach" | "confirm">("slot")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [reason, setReason] = useState("")
  const [consultType, setConsultType] = useState("Video Call")
  const [booking, setBooking] = useState(false)

  // Skin analysis attachment
  const [analyses, setAnalyses] = useState<AnalysisTicket[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisTicket | null>(null)

  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const res = await fetch(`/api/doctors/slots?doctorId=${doctor.id}&date=${date}`)
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [doctor.id])

  const fetchAnalyses = useCallback(async () => {
    setLoadingAnalyses(true)
    try {
      const res = await fetch("/api/patient/skin-tickets")
      const data = await res.json()
      setAnalyses(Array.isArray(data) ? data.slice(0, 10) : [])
    } catch {
      setAnalyses([])
    } finally {
      setLoadingAnalyses(false)
    }
  }, [])

  const handleDateSelect = (iso: string) => {
    setSelectedDate(iso)
    fetchSlots(iso)
  }

  const handleNextToAttach = () => {
    if (!selectedSlot) { return }
    fetchAnalyses()
    setStep("attach")
  }

  const handleNextToConfirm = () => {
    setStep("confirm")
  }

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot) return
    setBooking(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorClerkId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          appointmentDate: selectedDate,
          appointmentTime: selectedSlot.timeSlot,
          type: consultType,
          reason,
          slotId: selectedSlot.id,
          fee: doctor.consultationFee,
          attachedAnalysisId: selectedAnalysis?.id || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Appointment booked! The doctor has been notified by email.", { duration: 6000 })
        onSuccess()
      } else {
        toast.error(data.error || "Booking failed — please try again")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setBooking(false)
    }
  }

  const riskColor = (risk: string) => {
    if (risk?.includes("Very High") || risk?.includes("High")) return "text-red-600 bg-red-50 border-red-200"
    if (risk?.includes("Medium")) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-emerald-600 bg-emerald-50 border-emerald-200"
  }

  // Stepper header
  const steps = [
    { key: "slot", label: "Select Slot" },
    { key: "attach", label: "Attach Report" },
    { key: "confirm", label: "Confirm" },
  ]

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={step === "slot" ? onBack : () => setStep(step === "confirm" ? "attach" : "slot")}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Book with {doctor.name}</h2>
          <p className="text-xs text-slate-500">{doctor.specialty} · {doctor.hospital}</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-2 transition-all",
              step === s.key ? "bg-blue-600 border-blue-600 text-white" :
              steps.findIndex(x => x.key === step) > i ? "bg-emerald-500 border-emerald-500 text-white" :
              "bg-white border-slate-300 text-slate-400"
            )}>
              {steps.findIndex(x => x.key === step) > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn("text-[10px] font-semibold ml-1 hidden sm:block", step === s.key ? "text-blue-600" : "text-slate-400")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={cn("flex-1 h-px mx-2", steps.findIndex(x => x.key === step) > i ? "bg-emerald-400" : "bg-slate-200")} />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Slot Selection ─────────────────────────────── */}
      {step === "slot" && (
        <div className="space-y-4">
          {/* Doctor card */}
          <Card className="border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
            <CardContent className="p-4 flex gap-3 items-start">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                {doctor.image ? <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" /> : doctor.name.split(" ").map(n => n[0]).join("").slice(0,2)}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{doctor.name}</p>
                <p className="text-xs text-slate-500">{doctor.specialty} · {doctor.experience} yrs exp</p>
                <p className="text-xs text-slate-400">{doctor.hospital}, {doctor.city}</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mt-1">₹{doctor.consultationFee} consultation fee</p>
              </div>
            </CardContent>
          </Card>

          {/* Consultation type */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Type</p>
            <div className="flex gap-2">
              {["Video Call", "In-Person"].map(t => (
                <button key={t} onClick={() => setConsultType(t)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all",
                    consultType === t ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600"
                  )}>
                  {t === "Video Call" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date selection */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Date</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map(d => {
                const dayName = DAY_NAMES[new Date(d.iso).getDay()]
                const isAvailable = !doctor.availableDays || doctor.availableDays.length === 0 || doctor.availableDays.some(ad => ad.toLowerCase().includes(dayName.toLowerCase().slice(0,3)))
                return (
                  <button key={d.iso} onClick={() => isAvailable && handleDateSelect(d.iso)} disabled={!isAvailable}
                    className={cn("flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl text-xs font-semibold border transition-all flex-shrink-0",
                      selectedDate === d.iso ? "bg-blue-600 text-white border-blue-600" :
                      isAvailable ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-blue-300" :
                      "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 cursor-not-allowed"
                    )}>
                    <span className="text-[10px] font-medium">{d.dayName}</span>
                    <span className="text-sm font-bold mt-0.5">{d.label.split(" ")[0]}</span>
                    <span className="text-[9px]">{d.label.split(" ")[1]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Time Slots</p>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : slots.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold">No slots available for this date.</p>
                  <p className="text-xs text-amber-600 mt-0.5">The doctor hasn't opened slots for this day yet. Try selecting a different date.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <button key={s.id} disabled={s.isBooked} onClick={() => !s.isBooked && setSelectedSlot(s)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        s.isBooked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through" :
                        selectedSlot?.id === s.id ? "bg-blue-600 text-white border-blue-600" :
                        "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 hover:border-blue-300"
                      )}>
                      {s.timeSlot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for Visit</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe your concern or skin condition..."
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <Button onClick={handleNextToAttach} disabled={!selectedSlot} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 gap-2">
            Next: Attach Report <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ─── STEP 2: Attach Skin Analysis ──────────────────────── */}
      {step === "attach" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-2 mb-1">
              <Paperclip className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Attach a Skin Analysis Report (Optional)</p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Sharing your previous skin analysis helps the doctor understand your condition better before the consultation.
              You can skip this step if you don't have any reports.
            </p>
          </div>

          {loadingAnalyses ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your analyses...
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No skin analyses found</p>
              <p className="text-xs text-slate-400 mt-1">Run a skin analysis first to attach it to your appointment</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Scan History</p>
              {analyses.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAnalysis(selectedAnalysis?.id === a.id ? null : a)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all",
                    selectedAnalysis?.id === a.id
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", selectedAnalysis?.id === a.id ? "bg-blue-100" : "bg-slate-100 dark:bg-slate-800")}>
                        <FileText className={cn("h-4 w-4", selectedAnalysis?.id === a.id ? "text-blue-600" : "text-slate-500")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.diagnosis}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(a.analysisDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", riskColor(a.riskLevel))}>
                        {a.riskLevel}
                      </span>
                      {a.confidence && <span className="text-[10px] text-slate-400">{a.confidence}</span>}
                    </div>
                  </div>
                  {selectedAnalysis?.id === a.id && a.assessment && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 line-clamp-2 border-t border-blue-100 pt-2">{a.assessment}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedAnalysis && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">Attached: {selectedAnalysis.diagnosis}</p>
                <p className="text-[10px] text-emerald-600">This report will be shared with the doctor before your consultation</p>
              </div>
              <button onClick={() => setSelectedAnalysis(null)} className="p-1 hover:bg-emerald-100 rounded flex-shrink-0">
                <X className="h-3 w-3 text-emerald-600" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("slot")} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={handleNextToConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2">
              {selectedAnalysis ? "Next: Confirm Booking" : "Skip & Confirm"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Confirmation ──────────────────────────────── */}
      {step === "confirm" && (
        <div className="space-y-4">
          <Card className="border border-emerald-200 dark:border-emerald-900">
            <CardContent className="p-5 space-y-4">
              <p className="font-bold text-slate-900 dark:text-white">Review Your Booking</p>

              {/* Doctor section */}
              <div className="flex gap-3 items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {doctor.image ? <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" /> : doctor.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <p className="font-bold text-sm">{doctor.name}</p>
                  <p className="text-xs text-slate-500">{doctor.specialty}</p>
                  <p className="text-xs text-slate-400">{doctor.hospital}</p>
                </div>
              </div>

              {/* Appointment details grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Patient", value: patientName || "You" },
                  { label: "Date", value: selectedDate },
                  { label: "Time", value: selectedSlot?.timeSlot || "" },
                  { label: "Type", value: consultType },
                  { label: "Consultation Fee", value: `₹${doctor.consultationFee}` },
                  { label: "Status", value: "Awaiting Doctor Confirmation" },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider">{f.label}</p>
                    <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {reason && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{reason}</p>
                </div>
              )}

              {/* Attached analysis */}
              {selectedAnalysis ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <Paperclip className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Attached Skin Analysis</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400">{selectedAnalysis.diagnosis} · {selectedAnalysis.riskLevel} Risk</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">No skin analysis attached</p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                By confirming, you agree to the consultation terms. The doctor will be notified and will confirm the appointment.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("attach")} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={handleBook} disabled={booking} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2">
              {booking ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</> : <><CheckCircle2 className="h-4 w-4" /> Confirm Appointment</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatientAppointmentsPage() {
  const { profile } = useProfile()
  const [view, setView] = useState<ViewMode>("my-appointments")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [search, setSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments")
      const data = await res.json()
      setAppointments(Array.isArray(data) ? data : [])
    } catch {
      setAppointments([])
    } finally {
      setLoadingAppts(false)
      setIsRefreshing(false)
    }
  }, [])

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true)
    try {
      const res = await fetch("/api/doctors")
      const data = await res.json()
      setDoctors(Array.isArray(data) ? data : [])
    } catch {
      setDoctors([])
    } finally {
      setLoadingDoctors(false)
    }
  }, [])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  useEffect(() => {
    if (view === "browse") loadDoctors()
  }, [view, loadDoctors])

  const filteredDoctors = doctors.filter(d =>
    !search || [d.name, d.specialty, d.hospital, d.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleBookSuccess = () => {
    setSelectedDoctor(null)
    setView("my-appointments")
    loadAppointments()
  }

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment? This action cannot be undone.")) return
    
    setCancellingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success("Appointment cancelled successfully. The doctor has been notified.")
        loadAppointments()
      } else {
        toast.error(data.error || "Failed to cancel appointment")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setCancellingId(null)
    }
  }

  const canCancel = (dateStr: string, timeStr: string, status: string) => {
    if (status !== "Scheduled" && status !== "Confirmed") return false
    
    const [datePart] = dateStr.split('T')
    const dateObj = new Date(datePart)
    
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const ampm = match[3].toUpperCase()
      if (ampm === 'PM' && hours < 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
      dateObj.setHours(hours, minutes, 0, 0)
    }

    const hoursDifference = (dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60)
    return hoursDifference >= 24
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Browse available dermatologists and manage your bookings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "my-appointments" ? "default" : "outline"}
            size="sm"
            onClick={() => { setView("my-appointments"); setSelectedDoctor(null) }}
            className={cn(view === "my-appointments" && "bg-blue-600 hover:bg-blue-700 hover:text-white")}
          >
            My Appointments
          </Button>
          <Button
            variant={view === "browse" ? "default" : "outline"}
            size="sm"
            onClick={() => { setView("browse"); setSelectedDoctor(null) }}
            className={cn(view === "browse" && "bg-blue-600 hover:bg-blue-700 hover:text-white")}
          >
            Find Doctors
          </Button>
        </div>
      </div>

      {/* Book flow */}
      {selectedDoctor ? (
        <BookingPanel
          doctor={selectedDoctor}
          patientName={profile?.fullName || ""}
          patientContact={profile?.contactNumber || ""}
          onBack={() => setSelectedDoctor(null)}
          onSuccess={handleBookSuccess}
        />
      ) : view === "browse" ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by name, specialty, hospital or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>

          {loadingDoctors ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Stethoscope className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">No doctors found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search or check back later</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDoctors.map(d => (
                <DoctorCard key={d.id} doctor={d} onBook={(doc) => setSelectedDoctor(doc)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Appointments */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsRefreshing(true); loadAppointments() }}
              disabled={isRefreshing}
              className="gap-1.5 text-slate-500 hover:text-blue-600"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Refresh
            </Button>
          </div>

          {loadingAppts ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Calendar className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">No appointments yet</p>
              <p className="text-xs text-slate-400 mt-1">Browse available doctors to book your first consultation</p>
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setView("browse")}>
                Find a Doctor
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map(appt => (
                <Card key={appt.id} className="border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                          {appt.doctorImage
                            ? <img src={appt.doctorImage} alt={appt.doctorName} className="w-full h-full object-cover" />
                            : appt.doctorName.split(" ").map(n => n[0]).join("").slice(0, 2)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{appt.doctorName}</p>
                          <p className="text-xs text-slate-500">{appt.doctorSpecialty}{appt.doctorHospital ? ` · ${appt.doctorHospital}` : ""}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{appt.appointmentDate}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.appointmentTime}</span>
                            <span className="flex items-center gap-1">
                              {appt.type === "Video Call" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {appt.type}
                            </span>
                          </div>
                          {appt.reason && <p className="text-xs text-slate-400 mt-1 truncate">Reason: {appt.reason}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <StatusBadge status={appt.status} />
                        {appt.fee > 0 && <span className="text-xs font-semibold text-slate-500">₹{appt.fee}</span>}
                      </div>
                    </div>

                    {appt.attachedAnalysisDiagnosis && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>Attached: {appt.attachedAnalysisDiagnosis}</span>
                        </div>
                      </div>
                    )}

                    {appt.status === "Confirmed" && appt.meetingLink && appt.type === "Video Call" && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <a
                          href={appt.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" /> Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {canCancel(appt.appointmentDate, appt.appointmentTime, appt.status) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCancelAppointment(appt.id)}
                          disabled={cancellingId === appt.id}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          {cancellingId === appt.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Ban className="h-3 w-3 mr-1.5" />}
                          Cancel / Reschedule
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
