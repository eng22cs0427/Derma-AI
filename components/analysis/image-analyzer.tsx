"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Upload, X, AlertCircle, CheckCircle2, Loader2, Stethoscope,
  AlertTriangle, Volume2, Download, Clock, Brain, ChevronRight,
  Activity, Eye, MapPin, Microscope, ShieldAlert, Zap
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMedicalHistory } from "@/contexts/MedicalHistoryContext"
import { BodyPartSelector } from "@/components/analysis/body-part-selector"
import { CameraCapture } from "@/components/analysis/camera-capture"
import { DISEASE_DB, BODY_PARTS } from "@/lib/skin-disease-db"

const COLORS = ['#4ade80', '#facc15', '#f97316', '#ef4444', '#60a5fa', '#a78bfa', '#f472b6']

// Typed result shape returned from /api/predict-azure
interface SkinResult {
  prediction: string
  prediction_name: string
  icd10: string
  confidence: number
  severity: string
  severity_label: string
  urgency: string
  message?: string
  what_detected?: string
  validation_error?: boolean
  fitzpatrick_type: string
  skin_tone: string
  abcde: Record<string, string | string[]>
  lesion_morphology: string
  location: string
  clinical_notes: string
  differential_diagnoses: string[]
  class_probabilities: Record<string, number>
  azure_quality_score: number
  needs_doctor_review: boolean
  engines_used: Record<string, boolean>
  body_part: string
  body_part_matches: boolean
  symptoms: string[]
  treatments: string[]
  precautions: string[]
  specialists: string[]
  error?: string
}

type Step = 'SELECT_BODY_PART' | 'CAMERA' | 'ANALYZING' | 'RESULT'

const ANALYSIS_STEPS = [
  { label: 'Verifying body part match', progress: 20 },
  { label: 'Azure Vision — checking image quality', progress: 45 },
  { label: 'ML Model — classifying skin lesion', progress: 68 },
  { label: 'GPT-4o Vision — deep medical reasoning', progress: 88 },
  { label: 'Fusion engine — generating your report', progress: 100 },
]

function SeverityBadge({ severity }: { severity: string }) {
  const cfg: Record<string, { bg: string; text: string; border: string; label: string }> = {
    Critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', label: 'Critical' },
    High:     { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', label: 'High' },
    Moderate: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', label: 'Moderate' },
    Low:      { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', label: 'Low' },
    None:     { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', label: 'None' },
  }
  const s = cfg[severity] || cfg['Low']
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

function ABCDEPanel({ abcde }: { abcde: Record<string, string | string[]> }) {
  const criteria = [
    { key: 'A', label: 'Asymmetry', value: abcde.asymmetry as string, danger: (abcde.asymmetry as string)?.toLowerCase().includes('asymmetric') },
    { key: 'B', label: 'Border', value: abcde.border as string, danger: (abcde.border as string)?.toLowerCase().includes('irregular') },
    { key: 'C', label: 'Color', value: Array.isArray(abcde.color) ? (abcde.color as string[]).join(', ') : abcde.color as string, danger: Array.isArray(abcde.color) && (abcde.color as string[]).length > 2 },
    { key: 'D', label: 'Diameter', value: abcde.diameter_estimate as string, danger: (abcde.diameter_estimate as string)?.includes('>6') || (abcde.diameter_estimate as string)?.includes('>10') },
    { key: 'E', label: 'Evolution', value: abcde.evolution_indicators as string, danger: false },
  ]
  return (
    <div className="space-y-2">
      {criteria.map(c => (
        <div key={c.key} className={`flex items-start gap-3 p-3 rounded-lg border ${c.danger ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
          <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${c.danger ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
            {c.key}
          </div>
          <div className="flex-1">
            <p className={`text-xs font-semibold ${c.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>{c.label}</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{c.value || 'Unable to assess'}</p>
          </div>
          <span>{c.danger ? 'Warning' : 'Pass'}</span>
        </div>
      ))}
    </div>
  )
}

export function ImageAnalyzer() {
  const [step, setStep] = useState<Step>('SELECT_BODY_PART')
  const [bodyPart, setBodyPart] = useState<string>('')
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0)
  const [result, setResult] = useState<SkinResult | null>(null)
  const [analysisSaved, setAnalysisSaved] = useState(false)
  // Live elapsed timer during analysis
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const analysisRef = useRef<HTMLDivElement>(null)
  const { refreshHistory } = useMedicalHistory()

  // ── Pending-ticket gate ──────────────────────────────────────────────────
  // If the patient already has an open ticket (awaiting doctor review),
  // block new scans until the doctor closes it.
  const [pendingTicket, setPendingTicket] = useState<{
    id: string; diagnosis: string; riskLevel: string
    analysisDate: string; confidence: string
  } | null | undefined>(undefined) // undefined = still loading

  useEffect(() => {
    fetch('/api/patient/skin-tickets')
      .then(r => r.ok ? r.json() : [])
      .then((tickets: Array<{
        id: string; diagnosis: string; riskLevel: string
        analysisDate: string; ticketStatus: string; confidence: string
      }>) => {
        const latest = tickets[0]
        const open = latest?.ticketStatus === 'Open' ? latest : null
        setPendingTicket(open)
      })
      .catch(() => setPendingTicket(null)) // on error, don't block
  }, [])


  // Estimated total seconds (rough: Azure CV ~3s + ML ~4s + GPT-4o ~10s + fusion ~1s)
  const ESTIMATED_SECS = 20

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const sendBrowserNotification = useCallback((data: SkinResult) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const isDanger = ['Critical', 'High'].includes(data.severity)
    const isHealthy = data.prediction === 'healthy'
    const icon = isDanger ? '🚨' : isHealthy ? '✅' : '⚠️'
    const title = isDanger
      ? `${icon} DermaSense: Urgent — ${data.severity} Risk Detected`
      : isHealthy
      ? `${icon} DermaSense: Healthy Skin — No Issues Found`
      : `${icon} DermaSense: Analysis Complete`
    const body = isHealthy
      ? 'Your skin looks healthy. No significant condition detected.'
      : `${data.prediction_name} — ${(data.confidence * 100).toFixed(1)}% confidence · ${data.severity} severity · ${data.urgency}`
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'dermasense-analysis',
        requireInteraction: isDanger,
      })
    } catch { /* Safari / blocked */ }
  }, [])

  const bodyPartInfo = BODY_PARTS.find(p => p.id === bodyPart)

  // ── Step Indicator ───────────────────────────────────────────────────────
  const STEPS_DEF = [
    { id: 'SELECT_BODY_PART', label: 'Body Part' },
    { id: 'CAMERA', label: 'Scan' },
    { id: 'ANALYZING', label: 'Analyze' },
    { id: 'RESULT', label: 'Results' },
  ]
  const currentStepIdx = STEPS_DEF.findIndex(s => s.id === step)

  // ── Handle body part selection ───────────────────────────────────────────
  const handleBodyPartSelect = (part: string) => {
    setBodyPart(part)
    setStep('CAMERA')
    setCapturedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setAnalysisSaved(false)
  }

  // ── Handle camera/upload capture ─────────────────────────────────────────
  const handleCaptured = (file: File) => {
    setCapturedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    runAnalysis(file)
  }

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a JPEG or PNG image.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File too large — please keep it under 8MB.')
      return
    }
    handleCaptured(file)
  }

  // ── 3-engine analysis ────────────────────────────────────────────────────
  const runAnalysis = async (file: File) => {
    setStep('ANALYZING')
    setIsAnalyzing(true)
    setAnalysisSaved(false)
    setElapsedSecs(0)
    setAnalysisStepIdx(0)

    // Live elapsed-time counter
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsedSecs(s => s + 1)
    }, 1000)

    // Animate progress steps
    let idx = 0
    const stepInterval = setInterval(() => {
      idx++
      if (idx < ANALYSIS_STEPS.length - 1) setAnalysisStepIdx(idx)
      else clearInterval(stepInterval)
    }, 1400)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bodyPart', bodyPart || 'other')

      const res = await fetch('/api/predict-azure', { method: 'POST', body: formData })

      clearInterval(stepInterval)
      setAnalysisStepIdx(ANALYSIS_STEPS.length - 1)

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Analysis failed')
      }

      const data: SkinResult = await res.json()
      setResult(data)
      refreshHistory()
      setAnalysisSaved(true)

      // Stop timer
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

      await new Promise(r => setTimeout(r, 600))
      setStep('RESULT')

      // ── In-app toasts with severity colour
      const isDanger = ['Critical', 'High'].includes(data.severity)
      if (data.prediction === 'error' || data.error === 'not_skin_image') {
        toast.warning('Invalid Image — Please retake', {
          description: data.message || 'Capture a clear, close-up photo of the skin.',
        })
      } else if (isDanger) {
        toast.error(`🚨 ${data.severity} Risk — ${data.prediction_name}`, {
          description: `${(data.confidence * 100).toFixed(1)}% confidence · ${data.urgency}`,
          duration: 8000,
        })
      } else if (data.prediction === 'healthy') {
        toast.success('✅ Healthy Skin — No Disease Detected', {
          description: 'Continue routine skin care and annual check-ups.',
          duration: 6000,
        })
      } else {
        toast.success(`Analysis Complete — ${data.prediction_name}`, {
          description: `${(data.confidence * 100).toFixed(1)}% confidence · ${data.severity} severity`,
        })
      }

      // ── Browser push notification
      sendBrowserNotification(data)

    } catch (err) {
      clearInterval(stepInterval)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      toast.error('Analysis Failed', { description: err instanceof Error ? err.message : 'Please try again.' })
      setStep('CAMERA')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAll = () => {
    setStep('SELECT_BODY_PART')
    setBodyPart('')
    setCapturedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setAnalysisSaved(false)
    setAnalysisStepIdx(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const speakSummary = () => {
    if (!result) return
    const text = `Skin analysis result for ${result.prediction_name}. Confidence ${((result.confidence as number) * 100).toFixed(1)} percent. Severity ${result.severity}. Urgency: ${result.urgency}. ${result.clinical_notes}`
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text as string))
  }

  const exportToPDF = async () => {
    if (!analysisRef.current) return
    const { default: html2pdf } = await import('html2pdf.js')
    // Clone and sanitise for PDF — remove motion wrappers' inline transforms
    const element = analysisRef.current
    html2pdf()
      .set({
        margin: [0.4, 0.4, 0.6, 0.4],
        filename: `DermaSense_Analysis_${result?.prediction_name?.replace(/\s+/g, '_') || 'result'}.pdf`,
        html2canvas: {
          scale: 1.8,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 900,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.pdf-page-break' },
      })
      .from(element)
      .save()
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  // Still checking for pending ticket
  if (pendingTicket === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-muted-foreground">Checking your analysis status…</p>
      </div>
    )
  }

  // Pending ticket exists — block new scan
  if (pendingTicket !== null) {
    const riskColors: Record<string, string> = {
      'Very High': 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800',
      High:        'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800',
      Medium:      'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800',
      Low:         'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800',
    }
    const riskKey = Object.keys(riskColors).find(k => pendingTicket.riskLevel.includes(k)) ?? 'Low'
    const riskClass = riskColors[riskKey]
    const isHighRisk = ['Very High', 'High'].includes(riskKey)

    return (
      <div className="space-y-6">
        <Card className="border-2 border-amber-200 dark:border-amber-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-2" />
          <CardContent className="pt-8 pb-8 space-y-6">
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Analysis Under Doctor Review</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  Your previous scan is currently being reviewed by a dermatologist.
                  You can start a new scan once the doctor has reviewed and closed your ticket.
                </p>
              </div>
            </div>

            {/* Pending ticket details */}
            <div className={`rounded-xl border-2 p-4 space-y-3 ${riskClass}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-base">{pendingTicket.diagnosis}</span>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border-2 ${isHighRisk ? 'bg-red-100 border-red-300 text-red-700' : 'bg-emerald-100 border-emerald-300 text-emerald-700'}`}>
                  {pendingTicket.riskLevel} Risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Scanned on</p>
                  <p className="font-semibold">
                    {new Date(pendingTicket.analysisDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {pendingTicket.confidence && (
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider">AI Confidence</p>
                    <p className="font-semibold">{pendingTicket.confidence}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Step progress */}
            <div className="flex items-center justify-center gap-0">
              {[
                { label: 'Scanned', done: true },
                { label: 'AI Analysed', done: true },
                { label: 'Doctor Review', done: false },
                { label: 'Closed', done: false },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      s.done ? 'bg-blue-600 border-blue-600 text-white' : i === 2 ? 'bg-amber-400 border-amber-400 text-white animate-pulse' : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {s.done ? '✓' : i === 2 ? '…' : i + 1}
                    </div>
                    <span className={`mt-1 text-[9px] font-semibold whitespace-nowrap ${
                      s.done ? 'text-blue-600' : i === 2 ? 'text-amber-600 font-bold' : 'text-slate-400'
                    }`}>{s.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`h-0.5 w-8 sm:w-12 mx-1 mb-4 ${
                      s.done ? 'bg-blue-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/dashboard/skin-tickets"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-sm"
              >
                <Eye className="h-4 w-4" /> View My Ticket Status
              </a>
              {isHighRisk && (
                <a
                  href="/dashboard/appointments"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-sm"
                >
                  <Stethoscope className="h-4 w-4" /> Book Urgent Appointment
                </a>
              )}
            </div>

            <p className="text-center text-xs text-slate-400">
              You will receive an email notification once the doctor reviews your report and closes the ticket.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Breadcrumb */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {STEPS_DEF.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              i === currentStepIdx
                ? 'bg-emerald-600 text-white shadow'
                : i < currentStepIdx
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
            }`}>
              {i < currentStepIdx ? 'Done - ' : `${i + 1}. `}{s.label}
            </div>
            {i < STEPS_DEF.length - 1 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Body Part Selection ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === 'SELECT_BODY_PART' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-2 border-emerald-100 dark:border-emerald-900/30 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
              <CardContent className="pt-8 pb-8">
                <BodyPartSelector onSelect={handleBodyPartSelect} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── STEP 2: Camera/Upload ──────────────────────────────────────────── */}
        {step === 'CAMERA' && (
          <motion.div key="camera" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-2 border-emerald-100 dark:border-emerald-900/30 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{bodyPartInfo?.icon}</span>
                    <div>
                      <CardTitle className="text-emerald-900 dark:text-emerald-100">Scanning: {bodyPartInfo?.label}</CardTitle>
                      <CardDescription>Step 2 — Capture your skin image</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetAll}>
                    <X className="h-4 w-4 mr-1" /> Change Area
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="camera">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="camera" className="flex-1" id="camera-tab">Live Camera</TabsTrigger>
                    <TabsTrigger value="upload" className="flex-1" id="upload-tab">Upload Image</TabsTrigger>
                  </TabsList>

                  <TabsContent value="camera">
                    <CameraCapture bodyPart={bodyPart} onCapture={handleCaptured} />
                  </TabsContent>

                  <TabsContent value="upload">
                    <div
                      className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="mb-4 p-5 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                        <Upload className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold mb-1 text-emerald-900 dark:text-emerald-100">Upload {bodyPartInfo?.label} Image</h3>
                      <p className="text-sm text-muted-foreground mb-4">Click to browse or drag & drop. JPEG / PNG, max 8MB.</p>
                      <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white" id="upload-browse-btn">
                        <Upload className="mr-2 h-4 w-4" /> Browse File
                      </Button>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/jpg" onChange={handleFileChange} id="file-upload-input" />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── STEP 3: Analysis Progress ─────────────────────────────────────── */}
        {step === 'ANALYZING' && (() => {
          const remaining = Math.max(0, ESTIMATED_SECS - elapsedSecs)
          const overallPct = Math.min(100, Math.round((elapsedSecs / ESTIMATED_SECS) * 100))
          const mins = Math.floor(remaining / 60)
          const secs = remaining % 60
          const timeLabel = remaining === 0
            ? 'Finalising…'
            : mins > 0
            ? `~${mins}m ${secs}s remaining`
            : `~${secs}s remaining`
          // circle SVG params
          const R = 36, C = 2 * Math.PI * R
          const strokeDash = C - (overallPct / 100) * C

          return (
            <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-2 border-emerald-100 dark:border-emerald-900/30 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-2" />
                <CardContent className="py-10 px-4 sm:px-8">
                  <div className="max-w-lg mx-auto space-y-6">

                    {/* ── Header: brain + circular timer ── */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative shrink-0">
                        {/* Circular countdown ring */}
                        <svg width="100" height="100" className="-rotate-90">
                          <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor"
                            className="text-emerald-100 dark:text-emerald-900/40" strokeWidth="7" />
                          <motion.circle
                            cx="50" cy="50" r={R} fill="none"
                            stroke="url(#timerGrad)" strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={C}
                            strokeDashoffset={strokeDash}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                          <defs>
                            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* Spinning brain inside ring */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                            <Brain className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        </div>
                        {/* Percentage overlay */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-900 px-1.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                            {overallPct}%
                          </span>
                        </div>
                      </div>

                      <div className="text-center sm:text-left flex-1">
                        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">AI Analysis in Progress</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">3 AI engines working in parallel</p>

                        {/* ── Live timer display ── */}
                        <div className="mt-3 flex flex-col sm:flex-row items-center sm:items-start gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                              {String(Math.floor(elapsedSecs / 60)).padStart(2,'0')}:{String(elapsedSecs % 60).padStart(2,'0')} elapsed
                            </span>
                          </div>
                          <motion.div
                            key={timeLabel}
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700"
                          >
                            <Loader2 className="h-3.5 w-3.5 text-teal-600 animate-spin" />
                            <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                              {timeLabel}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* ── Per-step progress bars ── */}
                    <div className="space-y-3">
                      {ANALYSIS_STEPS.map((s, i) => {
                        const isActive = i === analysisStepIdx
                        const isDone   = i < analysisStepIdx
                        const isPending = i > analysisStepIdx
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: isPending ? 0.4 : 1 }}
                            className={`p-3 rounded-xl border transition-all ${
                              isDone   ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                              isActive ? 'bg-teal-50 border-teal-300 dark:bg-teal-900/20 dark:border-teal-700 shadow-sm' :
                                         'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {isDone
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  : isActive
                                  ? <Loader2 className="h-4 w-4 text-teal-500 animate-spin shrink-0" />
                                  : <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
                                }
                                <span className={`text-xs font-semibold ${
                                  isDone ? 'text-emerald-700 dark:text-emerald-300' :
                                  isActive ? 'text-teal-700 dark:text-teal-300' :
                                  'text-gray-400'
                                }`}>
                                  {isDone ? '✓ ' : isActive ? '▶ ' : ''}{s.label}
                                </span>
                              </div>
                              <span className={`text-xs tabular-nums font-bold ${
                                isDone ? 'text-emerald-600' : isActive ? 'text-teal-600' : 'text-gray-400'
                              }`}>
                                {isDone ? s.progress : isActive ? s.progress : 0}%
                              </span>
                            </div>
                            <Progress
                              value={isDone ? s.progress : isActive ? s.progress : 0}
                              className={`h-1.5 ${isActive ? '[&>div]:bg-gradient-to-r [&>div]:from-teal-500 [&>div]:to-cyan-500' : '[&>div]:bg-emerald-500'}`}
                            />
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* ── Engine badges ── */}
                    <div className="flex justify-center gap-3 pt-1 flex-wrap">
                      {(['Azure CV', 'ML Model', 'GPT-4o'] as const).map((e, i) => (
                        <motion.div
                          key={e}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.4 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          <motion.div
                            className="w-2 h-2 rounded-full bg-emerald-500"
                            animate={{ scale: [1, 1.4, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                          />
                          {e}
                        </motion.div>
                      ))}
                    </div>

                    {/* ── Notification note ── */}
                    <p className="text-center text-xs text-muted-foreground pt-1">
                      You&apos;ll receive a browser notification when results are ready
                    </p>

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })()}

        {/* ── STEP 4: Results ──────────────────────────────────────────────────── */}
        {step === 'RESULT' && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div ref={analysisRef}>

            {/* ── Not Skin / Error ─── */}
            {(result.error === 'not_skin_image' || result.prediction === 'error') && (
              <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 mb-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-800 shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-1">Invalid or Unclear Image</h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {result.message || 'Please capture a clear, close-up photo of the skin area.'}
                    </p>
                  </div>
                </div>

                {/* What was detected */}
                {result.what_detected && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700">
                    <Eye className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">AI detected: </span>
                      <span className="capitalize">{result.what_detected}</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-red-600 dark:text-red-400">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Use a real skin area</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Ensure good lighting</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Hold camera steady & close</div>
                </div>

                <Button variant="destructive" size="lg" className="w-full" onClick={resetAll}>
                  Try Again with a New Image
                </Button>
              </div>
            )}

            {result.prediction !== 'error' && (
              <Card className="overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/30 shadow-2xl">
                <div className={`h-2 bg-gradient-to-r ${
                  result.severity === 'Critical' ? 'from-red-500 to-rose-600' :
                  result.severity === 'High' ? 'from-orange-500 to-amber-500' :
                  result.severity === 'Moderate' ? 'from-yellow-400 to-amber-500' :
                  result.prediction === 'healthy' ? 'from-emerald-400 to-teal-500' :
                  'from-blue-400 to-teal-400'
                }`} />
                <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 px-4 sm:px-6 py-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {bodyPartInfo && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium border shadow-sm">
                          <span>{bodyPartInfo.icon}</span>
                          <span>{bodyPartInfo.label}</span>
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">{result.icd10 as string}</span>
                      <SeverityBadge severity={result.severity as string} />
                      {analysisSaved && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="text-xl sm:text-2xl text-emerald-900 dark:text-emerald-100 leading-tight">
                        {result.prediction === 'healthy' ? 'Healthy Skin Detected' : `${result.prediction_name as string}`}
                      </CardTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={speakSummary} id="speak-btn">
                          <Volume2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Speak</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToPDF} id="export-pdf-btn">
                          <Download className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Export PDF</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pt-4 sm:pt-6">
                  {/* ── Critical / High warnings ── */}
                  {result.severity === 'Critical' && (
                    <Alert className="bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-700 dark:text-red-300">Urgent Medical Attention Required</AlertTitle>
                      <AlertDescription className="text-red-600 dark:text-red-400">
                        This condition requires immediate evaluation by a medical professional. Please seek care today.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.severity === 'High' && (
                    <Alert className="bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-800">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-700 dark:text-orange-300">Prompt Medical Evaluation Advised</AlertTitle>
                      <AlertDescription className="text-orange-600 dark:text-orange-400">
                        Please see a dermatologist or specialist soon to assess this condition.
                      </AlertDescription>
                    </Alert>
                  )}
                  {result.needs_doctor_review && (
                    <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-800">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-700 dark:text-amber-300">Doctor Review Recommended</AlertTitle>
                      <AlertDescription className="text-amber-600 dark:text-amber-400">
                        Our AI engines gave differing assessments. A human dermatologist should verify this result.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* ── Healthy Card ── */}
                  {result.prediction === 'healthy' && (
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-800 text-center">
                      <div className="text-5xl mb-3">Health Status</div>
                      <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">Healthy Skin — No Disease Detected</h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">{result.clinical_notes as string}</p>
                      <div className="mt-4 flex justify-center gap-3 flex-wrap">
                        <span className="px-3 py-1 bg-emerald-200 dark:bg-emerald-800 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-200">Severity: None</span>
                        <span className="px-3 py-1 bg-emerald-200 dark:bg-emerald-800 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-200">No action needed</span>
                      </div>
                    </motion.div>
                  )}

                  {/* ── AI Engines Used ── */}
                  {result.engines_used && (
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(result.engines_used as Record<string, boolean>).map(([engine, used]) => (
                        <span key={engine} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${used ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                          {used ? 'Used' : 'Skipped'} {engine.replace('_', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* ── Left column ── */}
                    <div className="space-y-3 sm:space-y-4">
                      {result.prediction !== 'healthy' && (
                        <>
                          {/* Core diagnosis */}
                          <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border">
                            <p className="text-xs font-semibold text-gray-500 mb-1">DIAGNOSED CONDITION</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{result.prediction_name as string}</p>
                            <p className="text-xs text-muted-foreground mt-1">Code: {result.prediction as string} · ICD-10: {result.icd10 as string}</p>
                          </motion.div>

                          {/* Confidence + Severity */}
                          <div className="grid grid-cols-2 gap-3">
                            <motion.div whileHover={{ scale: 1.02 }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border text-center">
                              <p className="text-xs font-medium text-gray-500 mb-1">Confidence</p>
                              <p className="text-2xl font-bold text-emerald-700">{((result.confidence as number) * 100).toFixed(1)}%</p>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.02 }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border text-center">
                              <p className="text-xs font-medium text-gray-500 mb-1">Urgency</p>
                              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{result.urgency as string}</p>
                            </motion.div>
                          </div>

                          {/* Skin profile */}
                          <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="h-4 w-4 text-indigo-600" />
                              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Skin Profile</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-800 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                                Fitzpatrick Type {result.fitzpatrick_type as string}
                              </span>
                              <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-800 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                                {result.skin_tone as string}
                              </span>
                              {result.lesion_morphology && result.lesion_morphology !== 'none' && (
                                <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-800 rounded-full text-xs font-semibold text-purple-700 dark:text-purple-200 capitalize">
                                  {result.lesion_morphology as string}
                                </span>
                              )}
                            </div>
                          </motion.div>

                          {/* Location */}
                          {result.location && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-xs text-gray-500">Detected Location</p>
                                <p className="text-sm font-semibold capitalize">{result.location as string}</p>
                              </div>
                              {result.body_part_matches === false && (
                                <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Mismatch</span>
                              )}
                            </motion.div>
                          )}

                          {/* Clinical Notes */}
                          {result.clinical_notes && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Microscope className="h-4 w-4 text-blue-600" />
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Clinical Assessment</p>
                              </div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{result.clinical_notes as string}</p>
                            </motion.div>
                          )}

                          {/* Differential Diagnoses */}
                          {Array.isArray(result.differential_diagnoses) && (result.differential_diagnoses as string[]).length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border">
                              <p className="text-xs font-semibold text-gray-500 mb-2">DIFFERENTIAL DIAGNOSES</p>
                              <div className="flex gap-2 flex-wrap">
                                {(result.differential_diagnoses as string[]).map((d: string) => (
                                  <span key={d} className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">{d}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Symptoms */}
                          {Array.isArray(result.symptoms) && (result.symptoms as string[]).length > 0 && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-yellow-600" />
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Common Symptoms</p>
                              </div>
                              <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 space-y-0.5">
                                {(result.symptoms as string[]).map((s: string) => <li key={s}>{s}</li>)}
                              </ul>
                            </motion.div>
                          )}

                          {/* Treatments */}
                          {Array.isArray(result.treatments) && (result.treatments as string[]).length > 0 && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-blue-600" />
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Suggested Treatments</p>
                              </div>
                              <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-0.5">
                                {(result.treatments as string[]).map((t: string) => <li key={t}>{t}</li>)}
                              </ul>
                            </motion.div>
                          )}

                          {/* Precautions */}
                          {Array.isArray(result.precautions) && (result.precautions as string[]).length > 0 && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert className="h-4 w-4 text-emerald-600" />
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Precautions</p>
                              </div>
                              <ul className="list-disc list-inside text-sm text-emerald-800 dark:text-emerald-200 space-y-0.5">
                                {(result.precautions as string[]).map((p: string) => <li key={p}>{p}</li>)}
                              </ul>
                            </motion.div>
                          )}

                          {/* Specialists */}
                          {Array.isArray(result.specialists) && (result.specialists as string[]).length > 0 && (
                            <motion.div whileHover={{ scale: 1.01 }} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Stethoscope className="h-4 w-4 text-green-600" />
                                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Recommended Specialists</p>
                              </div>
                              <ul className="list-disc list-inside text-sm text-green-800 dark:text-green-200">
                                {(result.specialists as string[]).map((s: string) => <li key={s}>{s}</li>)}
                              </ul>
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>

                    {/* ── Right column ── */}
                    <div className="space-y-3 sm:space-y-5">
                      {result.prediction !== 'healthy' && result.abcde && (
                        <>
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-600" /> ABCDE Criteria Analysis
                          </h3>
                          <ABCDEPanel abcde={result.abcde as Record<string, string | string[]>} />
                        </>
                      )}

                      {/* Class probabilities */}
                      {result.class_probabilities && Object.keys(result.class_probabilities as Record<string, number>).length > 0 && (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border">
                          <p className="text-sm font-semibold mb-3">ML Classification Probabilities</p>
                          <div className="space-y-2">
                            {Object.entries(result.class_probabilities as Record<string, number>)
                              .sort(([, a], [, b]) => b - a)
                              .map(([cls, prob]) => (
                              <div key={cls}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium">{DISEASE_DB[cls]?.name || cls.toUpperCase()}</span>
                                  <span>{((prob as number) * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={(prob as number) * 100} className="h-1.5 [&>div]:bg-emerald-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pie chart */}
                      {result.class_probabilities && Object.keys(result.class_probabilities as Record<string, number>).length > 0 && (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border">
                          <p className="text-sm font-semibold mb-3">Probability Distribution</p>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={Object.entries(result.class_probabilities as Record<string, number>).map(([label, prob], i) => ({
                                    name: DISEASE_DB[label]?.name || label.toUpperCase(),
                                    value: +((prob as number) * 100).toFixed(1),
                                    fill: COLORS[i % COLORS.length],
                                  }))}
                                  dataKey="value" nameKey="name"
                                  cx="50%" cy="50%" outerRadius={75}
                                  label={({ name, value }) => `${name.substring(0,8)}: ${value}%`}
                                >
                                  {Object.entries(result.class_probabilities as Record<string, number>).map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => `${v}%`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Source image — constrained so PDF doesn't cut it */}
                      {previewUrl && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border pdf-avoid-break">
                          <p className="text-xs font-medium text-gray-500 mb-2">Analyzed Image</p>
                          <div className="relative w-full rounded-lg overflow-hidden" style={{ maxHeight: '220px' }}>
                            <Image
                              src={previewUrl}
                              alt="Analyzed skin"
                              width={600}
                              height={220}
                              className="w-full object-contain rounded-lg"
                              style={{ maxHeight: '220px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 px-4 sm:px-6 py-4 border-t">
                  <Button variant="outline" onClick={resetAll} id="analyze-another-btn" className="w-full sm:w-auto">
                    Analyze Another Area
                  </Button>
                  <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="secondary" onClick={() => (window.location.href = '/dashboard/analysis/history')} id="view-history-btn" className="w-full xs:w-auto">
                      <Clock className="h-4 w-4 mr-2" /> View History
                    </Button>
                    {result.severity !== 'None' && result.severity !== 'Low' && (
                      <Button onClick={() => (window.location.href = '/dashboard/appointments')} id="book-consultation-btn"
                        className="w-full xs:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                        Book Consultation
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
