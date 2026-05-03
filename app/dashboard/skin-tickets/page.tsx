"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Microscope, Clock, CheckCircle2, AlertTriangle, ShieldAlert,
  ChevronDown, RefreshCw, MessageSquare, User, Calendar,
  ImageIcon, Stethoscope, Activity, Inbox,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PdfExportButton } from "@/components/analysis/pdf-export-button"

interface Ticket {
  id: string
  diagnosis: string
  riskLevel: string
  confidence: string
  assessment: string
  recommendation: string
  imageUrl: string
  bodyPart: string
  analysisDate: string
  ticketStatus: "Open" | "Closed"
  doctorReviewed: boolean
  doctorName: string | null
  doctorMessage: string | null
  verdict: string | null
  reviewedAt: string | null
  rawDetails: any
}

function getRiskConfig(risk: string) {
  if (risk?.includes("Very High")) return { label: "Very High", color: "text-red-700", bg: "bg-red-50 border-red-200", bar: "bg-red-500 w-full", Icon: ShieldAlert }
  if (risk?.includes("High"))     return { label: "High",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200", bar: "bg-orange-500 w-3/4", Icon: AlertTriangle }
  if (risk?.includes("Medium"))   return { label: "Medium",   color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", bar: "bg-yellow-500 w-1/2", Icon: null }
  return                                 { label: "Low",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500 w-1/4", Icon: CheckCircle2 }
}

function TicketStatusBadge({ status }: { status: string }) {
  if (status === "Closed") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="h-3 w-3" />CLOSED
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />OPEN
    </span>
  )
}

function TicketNumber({ index }: { index: number }) {
  return (
    <span className="text-[10px] font-mono font-bold text-slate-400">
      #{String(index + 1).padStart(4, "0")}
    </span>
  )
}

export default function SkinTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all")

  async function load() {
    try {
      const res = await fetch("/api/patient/skin-tickets")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setTickets(data)
      }
    } catch { /* offline gracefully */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  function handleRefresh() {
    setRefreshing(true)
    load()
  }

  const filtered = tickets.filter(t =>
    filter === "all" ? true :
    filter === "open" ? t.ticketStatus === "Open" :
    t.ticketStatus === "Closed"
  )

  const openCount   = tickets.filter(t => t.ticketStatus === "Open").length
  const closedCount = tickets.filter(t => t.ticketStatus === "Closed").length
  const highRisk    = tickets.filter(t => t.riskLevel.includes("High")).length

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Microscope className="h-6 w-6 text-blue-600" />
            Skin Analysis Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Your AI diagnoses are reviewed by our dermatologists — track status here
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 self-start sm:self-auto">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: tickets.length, icon: <Inbox className="h-4 w-4 text-blue-500" />,    bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-100 dark:border-blue-800" },
          { label: "Pending Review", value: openCount, icon: <Activity className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-100 dark:border-amber-800" },
          { label: "Reviewed",  value: closedCount, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800" },
        ].map(s => (
          <div key={s.label} className={cn("flex flex-col items-center py-3 px-2 rounded-xl border", s.bg, s.border)}>
            {s.icon}
            <p className="text-xl font-black mt-1">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 text-center mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">How it works</p>
        <div className="flex flex-col sm:flex-row gap-3 text-xs text-blue-700 dark:text-blue-300">
          {["1. You scan a skin condition → AI analyses it", "2. A dermatologist reviews your report", "3. Doctor sends you their findings & advice", "4. Ticket is closed — you get an email notification"].map((step, i) => (
            <div key={i} className="flex items-start gap-1.5 flex-1">
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
              <p>{step.replace(/^\d+\. /, "")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all","open","closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold border transition-all capitalize",
            filter === f ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-300"
          )}>
            {f === "all" ? `All (${tickets.length})` : f === "open" ? `Pending (${openCount})` : `Closed (${closedCount})`}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Microscope className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">No tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Use the Skin Analysis tool to generate your first report</p>
          </div>
        ) : (
          filtered.map((ticket, idx) => {
            const risk = getRiskConfig(ticket.riskLevel)
            const isOpen = expanded === ticket.id
            const isHighRisk = ticket.riskLevel.includes("High")

            return (
              <Card key={ticket.id} className={cn(
                "border overflow-hidden transition-shadow hover:shadow-md",
                isHighRisk ? "border-l-4 border-l-red-500" : "border-l-4 border-l-blue-400",
                ticket.ticketStatus === "Closed" && "border-l-emerald-500",
                isOpen && "shadow-md"
              )}>
                <CardContent className="p-0">
                  {/* Collapsed row */}
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : ticket.id)}
                  >
                    {/* Left: icon */}
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isHighRisk ? "bg-red-100" : "bg-blue-100")}>
                      <Microscope className={cn("h-5 w-5", isHighRisk ? "text-red-600" : "text-blue-600")} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <TicketNumber index={idx} />
                        <TicketStatusBadge status={ticket.ticketStatus} />
                        {ticket.ticketStatus === "Closed" && (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <User className="h-3 w-3" /> Dr. {ticket.doctorName}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{ticket.diagnosis}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span className={cn("font-semibold", risk.color)}>{risk.label} Risk</span>
                        {ticket.confidence && <span>{ticket.confidence}</span>}
                        {ticket.bodyPart && <span className="capitalize">{ticket.bodyPart}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ticket.analysisDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-6 space-y-4">

                      {/* Progress steps */}
                      <div className="flex items-center gap-0 text-xs">
                        {[
                          { label: "Scanned", done: true },
                          { label: "AI Analysed", done: true },
                          { label: "Doctor Review", done: ticket.doctorReviewed },
                          { label: "Closed", done: ticket.ticketStatus === "Closed" },
                        ].map((step, i, arr) => (
                          <div key={step.label} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                                step.done ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-slate-400"
                              )}>
                                {step.done ? "✓" : i + 1}
                              </div>
                              <span className={cn("mt-1 text-[9px] font-semibold whitespace-nowrap", step.done ? "text-blue-600" : "text-slate-400")}>
                                {step.label}
                              </span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={cn("h-0.5 w-8 sm:w-14 mx-1 mb-3", step.done && arr[i+1].done ? "bg-blue-600" : "bg-slate-200")} />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Risk bar & Download */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="uppercase text-slate-400 tracking-wider">Risk Level</span>
                            <span className={risk.color}>{risk.label}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", risk.bar)} />
                          </div>
                        </div>
                        <div className="shrink-0">
                          <PdfExportButton details={ticket.rawDetails} variant="outline" className="w-full sm:w-auto text-xs" />
                        </div>
                      </div>

                      {/* AI details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: "AI Diagnosis", value: ticket.diagnosis },
                          { label: "Confidence Score", value: ticket.confidence || "—" },
                          { label: "Body Part", value: ticket.bodyPart || "—" },
                          { label: "Analysis Date", value: new Date(ticket.analysisDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) },
                        ].map(f => (
                          <div key={f.label} className="bg-white dark:bg-slate-800 rounded-xl px-3.5 py-3 border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{f.label}</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.value}</p>
                          </div>
                        ))}
                      </div>

                      {ticket.assessment && (
                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                          <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider mb-1">AI Clinical Assessment</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{ticket.assessment}</p>
                        </div>
                      )}

                      {ticket.recommendation && (
                        <div className={cn("p-3.5 rounded-xl border", isHighRisk ? "bg-red-50 dark:bg-red-950/40 border-red-100" : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100")}>
                          <p className={cn("text-[10px] uppercase font-bold tracking-wider mb-1", isHighRisk ? "text-red-500" : "text-emerald-600")}>
                            AI Recommendation
                          </p>
                          <p className={cn("text-sm", isHighRisk ? "text-red-800 dark:text-red-200" : "text-emerald-800 dark:text-emerald-200")}>{ticket.recommendation}</p>
                        </div>
                      )}

                      {/* Skin image */}
                      {ticket.imageUrl && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                            <ImageIcon className="h-3 w-3" /> Analysis Image
                          </p>
                          <div className="relative w-full max-w-xs h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm">
                            <Image src={ticket.imageUrl} alt={ticket.diagnosis} fill className="object-contain" />
                          </div>
                        </div>
                      )}

                      {/* Doctor review section */}
                      {ticket.doctorReviewed && ticket.doctorMessage ? (
                        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 overflow-hidden">
                          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-100 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-700">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                              <Stethoscope className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Dr. {ticket.doctorName} reviewed your report</p>
                              {ticket.reviewedAt && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                  {new Date(ticket.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                            <div className="ml-auto">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {ticket.verdict && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-slate-500">Verdict</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{ticket.verdict}</span>
                              </div>
                            )}
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-800">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Doctor's Message
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">"{ticket.doctorMessage}"</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Ticket closed — check your email for the full report
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 p-4 text-center">
                          <Clock className="h-7 w-7 text-blue-300 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Awaiting Doctor Review</p>
                          <p className="text-xs text-slate-500 mt-1">A dermatologist will review your analysis and close this ticket. You'll get an email notification.</p>
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
