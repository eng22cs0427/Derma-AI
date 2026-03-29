"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useMedicalHistory, HistoryItem } from "@/contexts/MedicalHistoryContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import {
  Microscope,
  Clock,
  Activity,
  ArrowLeft,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Calendar,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

function getRiskConfig(risk: string) {
  const r = (risk || "").toLowerCase()
  if (r.includes("very high"))
    return {
      label: "Very High Risk",
      badgeClass: "bg-red-100 text-red-700 border border-red-200",
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
      barColor: "bg-red-500",
      cardBorder: "border-l-4 border-l-red-500",
    }
  if (r.includes("high"))
    return {
      label: "High Risk",
      badgeClass: "bg-orange-100 text-orange-700 border border-orange-200",
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      barColor: "bg-orange-500",
      cardBorder: "border-l-4 border-l-orange-500",
    }
  if (r.includes("medium"))
    return {
      label: "Medium Risk",
      badgeClass: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      barColor: "bg-yellow-500",
      cardBorder: "border-l-4 border-l-yellow-400",
    }
  return {
    label: "Low Risk",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    barColor: "bg-emerald-500",
    cardBorder: "border-l-4 border-l-emerald-500",
  }
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-slate-800 dark:text-slate-100"}`}>
        {value}
      </span>
    </div>
  )
}

function AnalysisCard({ item, index }: { item: HistoryItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const details =
    typeof item.details === "string"
      ? (() => { try { return JSON.parse(item.details) } catch { return null } })()
      : item.details

  const diagnosis = details?.Diagnosis || item.data
  const confidence = details?.Confidence || "N/A"
  const riskLevel = details?.Risk_Level || "Low"
  const patientName = details?.Patient_Name || "—"
  const patientAge = details?.Patient_Age || "N/A"
  const assessment = details?.Assessment || "—"
  const recommendation = details?.Recommendation || details?.Assessment || "—"
  const imageUrl = details?.imageUrl
  const analysisTime = details?.analysis_time || "—"

  const risk = getRiskConfig(riskLevel)
  const formattedDate = new Date(item.date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const formattedTime = new Date(item.date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Card
        className={`overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${risk.cardBorder} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800`}
      >
        {/* Header Row */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Left — icon + diagnosis */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0 flex items-center justify-center">
              <Microscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{diagnosis}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">Confidence: <strong>{confidence}</strong></span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{formattedTime} IST</span>
              </div>
            </div>
          </div>

          {/* Right — risk badge + expand toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${risk.badgeClass}`}>
              {risk.icon}
              {risk.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-5 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  <DetailRow label="Patient Name" value={patientName} />
                  <DetailRow label="Patient Age" value={patientAge} />
                  <DetailRow
                    label="Risk Level"
                    value={riskLevel}
                    highlight={riskLevel.toLowerCase().includes("high")}
                  />
                  <DetailRow label="Analysis Time" value={analysisTime} />
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <DetailRow label="Medical Assessment" value={assessment} />
                  </div>
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <DetailRow label="Recommendation" value={recommendation} />
                  </div>
                </div>

                {/* S3 Image Preview */}
                {imageUrl && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3 w-3" />
                      Analysis Image
                    </p>
                    <div className="relative w-full max-w-xs h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm">
                      <Image
                        src={imageUrl}
                        alt={`Skin lesion — ${diagnosis}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default function AnalysisHistoryPage() {
  const router = useRouter()
  const { history, isLoading, refreshHistory } = useMedicalHistory()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshHistory()
    setIsRefreshing(false)
  }, [refreshHistory])

  if (!mounted) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-emerald-600" />
      </div>
    )
  }

  // Filter only skin analysis records
  const analysisItems = Array.isArray(history)
    ? history.filter((item) => item && item.id && item.type === "Analysis")
    : []

  // Apply search filter
  const filtered = search.trim()
    ? analysisItems.filter((item) => {
        const details =
          typeof item.details === "string"
            ? (() => { try { return JSON.parse(item.details) } catch { return {} } })()
            : (item.details || {})
        const searchLower = search.toLowerCase()
        return (
          item.data?.toLowerCase().includes(searchLower) ||
          (details?.Diagnosis || "").toLowerCase().includes(searchLower) ||
          (details?.Risk_Level || "").toLowerCase().includes(searchLower) ||
          (details?.Patient_Name || "").toLowerCase().includes(searchLower)
        )
      })
    : analysisItems

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-teal-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Microscope className="h-3.5 w-3.5" />
              Personal AI Records
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Skin Analysis History
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              All your past AI-powered skin diagnoses — stored securely and synced from AWS.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 text-slate-500 hover:text-emerald-700"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/analysis")}
              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4" />
              New Analysis
            </Button>
          </div>
        </div>

        {/* Stats Banner */}
        {!isLoading && analysisItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              {
                label: "Total Scans",
                value: analysisItems.length,
                icon: <Microscope className="h-4 w-4 text-emerald-600" />,
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
              },
              {
                label: "High / Very High Risk",
                value: analysisItems.filter((i) => {
                  const d = typeof i.details === "string" ? (() => { try { return JSON.parse(i.details) } catch { return {} } })() : (i.details || {})
                  return (d?.Risk_Level || "").toLowerCase().includes("high")
                }).length,
                icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
                bg: "bg-orange-50 dark:bg-orange-900/20",
              },
              {
                label: "Last Scan",
                value: new Date(analysisItems[0]?.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                icon: <Clock className="h-4 w-4 text-blue-500" />,
                bg: "bg-blue-50 dark:bg-blue-900/20",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl ${stat.bg} border border-white/60 dark:border-slate-700`}
              >
                <div className="mb-1">{stat.icon}</div>
                <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-center">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Search Bar */}
        {analysisItems.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by diagnosis, risk level, or patient name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700"
              />
            ))}
          </div>
        ) : analysisItems.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-14 text-center border-2 border-dashed border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5 shadow-sm">
              <Microscope className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Analysis History Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm leading-relaxed">
              Once you run an AI skin scan, the results will be stored securely and appear here for your records.
            </p>
            <Button
              className="mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
              onClick={() => router.push("/dashboard/analysis")}
            >
              <Microscope className="h-4 w-4 mr-2" />
              Run Your First Analysis
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-10 text-center border-slate-200">
            <Search className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-slate-500">No results for "<strong>{search}</strong>"</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, index) => (
              <AnalysisCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
