"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Loader2, SwitchCamera, ZapOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BODY_PARTS } from "@/lib/skin-disease-db"

type CameraState = 'IDLE' | 'LOADING' | 'VALIDATING' | 'WRONG_PART' | 'POSITIONING' | 'ACCEPTED' | 'CAPTURED' | 'DENIED' | 'NO_CAMERA'

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

function captureFrameAsBase64(video: HTMLVideoElement, width = 320, height = 240): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
}

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

  // Ring color based on state
  const colorMap: Record<string, string> = {
    VALIDATING: 'rgba(150,150,150,0.9)',
    WRONG_PART: 'rgba(239,68,68,0.95)',
    POSITIONING: 'rgba(234,179,8,0.95)',
    ACCEPTED: 'rgba(34,197,94,0.95)',
    LOADING: 'rgba(150,150,150,0.8)',
    IDLE: 'rgba(150,150,150,0.8)',
  }
  const color = colorMap[state] || 'rgba(150,150,150,0.9)'

  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.setLineDash(state === 'ACCEPTED' ? [] : [12, 6])

  const w = canvas.width
  const h = canvas.height

  // Draw shape
  if (overlayShape === 'oval') {
    const rx = (w * 0.38) * pulse
    const ry = (h * 0.42) * pulse
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (overlayShape === 'rectangle-tall') {
    const rw = w * 0.45 * pulse
    const rh = h * 0.72 * pulse
    const r = 20
    ctx.beginPath()
    ctx.moveTo(cx - rw + r, cy - rh)
    ctx.arcTo(cx + rw, cy - rh, cx + rw, cy + rh, r)
    ctx.arcTo(cx + rw, cy + rh, cx - rw, cy + rh, r)
    ctx.arcTo(cx - rw, cy + rh, cx - rw, cy - rh, r)
    ctx.arcTo(cx - rw, cy - rh, cx + rw, cy - rh, r)
    ctx.closePath()
    ctx.stroke()
  } else if (overlayShape === 'square') {
    const sz = Math.min(w, h) * 0.55 * pulse
    const r = 16
    ctx.beginPath()
    ctx.moveTo(cx - sz + r, cy - sz)
    ctx.arcTo(cx + sz, cy - sz, cx + sz, cy + sz, r)
    ctx.arcTo(cx + sz, cy + sz, cx - sz, cy + sz, r)
    ctx.arcTo(cx - sz, cy + sz, cx - sz, cy - sz, r)
    ctx.arcTo(cx - sz, cy - sz, cx + sz, cy - sz, r)
    ctx.closePath()
    ctx.stroke()
  } else {
    const radius = Math.min(w, h) * 0.35 * pulse
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Corner viewfinder markers
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

  // Status dot top-center
  if (state === 'ACCEPTED') {
    const dotAlpha = 0.7 + Math.sin(tick * 0.15) * 0.3
    ctx.fillStyle = `rgba(34,197,94,${dotAlpha})`
    ctx.beginPath()
    ctx.arc(cx, 28, 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function CameraCapture({ bodyPart, onCapture }: CameraCaptureProps) {
  const [cameraState, setCameraState] = useState<CameraState>('IDLE')
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    const part = BODY_PARTS.find(p => p.id === bodyPart)
    return part?.facingMode || 'environment'
  })
  const [tick, setTick] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animFrameRef = useRef<number>(0)
  const tickRef = useRef(0)

  const bodyPartInfo = BODY_PARTS.find(p => p.id === bodyPart)
  const overlayShape = bodyPartInfo?.overlayShape || 'circle'

  // Animation loop for overlay
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

  // Set canvas size to match video
  const syncCanvasSize = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth || 640
      canvasRef.current.height = videoRef.current.videoHeight || 480
    }
  }, [])

  const startCamera = useCallback(async () => {
    setCameraState('LOADING')
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
  }, [])

  useEffect(() => { return () => stopCamera() }, [stopCamera])

  // Real-time frame validation ticker (every 2s)
  useEffect(() => {
    if (cameraState !== 'VALIDATING' && cameraState !== 'WRONG_PART' && cameraState !== 'POSITIONING' && cameraState !== 'ACCEPTED') {
      if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
      return
    }

    const runValidation = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
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

        if (data.ready_to_capture) setCameraState('ACCEPTED')
        else if (!data.matches_expected || !data.is_skin_visible) setCameraState('WRONG_PART')
        else setCameraState('POSITIONING')
      } catch { /* ignore */ }
    }

    runValidation()
    validationIntervalRef.current = setInterval(runValidation, 2500)
    return () => { if (validationIntervalRef.current) clearInterval(validationIntervalRef.current) }
  }, [cameraState, bodyPart])

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
    setCameraState('CAPTURED')
  }, [bodyPart])

  const handleConfirm = useCallback(() => {
    if (capturedFile) onCapture(capturedFile)
  }, [capturedFile, onCapture])

  const handleRetake = useCallback(() => {
    setCapturedPreview(null)
    setCapturedFile(null)
    setCameraState('VALIDATING')
    if (validationIntervalRef.current) clearInterval(validationIntervalRef.current)
  }, [])

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    startCamera()
  }, [startCamera])

  // Status bar config
  const statusConfig = {
    IDLE:        { color: 'bg-gray-500', text: 'Enable camera to begin scanning', icon: <Camera className="h-4 w-4" /> },
    LOADING:     { color: 'bg-blue-500', text: 'Starting camera...', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    VALIDATING:  { color: 'bg-gray-400', text: 'AI is analyzing your frame...', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    WRONG_PART:  { color: 'bg-red-500', text: validation?.guidance_message || `Point camera at your ${bodyPartInfo?.label}`, icon: <AlertCircle className="h-4 w-4" /> },
    POSITIONING: { color: 'bg-yellow-500', text: validation?.guidance_message || `Skin detected ✓ — Position the lesion inside the ring`, icon: <ZapOff className="h-4 w-4" /> },
    ACCEPTED:    { color: 'bg-emerald-500', text: '✅ Photo Accepted — Press Capture!', icon: <CheckCircle2 className="h-4 w-4" /> },
    CAPTURED:    { color: 'bg-teal-500', text: 'Image captured — confirm or retake', icon: <CheckCircle2 className="h-4 w-4" /> },
    DENIED:      { color: 'bg-red-600', text: 'Camera access denied', icon: <AlertCircle className="h-4 w-4" /> },
    NO_CAMERA:   { color: 'bg-orange-500', text: 'No camera found', icon: <AlertCircle className="h-4 w-4" /> },
  }
  const status = statusConfig[cameraState]

  return (
    <div className="flex flex-col gap-4">
      {/* Body part header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{bodyPartInfo?.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Scanning: {bodyPartInfo?.label}</p>
            <p className="text-xs text-muted-foreground">Using AI body-part verification</p>
          </div>
        </div>
        {(cameraState === 'VALIDATING' || cameraState === 'WRONG_PART' || cameraState === 'POSITIONING' || cameraState === 'ACCEPTED') && (
          <Button variant="outline" size="sm" onClick={toggleCamera} id="switch-camera-btn">
            <SwitchCamera className="h-4 w-4 mr-1" /> Switch
          </Button>
        )}
      </div>

      {/* Status Bar */}
      <motion.div
        key={cameraState}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium ${status.color}`}
      >
        {status.icon}
        <span>{status.text}</span>
      </motion.div>

      {/* Camera / Preview Area */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-800" style={{ aspectRatio: '4/3' }}>
        {/* Video element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraState === 'CAPTURED' ? 'hidden' : ''}`}
          playsInline
          muted
          autoPlay
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

        {/* Idle overlay */}
        {cameraState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900">
            <div className="p-6 rounded-full bg-gray-800 border-2 border-gray-700">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">Camera preview will appear here</p>
          </div>
        )}

        {/* Denied overlay */}
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

        {/* Accepted pulse glow */}
        {cameraState === 'ACCEPTED' && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border-4 border-emerald-400 rounded-2xl pointer-events-none"
          />
        )}
      </div>

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
              <Camera className="mr-2 h-5 w-5" />
              Enable Camera
            </Button>
          </motion.div>
        )}

        {(['VALIDATING', 'WRONG_PART', 'POSITIONING', 'ACCEPTED'] as CameraState[]).includes(cameraState) && (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <Button
              id="capture-btn"
              onClick={handleCapture}
              disabled={cameraState !== 'ACCEPTED'}
              size="lg"
              className={`w-full py-6 text-base font-semibold transition-all ${
                cameraState === 'ACCEPTED'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 scale-105'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Camera className={`mr-2 h-5 w-5 ${cameraState === 'ACCEPTED' ? 'animate-pulse' : ''}`} />
              {cameraState === 'ACCEPTED' ? '📸 Capture Photo' : 'Waiting for AI validation...'}
            </Button>

            {cameraState !== 'ACCEPTED' && (
              <p className="text-xs text-center text-muted-foreground">
                AI is checking: correct body part + visible skin + good lighting
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
              <Button
                id="retake-btn"
                variant="outline"
                onClick={handleRetake}
                size="lg"
                className="py-5"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                id="confirm-capture-btn"
                onClick={handleConfirm}
                size="lg"
                className="py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
