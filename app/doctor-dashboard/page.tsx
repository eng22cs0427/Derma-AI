"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Users,
  Microscope,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"

type Analysis = {
  id: string
  data: string
  details: Record<string, unknown>
  date: string
  patient_name: string
  patient_email: string
  contact_number?: string
  gender: string
}

function getRiskBadge(risk: string) {
  if (risk?.includes("Very High")) return { label: "Very High", className: "bg-red-100 text-red-700 border border-red-200" }
  if (risk?.includes("High")) return { label: "High", className: "bg-orange-100 text-orange-700 border border-orange-200" }
  if (risk?.includes("Medium")) return { label: "Medium", className: "bg-yellow-100 text-yellow-700 border border-yellow-200" }
  return { label: "Low", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" }
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub, highlight }: {
  label: string; value: number; icon: React.ElementType; iconBg: string; iconColor: string; sub: string; highlight?: boolean
}) {
  return (
    <Card className={cn("border transition-shadow hover:shadow-md", highlight ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className={cn("text-xs font-semibold uppercase tracking-wider", highlight ? "text-red-500" : "text-slate-500")}>{label}</p>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
        <p className={cn("text-4xl font-black tabular-nums", highlight ? "text-red-600" : "text-slate-900 dark:text-white")}>{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function InitialsAvatar({ name }: { name?: string }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  const colors = ["from-blue-500 to-indigo-600", "from-purple-500 to-violet-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"]
  const idx = (name || "").charCodeAt(0) % colors.length
  return (
    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm", colors[idx])}>
      {initials}
    </div>
  )
}

export default function DoctorOverviewPage() {
  const { user } = useUser()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [stats, setStats] = useState({ totalPatients: 0, totalAnalyses: 0, highRiskCases: 0, recentAnalyses: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, aRes] = await Promise.all([fetch("/api/doctor/stats"), fetch("/api/doctor/analyses")])
        const [sData, aData] = await Promise.all([sRes.json(), aRes.json()])
        // Use live analysis only
        const liveAnalyses = Array.isArray(aData) ? aData : []
        setAnalyses(liveAnalyses.slice(0, 8))
        
        if (sData?.totalPatients !== undefined) {
          setStats(sData)
        }
      } catch {
        // Fallback to empty state on error
        setAnalyses([])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening"

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-[0.07] [background-image:url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%221%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm text-white/70 font-medium">Live Patient Data</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{greeting}, Dr. {user?.fullName || "Doctor"}</h1>
            <p className="text-white/75 mt-2 max-w-xl text-sm sm:text-base">
              Your clinical dashboard — real-time AI skin analysis results and patient records from DermaAI.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/doctor-dashboard/patients">
              <Button variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm gap-2">
                <Users className="h-4 w-4" /> Patients
              </Button>
            </Link>
            <Link href="/doctor-dashboard/analyses">
              <Button variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm gap-2">
                <Microscope className="h-4 w-4" /> Analyses
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats.totalPatients} icon={Users} iconBg="bg-blue-100 dark:bg-blue-950" iconColor="text-blue-600" sub="Registered patients" />
        <StatCard label="Total Analyses" value={stats.totalAnalyses} icon={Microscope} iconBg="bg-emerald-100 dark:bg-emerald-950" iconColor="text-emerald-600" sub="AI scans completed" />
        <StatCard label="High Risk" value={stats.highRiskCases} icon={AlertTriangle} iconBg="bg-red-100 dark:bg-red-950" iconColor="text-red-600" sub="Require urgent care" highlight />
        <StatCard label="Last 7 Days" value={stats.recentAnalyses} icon={TrendingUp} iconBg="bg-violet-100 dark:bg-violet-950" iconColor="text-violet-600" sub="Recent AI scans" />
      </div>

      {/* Recent Analyses Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-semibold">Recent AI Analyses</CardTitle>
            <CardDescription>Latest skin condition scans from all patients</CardDescription>
          </div>
          <Link href="/doctor-dashboard/analyses">
            <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-36" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-52" />
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {analyses.map((a) => {
                const details = typeof a.details === "string" ? JSON.parse(a.details) : a.details
                const risk = (details?.Risk_Level as string) || "Low"
                const badge = getRiskBadge(risk)
                const diagnosis = (details?.Diagnosis as string) || a.data
                const confidence = (details?.Confidence as string) || "N/A"
                return (
                  <div key={a.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <InitialsAvatar name={a.patient_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-800 dark:text-white">{a.patient_name || "Patient"}</span>
                        {a.gender && <span className="text-xs text-slate-500 uppercase">{a.gender}</span>}
                      </div>

                      <div className="flex flex-col text-xs text-slate-400 mt-0.5 mb-1.5 space-y-0.5">
                        {a.patient_email && <span>Email: {a.patient_email}</span>}
                        {a.contact_number && <span>Phone: {a.contact_number}</span>}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 truncate font-semibold bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">
                        <span>{diagnosis}</span>
                        <span className="text-slate-400 font-normal"> · Conf: {confidence}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
