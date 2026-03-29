"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Microscope, Search, Activity, Clock, ChevronDown, RefreshCw,
  AlertTriangle, CheckCircle2, ShieldAlert, ImageIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DUMMY_ANALYSES } from "@/lib/doctor-dummy-data"

// ── Types ──────────────────────────────────────────────────────────────────────
type Analysis = {
  id: string
  data: string
  details: Record<string, unknown>
  date: string
  patient_id?: string
  patient_name: string
  patient_email: string
  date_of_birth: string
  gender: string
  contact_number: string
  is_real?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calculateAge(dob: string) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

function getRiskConfig(risk: string) {
  if (risk?.includes("Very High")) return { label: "Very High", bar: "bg-red-500 w-full", badge: "bg-red-50 text-red-700 border-red-200", Icon: ShieldAlert }
  if (risk?.includes("High")) return { label: "High", bar: "bg-orange-500 w-3/4", badge: "bg-orange-50 text-orange-700 border-orange-200", Icon: AlertTriangle }
  if (risk?.includes("Medium")) return { label: "Medium", bar: "bg-yellow-500 w-1/2", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", Icon: null }
  return { label: "Low", bar: "bg-emerald-500 w-1/4", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 }
}

const avatarColors = ["from-blue-500 to-indigo-600", "from-purple-500 to-violet-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"]

function InitialsAvatar({ name }: { name?: string }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const idx = (name || "").charCodeAt(0) % avatarColors.length
  return (
    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm", avatarColors[idx])}>
      {initials}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl px-3.5 py-3 border border-slate-100 dark:border-slate-700">
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-white">{value}</p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DoctorAnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadAnalyses = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/analyses")
      const dbData = await res.json()
      const realAnalyses: Analysis[] = Array.isArray(dbData)
        ? dbData.map(a => ({ ...a, is_real: true }))
        : []

      // Merge: real analyses first, then dummy ones (deduped by patient email + date to avoid collisions)
      const realKeys = new Set(
        realAnalyses.map(a => `${a.patient_email?.toLowerCase()}_${new Date(a.date).toDateString()}`)
      )
      const dummyAnalyses = (DUMMY_ANALYSES as unknown as Analysis[]).filter(a => {
        const key = `${a.patient_email?.toLowerCase()}_${new Date(a.date).toDateString()}`
        return !realKeys.has(key)
      }).map(a => ({ ...a, is_real: false }))

      const merged = [...realAnalyses, ...dummyAnalyses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setAnalyses(merged)
    } catch {
      setAnalyses((DUMMY_ANALYSES as unknown as Analysis[]).map(a => ({ ...a, is_real: false })))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { loadAnalyses() }, [loadAnalyses])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAnalyses()
  }

  const filtered = analyses.filter(a => {
    const details = typeof a.details === "string" ? JSON.parse(a.details) : a.details
    const risk = (details?.Risk_Level as string) || ""
    const diagnosis = (details?.Diagnosis as string) || a.data || ""
    const matchesSearch = [a.patient_name, a.patient_email, diagnosis].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchesRisk = riskFilter === "all" || (riskFilter === "critical" && risk.includes("High")) || (riskFilter === "low" && (!risk || risk === "Low"))
    return matchesSearch && matchesRisk
  })

  const realCount = analyses.filter(a => a.is_real).length
  const highRiskCount = analyses.filter(a => {
    const d = typeof a.details === "string" ? JSON.parse(a.details) : a.details
    return (d?.Risk_Level as string || "").includes("High")
  }).length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Microscope className="h-6 w-6 text-blue-600" /> AI Analysis Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete skin condition diagnoses from all patients</p>
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
            <Activity className="h-4 w-4 text-blue-600" /> {analyses.length} Total
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Analyses", value: analyses.length, icon: <Microscope className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Live from DB", value: realCount, icon: <Activity className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "High Risk", value: highRiskCount, icon: <AlertTriangle className="h-4 w-4 text-red-500" />, bg: "bg-red-50 dark:bg-red-900/20" },
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
            placeholder="Search by patient name, email, or diagnosis..."
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {[{ key: "all", label: "All" }, { key: "critical", label: "⚠ High Risk" }, { key: "low", label: "✓ Low Risk" }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRiskFilter(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap",
                riskFilter === key
                  ? key === "critical" ? "bg-red-600 text-white border-red-600" : "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Microscope className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">No analyses found</p>
          </div>
        ) : (
          filtered.map(analysis => {
            const details = typeof analysis.details === "string" ? JSON.parse(analysis.details) : analysis.details
            const risk = (details?.Risk_Level as string) || "Low"
            const riskConf = getRiskConfig(risk)
            const diagnosis = (details?.Diagnosis as string) || analysis.data
            const confidence = (details?.Confidence as string) || "N/A"
            const assessment = (details?.Assessment as string) || ""
            const recommendation = (details?.Recommendation as string) || ""
            const analysisTime = (details?.analysis_time as string) || ""
            const imageUrl = (details?.imageUrl as string) || ""
            const age = calculateAge(analysis.date_of_birth)
            const isOpen = expanded === analysis.id
            const isHighRisk = risk.includes("High")

            return (
              <Card
                key={analysis.id}
                className={cn(
                  "border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow",
                  isOpen && "shadow-md",
                  isHighRisk && "border-l-4 border-l-red-500"
                )}
              >
                <CardContent className="p-0">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : analysis.id)}
                  >
                    <InitialsAvatar name={analysis.patient_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{analysis.patient_name || "Unknown"}</span>
                        {analysis.gender && <span className="text-xs text-slate-400">{analysis.gender}</span>}
                        {age !== null && <span className="text-xs text-slate-400">{age} yrs</span>}
                        {analysis.is_real ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">LIVE</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 font-bold">DEMO</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{diagnosis}</p>
                      {assessment && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{assessment}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={cn("flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border", riskConf.badge)}>
                        {riskConf.Icon && <riskConf.Icon className="h-3 w-3" />}
                        {riskConf.label} Risk
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{confidence}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(analysis.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 ml-1 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 sm:px-6 py-5 space-y-4">
                      {/* Risk Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Risk Level</span>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", riskConf.badge)}>{riskConf.label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className={cn("h-full rounded-full", riskConf.bar)} />
                        </div>
                      </div>

                      {/* Patient + Analysis Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoBlock label="Patient Name" value={analysis.patient_name || "N/A"} />
                        <InfoBlock label="Email" value={analysis.patient_email || "N/A"} />
                        {age !== null && <InfoBlock label="Age" value={`${age} years`} />}
                        {analysis.gender && <InfoBlock label="Gender" value={analysis.gender} />}
                        {analysis.contact_number && <InfoBlock label="Contact" value={analysis.contact_number} />}
                        <InfoBlock label="Confidence" value={confidence} />
                        <InfoBlock label="Analysis Time" value={analysisTime || new Date(analysis.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
                        <InfoBlock label="Date" value={new Date(analysis.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
                      </div>

                      {assessment && (
                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                          <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1">Clinical Assessment</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{assessment}</p>
                        </div>
                      )}

                      {recommendation && (
                        <div className={cn("p-3.5 rounded-xl border", isHighRisk ? "bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900" : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900")}>
                          <p className={cn("text-[10px] uppercase font-bold tracking-wider mb-1", isHighRisk ? "text-red-500" : "text-emerald-600")}>Doctor Recommendation</p>
                          <p className={cn("text-sm", isHighRisk ? "text-red-800 dark:text-red-200" : "text-emerald-800 dark:text-emerald-200")}>{recommendation}</p>
                        </div>
                      )}

                      {/* S3 Image Preview */}
                      {imageUrl && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                            <ImageIcon className="h-3 w-3" /> Analysis Image
                          </p>
                          <div className="relative w-full max-w-xs h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm">
                            <Image src={imageUrl} alt={`Skin lesion — ${diagnosis}`} fill className="object-contain" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
