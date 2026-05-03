"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  SwitchCamera, ZapOff, Sun, Eye, Move, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BODY_PARTS } from "@/lib/skin-disease-db"

type CameraState =
  | 'IDLE' | 'LOADING' | 'VALIDATING' | 'WRONG_PART'
  | 'POSITIONING' | 'ACCEPTED' | 'CAPTURED' | 'DENIED'
  | 'NO_CAMERA' | 'MANUAL_READY'

interface ValidationResult {
  is_skin_visible: boolean
  detected_body_part: string
  matches_expected: boolean
  lesion_visible: boolean
  image_quality: string
  ready_to_capture: boolean
  guidance_message: string
}

interface CameraCaptureProps {
  bodyPart: string
  onCapture: (file: File) => void
}

// ─── Tip slides shown while waiting ───────────────────────────────────────────
const TIPS = [
  { icon: Sun,  color: '#f59e0b', title: 'Good Lighting', text: 'Move to a bright area or face a window. Avoid shadows on the skin.' },
  { icon: Eye,  color: '#06b6d4', title: 'Hold Still',    text: 'Keep your hand steady. Rest your elbow on a surface if needed.' },
  { icon: Move, color: '#8b5cf6', title: 'Fill the Ring', text: 'Bring the lesion close so it fills at least 50% of the ring guide.' },
  { icon: Zap,  color: '#10b981', title: 'Clean Skin',    text: 'Wipe skin dry. Remove any cream, bandage, or covering beforehand.' },
]

// ─── Local frame-quality score (brightness + blur) — pure client-side ─────────
function analyzeFrameLocally(
  video: HTMLVideoElement
): { brightness: number; isBlurry: boolean; isDark: boolean; isBright: boolean; tip: string | null } {
  const canvas = document.createElement('canvas')
  canvas.width = 80
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  if (!ctx) return { brightness: 128, isBlurry: false, isDark: false, isBright: false, tip: null }

  ctx.drawImage(video, 0, 0, 80, 60)
  const { data } = ctx.getImageData(0, 0, 80, 60)

  let sum = 0
  let varSum = 0
  const samples: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    sum += lum
    samples.push(lum)
  }
  const avg = sum / samples.length
  for (const v of samples) varSum += (v - avg) ** 2
  const stddev = Math.sqrt(varSum / samples.length)

  const isDark = avg < 55
  const isBright = avg > 210
  const isBlurry = stddev < 18   // low variance = low texture = blurry / flat

  let tip: string | null = null
  if (isDark)    tip = '🌑 Too dark — move to better lighting or turn on a lamp.'
  else if (isBright) tip = '☀️ Too bright — avoid direct sunlight or bright flash.'
  else if (isBlurry) tip = '📷 Image is blurry — hold the camera steady and closer.'

  return { brightness: avg, isBlurry, isDark, isBright, tip }
}

// ─── Capture frame as base64 ──────────────────────────────────────────────────
function captureFrameAsBase64(video: HTMLVideoElement, width = 320, height = 240): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
}

// ─── Overlay drawing ──────────────────────────────────────────────────────────
function drawOverlay(
  canvas: HTMLCanvasElement,
  state: CameraState,
  overlayShape: 'oval' | 'rectangle-tall' | 'square' | 'circle',
  tick: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const pulse = 0.97 + Math.sin(tick * 0.08) * 0.03

  const colorMap: Record<string, string> = {
    VALIDATING:   'rgba(150,150,150,0.9)',
    WRONG_PART:   'rgba(239,68,68,0.95)',
    POSITIONING:  'rgba(234,179,8,0.95)',
    ACCEPTED:     'rgba(34,197,94,0.95)',
    MANUAL_READY: 'rgba(99,102,241,0.95)',
    LOADING:      'rgba(150,150,150,0.8)',
    IDLE:         'rgba(150,150,150,0.8)',
  }
  const color = colorMap[state] || 'rgba(150,150,150,0.9)'

  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.setLineDash(state === 'ACCEPTED' || state === 'MANUAL_READY' ? [] : [12, 6])

  const w = canvas.width
  const h = canvas.height

  if (overlayShape === 'oval') {
    const rx = (w * 0.38) * pulse
    const ry = (h * 0.42) * pulse
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
  } else if (overlayShape === 'rectangle-tall') {
    const rw = w * 0.45 * pulse; const rh = h * 0.72 * pulse; const r = 20
    ctx.beginPath()
    ctx.moveTo(cx - rw + r, cy - rh)
    ctx.arcTo(cx + rw, cy - rh, cx + rw, cy + rh, r)
    ctx.arcTo(cx + rw, cy + rh, cx - rw, cy + rh, r)
    ctx.arcTo(cx - rw, cy + rh, cx - rw, cy - rh, r)
    ctx.arcTo(cx - rw, cy - rh, cx + rw, cy - rh, r)
    ctx.closePath(); ctx.stroke()
  } else if (overlayShape === 'square') {
    const sz = Math.min(w, h) * 0.55 * pulse; const r = 16
    ctx.beginPath()
    ctx.moveTo(cx - sz + r, cy - sz)
    ctx.arcTo(cx + sz, cy - sz, cx + sz, cy + sz, r)
    ctx.arcTo(cx + sz, cy + sz, cx - sz, cy + sz, r)
    ctx.arcTo(cx - sz, cy + sz, cx - sz, cy - sz, r)
    ctx.arcTo(cx - sz, cy - sz, cx + sz, cy - sz, r)
    ctx.closePath(); ctx.stroke()
  } else {
    const radius = Math.min(w, h) * 0.35 * pulse
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke()
  }

  // Corner markers
  ctx.setLineDash([])
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  const mLen = 22
  const corners = [
    [0.08 * w, 0.08 * h], [0.92 * w, 0.08 * h],
    [0.08 * w, 0.92 * h], [0.92 * w, 0.92 * h],
  ]
  corners.forEach(([x, y], i) => {
    const dx = i % 2 === 0 ? 1 : -1
    const dy = i < 2 ? 1 : -1
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * mLen, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dy * mLen); ctx.stroke()
  })

  // Green dot on accepted
  if (state === 'ACCEPTED' || state === 'MANUAL_READY') {
    const dotAlpha = 0.7 + Math.sin(tick * 0.15) * 0.3
    const dotColor = state === 'MANUAL_READY' ? `rgba(99,102,241,${dotAlpha})` : `rgba(34,197,94,${dotAlpha})`
    ctx.fillStyle = dotColor
    ctx.beginPath(); ctx.arc(cx, 28, 8, 0, Math.PI * 2); ctx.fill()
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CameraCapture({ bodyPart, onCapture }: CameraCaptureProps) {
  const [cameraState, setCameraState] = useState<CameraState>('IDLE')
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [localTip, setLocalTip] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [validationElapsed, setValidationElapsed] = useState(0)   // seconds since validating started
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    const part = BODY_PARTS.find(p => p.id === bodyPart)
    return part?.facingMode || 'environment'
  })
  const [tick, setTick] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animFrameRef = useRef<number>(0)
  const tickRef = useRef(0)

  const bodyPartInfo = BODY_PARTS.find(p => p.id === bodyPart)
  const overlayShape = bodyPartInfo?.overlayShape || 'circle'

  // ── Animation loop
  const animate = useCallback(() => {
    tickRef.current++
    setTick(tickRef.current)
    if (canvasRef.current && videoRef.current) {
      drawOverlay(canvasRef.current, cameraState, overlayShape, tickRef.current)
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [cameraState, overlayShape])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [animate])

  const syncCanvasSize = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 640
      canvasRef.current.height = videoRef.current.videoHeight || 480
    }
  }, [])

  // ── Start camera
  const startCamera = useCallback(async () => {
    setCameraState('LOADING')
    setValidationElapsed(0)
    setLocalTip(null)
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          syncCanvasSize()
          setCameraState('VALIDATING')
        }
      }
    } catch (err: unknown) {
      const e = err as { name?: string }
      if (e?.name === 'NotAllowedError') setCameraState('DENIED')
      else if (e?.name === 'NotFoundError') setCameraState('NO_CAMERA')
      else setCameraState('DENIED')
    }
  }, [facingMode, syncCanvasSize])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
    if (elapsedIntervalRef.current)    clearInterval(elapsedIntervalRef.current)
    if (tipIntervalRef.current)        clearInterval(tipIntervalRef.current)
  }, [])

  useEffect(() => { return () => stopCamera() }, [stopCamera])

  // ── Tips carousel (cycle every 4s while in validation states)
  useEffect(() => {
    const isValidating = ['VALIDATING', 'WRONG_PART', 'POSITIONING'].includes(cameraState)
    if (!isValidating) {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current)
      return
    }
    tipIntervalRef.current = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length)
    }, 4000)
    return () => { if (tipIntervalRef.current) clearInterval(tipIntervalRef.current) }
  }, [cameraState])

  // ── Elapsed time counter (triggers manual-unlock at 15s)
  useEffect(() => {
    const isValidating = ['VALIDATING', 'WRONG_PART', 'POSITIONING'].includes(cameraState)
    if (!isValidating) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
      setValidationElapsed(0)
      return
    }
    elapsedIntervalRef.current = setInterval(() => {
      setValidationElapsed(prev => {
        const next = prev + 1
        // After 15 s of no result → unlock manual capture
        if (next >= 15) {
          setCameraState(s => {
            if (s === 'VALIDATING' || s === 'WRONG_PART' || s === 'POSITIONING') return 'MANUAL_READY'
            return s
          })
        }
        return next
      })
    }, 1000)
    return () => { if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current) }
  }, [cameraState])

  // ── Real-time frame validation (every 2s, parallel: local check + API)
  useEffect(() => {
    const active: CameraState[] = ['VALIDATING', 'WRONG_PART', 'POSITIONING', 'ACCEPTED']
    if (!active.includes(cameraState)) {
      if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
      return
    }

    const runValidation = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return

      // 1. Local quality check (instant, no network)
      const local = analyzeFrameLocally(videoRef.current)
      setLocalTip(local.tip)

      // 2. Skip API call if obviously bad frame — saves latency
      if (local.isDark || local.isBright) {
        setCameraState('POSITIONING')
        return
      }

      // 3. API call
      try {
        const thumb = captureFrameAsBase64(videoRef.current, 320, 240)
        if (!thumb) return
        const res = await fetch('/api/validate-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: thumb, expectedBodyPart: bodyPart }),
        })
        if (!res.ok) return
        const data: ValidationResult = await res.json()
        setValidation(data)

        if (data.ready_to_capture) {
          setCameraState('ACCEPTED')
        } else if (!data.matches_expected || !data.is_skin_visible) {
          setCameraState('WRONG_PART')
        } else {
          setCameraState('POSITIONING')
        }
      } catch { /* ignore network errors */ }
    }

    runValidation()
    validationIntervalRef.current = setInterval(runValidation, 2000)
    return () => { if (validationIntervalRef.current) clearInterval(validationIntervalRef.current) }
  }, [cameraState, bodyPart])

  // ── Capture
  const handleCapture = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1280
    canvas.height = videoRef.current.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedPreview(dataUrl)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `dermasense-${bodyPart}-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setCapturedFile(file)
    }, 'image/jpeg', 0.92)
    if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
    if (elapsedIntervalRef.current)    clearInterval(elapsedIntervalRef.current)
    setCameraState('CAPTURED')
  }, [bodyPart])

  const handleConfirm  = useCallback(() => { if (capturedFile) onCapture(capturedFile) }, [capturedFile, onCapture])
  const handleRetake   = useCallback(() => {
    setCapturedPreview(null); setCapturedFile(null)
    setValidationElapsed(0); setLocalTip(null)
    setCameraState('VALIDATING')
    if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
  }, [])

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  // Restart camera whenever facingMode changes
  useEffect(() => {
    if (cameraState !== 'IDLE' && cameraState !== 'CAPTURED' && cameraState !== 'DENIED' && cameraState !== 'NO_CAMERA') {
      startCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  // ── Status bar config
  const getStatusMsg = () => {
    if (localTip && (cameraState === 'VALIDATING' || cameraState === 'POSITIONING' || cameraState === 'WRONG_PART')) {
      return localTip
    }
    if (validation?.guidance_message && cameraState === 'WRONG_PART') return validation.guidance_message
    if (validation?.guidance_message && cameraState === 'POSITIONING') return validation.guidance_message
    const defaults: Partial<Record<CameraState, string>> = {
      IDLE:         'Enable camera to begin scanning',
      LOADING:      'Starting camera…',
      VALIDATING:   'AI is checking your frame…',
      WRONG_PART:   `Point your camera at your ${bodyPartInfo?.label}`,
      POSITIONING:  'Skin detected ✓ — move lesion into the ring',
      ACCEPTED:     '✅ Perfect shot — press Capture!',
      MANUAL_READY: '📸 Ready to capture manually — press the button',
      CAPTURED:     'Image captured — confirm or retake',
      DENIED:       'Camera access denied',
      NO_CAMERA:    'No camera found',
    }
    return defaults[cameraState] || ''
  }

  const statusColorMap: Record<CameraState, string> = {
    IDLE:         'bg-gray-500',
    LOADING:      'bg-blue-500',
    VALIDATING:   'bg-gray-400',
    WRONG_PART:   'bg-red-500',
    POSITIONING:  'bg-yellow-500',
    ACCEPTED:     'bg-emerald-500',
    MANUAL_READY: 'bg-indigo-500',
    CAPTURED:     'bg-teal-500',
    DENIED:       'bg-red-600',
    NO_CAMERA:    'bg-orange-500',
  }

  const statusIconMap: Record<CameraState, React.ReactNode> = {
    IDLE:         <Camera className="h-4 w-4" />,
    LOADING:      <Loader2 className="h-4 w-4 animate-spin" />,
    VALIDATING:   <Loader2 className="h-4 w-4 animate-spin" />,
    WRONG_PART:   <AlertCircle className="h-4 w-4" />,
    POSITIONING:  <ZapOff className="h-4 w-4" />,
    ACCEPTED:     <CheckCircle2 className="h-4 w-4" />,
    MANUAL_READY: <CheckCircle2 className="h-4 w-4" />,
    CAPTURED:     <CheckCircle2 className="h-4 w-4" />,
    DENIED:       <AlertCircle className="h-4 w-4" />,
    NO_CAMERA:    <AlertCircle className="h-4 w-4" />,
  }

  const isLiveState = (['VALIDATING', 'WRONG_PART', 'POSITIONING', 'ACCEPTED', 'MANUAL_READY'] as CameraState[]).includes(cameraState)
  const canCapture  = cameraState === 'ACCEPTED' || cameraState === 'MANUAL_READY'
  const tip = TIPS[tipIndex]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{bodyPartInfo?.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Scanning: {bodyPartInfo?.label}</p>
            <p className="text-xs text-muted-foreground">Using AI body-part verification</p>
          </div>
        </div>
        {isLiveState && (
          <Button variant="outline" size="sm" onClick={toggleCamera} id="switch-camera-btn">
            <SwitchCamera className="h-4 w-4 mr-1" /> Switch
          </Button>
        )}
      </div>

      {/* Status Bar */}
      <motion.div
        key={cameraState + localTip}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium ${statusColorMap[cameraState]}`}
      >
        {statusIconMap[cameraState]}
        <span>{getStatusMsg()}</span>
      </motion.div>

      {/* Camera / Preview */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-800" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraState === 'CAPTURED' ? 'hidden' : ''}`}
          playsInline muted autoPlay
        />

        {/* Canvas overlay */}
        {cameraState !== 'IDLE' && cameraState !== 'DENIED' && cameraState !== 'NO_CAMERA' && cameraState !== 'CAPTURED' && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: 'cover' }}
          />
        )}

        {/* Captured preview */}
        {cameraState === 'CAPTURED' && capturedPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedPreview} alt="Captured skin lesion" className="w-full h-full object-cover" />
        )}

        {/* Idle */}
        {cameraState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900">
            <div className="p-6 rounded-full bg-gray-800 border-2 border-gray-700">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">Camera preview will appear here</p>
          </div>
        )}

        {/* Denied / no camera */}
        {(cameraState === 'DENIED' || cameraState === 'NO_CAMERA') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="text-white font-semibold">
              {cameraState === 'DENIED' ? 'Camera Access Denied' : 'No Camera Found'}
            </p>
            <p className="text-gray-400 text-sm max-w-xs">
              {cameraState === 'DENIED'
                ? 'Please allow camera access in your browser settings (click the lock icon in the address bar), then refresh the page.'
                : 'No camera was detected on this device. Please use the Upload Image tab instead.'}
            </p>
          </div>
        )}

        {/* ACCEPTED glow */}
        {(cameraState === 'ACCEPTED') && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border-4 border-emerald-400 rounded-2xl pointer-events-none"
          />
        )}

        {/* MANUAL_READY glow (indigo) */}
        {cameraState === 'MANUAL_READY' && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border-4 border-indigo-400 rounded-2xl pointer-events-none"
          />
        )}

        {/* Elapsed progress bar (only while validating) */}
        {isLiveState && cameraState !== 'ACCEPTED' && cameraState !== 'MANUAL_READY' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/60">
            <motion.div
              className="h-full bg-yellow-400"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min((validationElapsed / 15) * 100, 100)}%` }}
              transition={{ duration: 0.9, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Tips carousel — shown while waiting for validation */}
      <AnimatePresence mode="wait">
        {isLiveState && cameraState !== 'ACCEPTED' && cameraState !== 'MANUAL_READY' && (
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60"
          >
            <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: tip.color + '22' }}>
              <tip.icon className="h-4 w-4" style={{ color: tip.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{tip.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tip.text}</p>
            </div>
            {/* dot indicators */}
            <div className="ml-auto flex gap-1 items-center shrink-0">
              {TIPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === tipIndex ? 14 : 6,
                    height: 6,
                    backgroundColor: i === tipIndex ? tip.color : '#d1d5db',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence mode="wait">
        {cameraState === 'IDLE' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              id="enable-camera-btn"
              onClick={startCamera}
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6 text-base shadow-lg"
            >
              <Camera className="mr-2 h-5 w-5" /> Enable Camera
            </Button>
          </motion.div>
        )}

        {isLiveState && (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Button
              id="capture-btn"
              onClick={handleCapture}
              disabled={!canCapture}
              size="lg"
              className={`w-full py-6 text-base font-semibold transition-all ${
                canCapture
                  ? cameraState === 'MANUAL_READY'
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg scale-105'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 scale-105'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Camera className={`mr-2 h-5 w-5 ${canCapture ? 'animate-pulse' : ''}`} />
              {canCapture
                ? cameraState === 'MANUAL_READY' ? '📸 Capture Manually' : '📸 Capture Photo'
                : 'Waiting for AI validation…'}
            </Button>

            {/* Manual unlock hint */}
            {!canCapture && (
              <p className="text-xs text-center text-muted-foreground">
                {validationElapsed < 15
                  ? `AI is checking: correct body part + visible skin + good lighting · auto-unlock in ${15 - validationElapsed}s`
                  : 'AI validation unavailable — manual capture enabled'}
              </p>
            )}
          </motion.div>
        )}

        {cameraState === 'CAPTURED' && (
          <motion.div key="captured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              Is this image clear and centered on the lesion?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button id="retake-btn" variant="outline" onClick={handleRetake} size="lg" className="py-5">
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button
                id="confirm-capture-btn"
                onClick={handleConfirm}
                size="lg"
                className="py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
