"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users, Search, Calendar, Phone, MapPin, Microscope,
  AlertTriangle, CheckCircle2, ChevronDown, User, X,
  Clock, Activity, ShieldAlert, RefreshCw, ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DUMMY_PATIENTS, DUMMY_ANALYSES } from "@/lib/doctor-dummy-data"

// ── Types ──────────────────────────────────────────────────────────────────────
type Patient = {
  id: string
  full_name: string
  email: string
  gender: string
  date_of_birth: string
  contact_number: string
  city: string
  created_at: string
  total_analyses: number | string
  total_appointments: number | string
  latest_risk_level?: string
  latest_analysis?: string
  latest_analysis_date?: string
  is_real?: boolean // true = from DB, false = demo
}

type Analysis = {
  id: string
  data: string
  details: Record<string, unknown>
  date: string
  patient_name: string
  patient_email: string
  date_of_birth: string
  gender: string
  contact_number: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calculateAge(dob: string) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() - birth.getMonth() < 0 ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

function getRiskConfig(risk: string) {
  if (!risk) return { label: "No Scans", className: "bg-slate-100 text-slate-500 border-slate-200", Icon: null }
  if (risk.includes("Very High")) return { label: "Very High Risk", className: "bg-red-50 text-red-700 border-red-200", Icon: ShieldAlert }
  if (risk.includes("High")) return { label: "High Risk", className: "bg-orange-50 text-orange-700 border-orange-200", Icon: AlertTriangle }
  if (risk.includes("Medium")) return { label: "Medium Risk", className: "bg-yellow-50 text-yellow-700 border-yellow-200", Icon: null }
  return { label: "Low Risk", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 }
}

function getRiskBarWidth(risk: string) {
  if (risk?.includes("Very High")) return "w-full bg-red-500"
  if (risk?.includes("High")) return "w-3/4 bg-orange-500"
  if (risk?.includes("Medium")) return "w-1/2 bg-yellow-500"
  return "w-1/4 bg-emerald-500"
}

const avatarColors = ["from-blue-500 to-indigo-600", "from-purple-500 to-violet-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"]

function InitialsAvatar({ name, size = "lg" }: { name?: string; size?: "sm" | "md" | "lg" }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const idx = (name || "").charCodeAt(0) % avatarColors.length
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-sm" }
  return (
    <div className={cn("rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm", avatarColors[idx], sizes[size])}>
      {initials}
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Patient Analyses Modal ─────────────────────────────────────────────────────
function PatientAnalysesModal({
  patient,
  onClose,
}: {
  patient: Patient
  onClose: () => void
}) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patient.is_real) {
      // Use dummy data
      const dummyAnalyses = DUMMY_ANALYSES.filter(a => a.patient_id === patient.id)
      setAnalyses(dummyAnalyses as unknown as Analysis[])
      setLoading(false)
      return
    }
    // Fetch from DB
    fetch(`/api/doctor/analyses?patientId=${patient.id}`)
      .then(r => r.json())
      .then(d => setAnalyses(Array.isArray(d) ? d : []))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false))
  }, [patient])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={patient.full_name} size="md" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{patient.full_name}</p>
              <p className="text-xs text-slate-500">{patient.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Microscope className="h-4 w-4 text-blue-600" />
            AI Analysis Records ({analyses.length})
          </h3>
        </div>

        {/* Analyses List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Activity className="h-7 w-7 animate-spin text-blue-500" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Microscope className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-slate-500 font-semibold">No analyses found</p>
              <p className="text-xs text-slate-400 mt-1">This patient has not run any skin scans yet.</p>
            </div>
          ) : (
            analyses.map(a => {
              const d = typeof a.details === "string" ? JSON.parse(a.details) : a.details
              const risk = (d?.Risk_Level as string) || "Low"
              const diag = (d?.Diagnosis as string) || a.data
              const confidence = (d?.Confidence as string) || "N/A"
              const assessment = (d?.Assessment as string) || ""
              const recommendation = (d?.Recommendation as string) || ""
              const riskConf = getRiskConfig(risk)
              const isHigh = risk.includes("High")

              return (
                <div key={a.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{diag}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={cn("flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border", riskConf.className)}>
                        {riskConf.Icon && <riskConf.Icon className="h-3 w-3" />}
                        {riskConf.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{confidence}</span>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2">
                    <div className={cn("h-full rounded-full", getRiskBarWidth(risk))} />
                  </div>

                  {assessment && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-2 mt-2">
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Assessment: </span>{assessment}
                    </p>
                  )}
                  {recommendation && (
                    <p className={cn("text-xs rounded-lg px-3 py-2 mt-2", isHigh
                      ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
                      : "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900")
                    }>
                      <span className="font-semibold">Recommendation: </span>{recommendation}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function enrichDummyPatients(patients: typeof DUMMY_PATIENTS): Patient[] {
  return patients.map(p => {
    const analyses = DUMMY_ANALYSES.filter(a => a.patient_id === p.id)
    const latest = analyses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    return {
      ...p,
      is_real: false,
      latest_analysis: latest?.data ?? undefined,
      latest_analysis_date: latest?.date ?? undefined,
      latest_risk_level: (latest?.details?.Risk_Level as string) ?? undefined,
    }
  })
}

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/patients")
      const dbData = await res.json()
      const realPatients: Patient[] = Array.isArray(dbData)
        ? dbData.map(p => ({ ...p, is_real: true }))
        : []

      // Merge: real patients first, then dummy (deduped by email)
      const realEmails = new Set(realPatients.map(p => p.email?.toLowerCase()))
      const dummyPatients = enrichDummyPatients(DUMMY_PATIENTS)
        .filter(p => !realEmails.has(p.email?.toLowerCase()))

      setPatients([...realPatients, ...dummyPatients])
    } catch {
      setPatients(enrichDummyPatients(DUMMY_PATIENTS))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { loadPatients() }, [loadPatients])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadPatients()
  }

  const filtered = patients.filter(p => {
    const matchesSearch = [p.full_name, p.email, p.city].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const risk = p.latest_risk_level || ""
    const matchesRisk =
      riskFilter === "all" ||
      (riskFilter === "high" && risk.includes("High")) ||
      (riskFilter === "low" && (!risk || risk === "Low"))
    return matchesSearch && matchesRisk
  })

  const realCount = patients.filter(p => p.is_real).length
  const highRiskCount = patients.filter(p => (p.latest_risk_level || "").includes("High")).length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Patient Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">All registered patients and their health overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-slate-500 hover:text-blue-600"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2">
            <Users className="h-4 w-4 text-blue-600" /> {patients.length} Patients
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Patients", value: patients.length, icon: <Users className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Live from DB", value: realCount, icon: <Activity className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "High Risk Cases", value: highRiskCount, icon: <AlertTriangle className="h-4 w-4 text-red-500" />, bg: "bg-red-50 dark:bg-red-900/20" },
        ].map(s => (
          <div key={s.label} className={cn("flex flex-col items-center py-3 px-2 rounded-xl border border-white/60 dark:border-slate-700", s.bg)}>
            <div className="mb-1">{s.icon}</div>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-center">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by name, email, or city..."
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "high", "low"].map(f => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                riskFilter === f
                  ? f === "high" ? "bg-red-600 text-white border-red-600" : "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              )}
            >
              {f === "all" ? "All" : f === "high" ? "⚠ High Risk" : "✓ Low Risk"}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <User className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">No patients found</p>
          </div>
        ) : (
          filtered.map(patient => {
            const age = calculateAge(patient.date_of_birth)
            const risk = getRiskConfig(patient.latest_risk_level || "")
            const isOpen = expanded === patient.id
            const RiskIcon = risk.Icon

            return (
              <Card key={patient.id} className={cn("border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow overflow-hidden", isOpen && "shadow-md")}>
                <CardContent className="p-0">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : patient.id)}
                  >
                    <InitialsAvatar name={patient.full_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{patient.full_name || "Unknown"}</span>
                        {patient.gender && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">{patient.gender}</span>}
                        {age !== null && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">{age} yrs</span>}
                        {patient.is_real ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">LIVE</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 font-bold">DEMO</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{patient.email}</p>
                      {patient.latest_analysis && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate font-medium">Latest: {patient.latest_analysis}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border", risk.className)}>
                        {RiskIcon && <RiskIcon className="h-3 w-3" />}{risk.label}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Microscope className="h-3 w-3" />{patient.total_analyses || 0}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{patient.total_appointments || 0}</span>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 ml-1 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 sm:px-6 py-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <DetailItem icon={User} label="Full Name" value={patient.full_name || "N/A"} />
                        <DetailItem icon={Calendar} label="Date of Birth" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"} />
                        <DetailItem icon={Phone} label="Contact" value={patient.contact_number || "Not provided"} />
                        <DetailItem icon={MapPin} label="City" value={patient.city || "Not provided"} />
                        <DetailItem icon={Microscope} label="Total AI Scans" value={String(patient.total_analyses || 0)} />
                        <DetailItem icon={Calendar} label="Joined On" value={patient.created_at ? new Date(patient.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"} />
                      </div>

                      {patient.latest_analysis && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Latest Diagnosis</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{patient.latest_analysis}</p>
                          {patient.latest_analysis_date && <p className="text-xs text-slate-400 mt-0.5">{new Date(patient.latest_analysis_date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
                        </div>
                      )}

                      {/* View All Analyses Button */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <Microscope className="h-3.5 w-3.5" />
                          View All {Number(patient.total_analyses) || 0} Analysis Records
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Patient Analyses Modal */}
      {selectedPatient && (
        <PatientAnalysesModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  )
}
