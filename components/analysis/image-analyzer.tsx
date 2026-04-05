"use client"

import type React from "react"
import { useState, useRef } from "react"
import { 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Stethoscope,
  AlertTriangle,
  Volume2,
  Download,
  Clock,
  Brain
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// Add medical history context import
import { useMedicalHistory } from "@/contexts/MedicalHistoryContext"

const COLORS = ['#4ade80', '#facc15', '#f97316', '#ef4444', '#60a5fa', '#a78bfa', '#f472b6']

// Doctor specialist mapping for different conditions
const DOCTOR_MAP: Record<string, string[]> = {
  akiec: ['Dr. Meera Iyer', 'Dr. Rohan Desai'],
  bcc: ['Dr. Shalini Verma', 'Dr. Ayaan Kapoor'],
  bkl: ['Dr. Anjali Nair', 'Dr. Sunil Menon'],
  df: ['Dr. Ravi Nandakumar', 'Dr. Nisha Shetty'],
  mel: ['Dr. Arvind Krishnan', 'Dr. Reema Gupta'],
  nv: ['Dr. Karthik Reddy', 'Dr. Sneha Sharma'],
  vasc: ['Dr. Priya Mehta', 'Dr. Rajiv Bhatia'],
  carcinoma: ['Dr. Shalini Verma', 'Dr. Ayaan Kapoor']
}

const DISEASE_INFO: Record<string, string> = {
  akiec: "Actinic keratoses are rough, scaly patches caused by long-term sun exposure. They are considered precancerous and may develop into squamous cell carcinoma.",
  bcc: "Basal cell carcinoma is the most common type of skin cancer. It's usually caused by UV exposure and grows slowly, rarely spreading.",
  bkl: "Benign keratosis includes various non-cancerous skin growths such as seborrheic keratoses. Generally harmless.",
  df: "Dermatofibroma is a common benign skin nodule, often arising due to minor skin injuries or insect bites.",
  mel: "Melanoma is the most serious type of skin cancer. It develops from melanocytes and can spread rapidly if not detected early.",
  nv: "Melanocytic nevus (mole) is a benign skin lesion composed of pigment-producing cells. While mostly harmless, some can become cancerous.",
  vasc: "Vascular lesions are abnormalities of blood vessels that appear as red or purple marks. Most are harmless but should be observed.",
  carcinoma: "Carcinoma is a type of cancer that starts in cells that make up the skin or the tissue lining organs. Early detection and treatment significantly improve outcomes."
}

const PRECAUTIONS: Record<string, string[]> = {
  mel: ["Regularly use broad-spectrum sunscreen.", "Avoid tanning beds.", "Schedule routine skin checks.", "Wear protective clothing outdoors."],
  bcc: ["Protect your skin from sun exposure.", "Check for new or changing lesions.", "Seek early evaluation for suspicious spots."],
  vasc: ["Avoid trauma to the skin.", "Manage blood pressure and vascular health.", "Consult a specialist if changes occur."],
  carcinoma: ["Use sunscreen daily with SPF 30 or higher.", "Perform regular skin self-examinations.", "Avoid tanning beds completely.", "Wear protective clothing and seek shade."]
}

// Common symptoms for different skin conditions
const SYMPTOMS: Record<string, string[]> = {
  mel: ["Irregular moles", "Changing color or border", "Asymmetry", "Bleeding or crusting"],
  bcc: ["Pearly bump", "Flat scar-like area", "Open sores that don't heal"],
  vasc: ["Red-purple spots", "Painless lesion", "Occasional swelling"],
  akiec: ["Rough, scaly patches", "Redness", "Sometimes itching or burning", "Persistent dryness"],
  df: ["Small, firm bump", "Pink to light brown color", "Slight dimpling", "Mostly painless"],
  nv: ["Well-defined border", "Even coloration", "Round or oval shape", "Generally symmetrical"],
  carcinoma: ["Non-healing sore", "Reddish patch", "Shiny bump or nodule", "Growth with elevated rolled border"]
}

// Treatment options for different conditions
const TREATMENTS: Record<string, string[]> = {
  mel: ["Surgical removal", "Immunotherapy", "Targeted therapy", "Chemotherapy (advanced cases)"],
  bcc: ["Cryotherapy", "Mohs surgery", "Topical medications", "Photodynamic therapy"],
  vasc: ["Observation", "Laser treatment", "Sclerotherapy", "Compression therapy"],
  akiec: ["Cryotherapy", "Topical treatments", "Photodynamic therapy", "Curettage and electrodesiccation"],
  df: ["Observation", "Surgical removal if desired", "Cryotherapy", "Laser therapy"],
  nv: ["Regular monitoring", "Surgical removal if suspicious", "Shave removal", "Punch excision"],
  carcinoma: ["Mohs surgery", "Radiation therapy", "Immunotherapy", "Targeted drug therapy"]
}

// Add this additional data mapping for risk levels
const RISK_LEVEL: Record<string, { risk: string; action: string }> = {
  akiec: { risk: 'High', action: 'Consult a dermatologist to monitor or treat early signs of skin cancer.' },
  bcc: { risk: 'Medium', action: 'Seek evaluation for potential treatment even if non-urgent.' },
  bkl: { risk: 'Low', action: 'Monitor but no immediate treatment needed.' },
  df: { risk: 'Low', action: 'Benign condition. No treatment typically required.' },
  mel: { risk: 'Very High', action: 'Seek immediate medical attention. This condition can be life-threatening.' },
  nv: { risk: 'Medium', action: 'Have it evaluated if it changes in size or color.' },
  vasc: { risk: 'Low', action: 'No treatment usually necessary unless aesthetic or symptomatic.' },
  carcinoma: { risk: 'Very High', action: 'Seek immediate medical attention. This condition requires specialist care.' }
}

type PredictionResult = {
  prediction: string
  confidence: number
  class_probabilities: Record<string, number>
  heatmap_image: string
  details?: {
    name: string
    emoji: string
    risk: string
    urgency: string
    info: string
    action: string
    color: string
  }
}

export function ImageAnalyzer() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisSaved, setAnalysisSaved] = useState(false) // Add this state variable
  const fileInputRef = useRef<HTMLInputElement>(null)
  const analysisRef = useRef<HTMLDivElement>(null)

  // Add medical history context
  const { refreshHistory } = useMedicalHistory()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a JPEG or PNG image.",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please upload an image smaller than 5MB.",
      })
      return
    }
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a JPEG or PNG image.",
      })
      return
    }

    setFileName(file.name)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
    setResult(null)
    setError(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setError(null)
    setAnalysisSaved(false) // Reset saved state

    try {
      // Create FormData and append the file directly
      const formData = new FormData()
      formData.append("file", selectedFile)

      // Send to API
      const res = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to analyze image")
      }

      const data = await res.json()
      setResult(data)

      // Refresh medical history to include the new analysis saved by the server
      refreshHistory()
      setAnalysisSaved(true) // Mark as saved

      // Show success toast
      if (data.prediction === "Carcinoma") {
        toast.error("Analysis Complete", {
          description: `Prediction: ${data.prediction} with ${(data.confidence * 100).toFixed(2)}% confidence`,
        })
      } else {
        toast.success("Analysis Complete", {
          description: `Prediction: ${data.prediction} with ${(data.confidence * 100).toFixed(2)}% confidence`,
        })
      }
    } catch (err) {
      toast.error("Analysis Failed", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setSelectedImage(null)
    setSelectedFile(null)
    setFileName("")
    setResult(null)
    setError(null)
    setAnalysisSaved(false) // Reset saved state
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Update the PDF export function with Carcino branding
  const exportToPDF = async () => {
    if (analysisRef.current) {
      const { default: html2pdf } = await import('html2pdf.js')

      // Define types for html2pdf options
      interface Html2PdfOptions {
        margin: [number, number, number, number];
        filename: string;
        html2canvas: { scale: number };
        jsPDF: { unit: string; format: string; orientation: string };
        pagebreak: { mode: string[] };
      }
      
      // Define type for PDF object
      interface PdfDocument {
        internal: {
          getNumberOfPages: () => number;
        };
        setPage: (pageNum: number) => void;
        setFontSize: (size: number) => void;
        setTextColor: (color: number) => void;
        text: (text: string, x: number, y: number, options?: { angle: number }) => void;
      }

      // Configure and generate PDF
      html2pdf()
        .set({
          margin: [0.5, 0.5, 1, 0.5],
          filename: 'Carcino_AI_Analysis.pdf',
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] }
        } as Html2PdfOptions)
        .from(analysisRef.current)
        .toPdf()
        .get('pdf')
        .then((pdf: PdfDocument) => {
          const pageCount: number = pdf.internal.getNumberOfPages();
          for (let i: number = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            pdf.text('Generated by Carcino AI Platform', 0.5, 10.75);
            pdf.setFontSize(30);
            pdf.setTextColor(200);
            pdf.text('AI', 4, 5, { angle: 45 });
          }
        })
        .save();
    }
  }

  // Get assigned specialists if available
  const assignedDoctors = result ? 
    DOCTOR_MAP[result.prediction.toLowerCase()] || [] : [];

  // Get condition-specific information
  const diseaseInfo = result ? 
    DISEASE_INFO[result.prediction.toLowerCase()] || "No detailed information available." : "";

  // Get symptoms if available
  const symptoms = result ? 
    SYMPTOMS[result.prediction.toLowerCase()] || [] : [];
  
  // Get treatments if available
  const treatments = result ? 
    TREATMENTS[result.prediction.toLowerCase()] || [] : [];

  // Get precautions if available
  const precautions = result ? 
    PRECAUTIONS[result.prediction.toLowerCase()] || [] : [];

  // Add this function for speech synthesis
  const speakSummary = () => {
    if (!result) return;
    
    const predictionKey = result.prediction.toLowerCase();
    const riskData = RISK_LEVEL[predictionKey] || { 
      risk: 'Unknown', 
      action: 'Please consult a specialist for more info.' 
    };
    
    const summary = `Condition: ${result.details?.name || result.prediction}. 
                     Confidence: ${(result.confidence * 100).toFixed(1)} percent. 
                     Risk Level: ${riskData.risk}. 
                     Recommendation: ${riskData.action}`;
    
    const utterance = new SpeechSynthesisUtterance(summary);
    window.speechSynthesis.speak(utterance);
  };

  // Get risk data if available
  const riskData = result ? 
    RISK_LEVEL[result.prediction.toLowerCase()] || 
    { risk: 'Unknown', action: 'Please consult a specialist for more info.' } : 
    { risk: '', action: '' };

  return (
    <div className="space-y-6">
      {/* Upload Image Card */}
      <Card className="border-2 border-emerald-100 dark:border-emerald-900/30 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
        <CardHeader className="bg-gradient-to-br from-white to-emerald-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-emerald-900 dark:text-emerald-100">Skin Condition Analysis</CardTitle>
              <CardDescription className="text-emerald-700 dark:text-emerald-300">Upload an image for AI-powered analysis and instant results</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all duration-300 ${
              selectedImage 
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20" 
                : "border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {!selectedImage ? (
              <>
                <div className="mb-6 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 p-6 shadow-lg">
                  <Upload className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-emerald-900 dark:text-emerald-100">Upload Image</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">Drag and drop your skin image here, or click the button below to browse</p>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleImageChange}
                  aria-label="Upload skin lesion image"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="sr-only">Upload skin lesion image</label>
              </>
            ) : (
              <div className="relative w-full">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg hover:bg-red-50 hover:text-red-600"
                  onClick={resetAnalysis}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center">
                  <div className="relative w-full max-w-md h-80 mb-4 overflow-hidden rounded-xl border-4 border-emerald-200 dark:border-emerald-800 shadow-xl">
                    <Image
                      src={selectedImage || "/placeholder.svg"}
                      alt="Selected skin lesion"
                      fill
                      className="object-contain bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{fileName}</p>
                  </div>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing} 
                    size="lg"
                    className="w-full max-w-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-5 w-5" />
                        Analyze Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800"
            >
              <div className="flex items-center justify-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">AI Analysis in Progress...</p>
              </div>
              <Progress value={45} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500" />
              <p className="text-xs text-center text-muted-foreground">Our deep learning model is analyzing your image</p>
            </motion.div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results Card */}
      {result && (
        <motion.div
          ref={analysisRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/30 shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-2" />
            <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    {result.details?.emoji ? (
                      <span className="text-3xl">{result.details.emoji}</span>
                    ) : result.prediction === "Carcinoma" ? (
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">Analysis Complete</CardTitle>
                    <CardDescription className="text-emerald-700 dark:text-emerald-300">AI-powered comprehensive skin analysis</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Enhanced indication that analysis was saved to history */}
                  {analysisSaved && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Saved to History</span>
                    </motion.div>
                  )}
                  <Button variant="outline" size="sm" onClick={speakSummary} className="flex items-center shadow-sm">
                    <Volume2 className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Speak</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} className="flex items-center shadow-sm">
                    <Download className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Warning Banners */}
              {riskData.risk === 'Very High' && (
                <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span><strong>Warning:</strong> This condition requires urgent medical attention.</span>
                </div>
              )}
              
              {riskData.risk === 'High' && (
                <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span><strong>Caution:</strong> This condition is serious and should be addressed promptly.</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left column - Medical Information */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Medical Assessment</h3>
                    {result.prediction === "Carcinoma" && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        High Priority
                      </span>
                    )}
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm font-medium text-gray-600 mb-1">Predicted Condition</p>
                    <p className="text-2xl font-bold text-green-700">{result.details?.name || result.prediction}</p>
                    <p className="text-sm text-gray-500 mt-1 italic">({result.prediction.toUpperCase()})</p>
                  </motion.div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600 mb-1">Confidence Level</p>
                      <p className="text-xl font-bold">{(result.confidence * 100).toFixed(2)}%</p>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600 mb-1">Risk Classification</p>
                      <p 
                        className={`text-lg font-bold ${
                          riskData.risk === 'Very High' ? 'text-red-600' : 
                          riskData.risk === 'High' ? 'text-orange-500' : 
                          riskData.risk === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}
                      >
                        {riskData.risk || (result.prediction === "Carcinoma" ? "High" : "Low")} Risk
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {riskData.action}
                      </p>
                    </motion.div>
                  </div>
                  
                  {/* Medical Explanation - Now Above */}
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm font-medium text-gray-600 mb-1">Medical Explanation</p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {result.details?.info || diseaseInfo}
                    </p>
                  </motion.div>
                  
                  {/* Common Symptoms - Now Below */}
                  {symptoms.length > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">Common Symptoms</p>
                      <ul className="list-disc list-inside text-sm text-yellow-800">
                        {symptoms.map((symptom, index) => (
                          <li key={index}>{symptom}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                  
                  {/* Treatment Options */}
                  {treatments.length > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-800 mb-2">Suggested Treatments</p>
                      <ul className="list-disc list-inside text-sm text-blue-900">
                        {treatments.map((treatment, index) => (
                          <li key={index}>{treatment}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                  
                  {/* Precautions Display */}
                  {precautions.length > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-2">Recommended Precautions</p>
                      <ul className="list-disc list-inside text-sm text-green-900">
                        {precautions.map((precaution, index) => (
                          <li key={index}>{precaution}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                  
                  <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-start gap-2"
                  >
                    <Stethoscope className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Recommended Action</p>
                      <p className="text-sm text-blue-700 leading-snug">
                        {result.details?.action || (result.prediction === "Carcinoma" 
                          ? "Consult with a dermatologist as soon as possible. Early detection and treatment significantly improve outcomes."
                          : "Continue regular skin self-examinations and schedule routine check-ups with your healthcare provider.")}
                      </p>
                    </div>
                  </motion.div>
                  
                  {assignedDoctors.length > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-700 mb-2">Consult These Specialists</p>
                      <ul className="list-disc list-inside text-sm text-green-800">
                        {assignedDoctors.map((doc) => (
                          <li key={doc}>{doc}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
                
                {/* Right column - Analysis Visuals */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold mb-2">Analysis Breakdown</h3>
                  
                  {/* Class Probabilities - Now Above */}
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-3">Class Probabilities</p>
                    <div className="space-y-3">
                      {Object.entries(result.class_probabilities)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([className, probability]) => (
                        <motion.div whileHover={{ scale: 1.01 }} key={className}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{className.toUpperCase()}</span>
                            <span>{(probability * 100).toFixed(2)}%</span>
                          </div>
                          <Progress
                            value={probability * 100}
                            className={`h-2 ${className.toLowerCase() === "carcinoma" ? "[&>div]:bg-destructive" : "[&>div]:bg-green-500"}`}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Probability Distribution - Now Below */}
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-3">Probability Distribution</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(result.class_probabilities).map(([label, prob], index) => ({
                              name: label.toUpperCase(),
                              value: +(prob * 100).toFixed(2),
                              fill: COLORS[index % COLORS.length]
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${value}%`}
                          >
                            {Object.entries(result.class_probabilities).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="relative w-full rounded-lg overflow-hidden border p-4 bg-gray-50">
                    <p className="text-sm font-medium mb-2">Source Image</p>
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <Image
                        src={selectedImage || "/placeholder.svg"}
                        alt="Selected skin lesion"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {result.prediction === "Carcinoma" && (
                <Alert className="bg-destructive/10 text-destructive border-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Potential Carcinoma Detected</AlertTitle>
                  <AlertDescription>
                    Our AI model has detected potential carcinoma cells in your image. Please consult with a healthcare
                    professional for proper diagnosis and treatment options.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={resetAnalysis}>
                Analyze Another Image
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Navigate to analysis history page
                    window.location.href = "/dashboard/analysis/history"
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    // In a real app, this would navigate to appointment booking
                    window.location.href = "/dashboard/appointments"
                  }}
                >
                  Book Consultation
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* Information Section */}
      <Card className="border-2 border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-1" />
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl">How Our AI Analysis Works</CardTitle>
          <CardDescription className="text-base mt-2">State-of-the-art deep learning technology for accurate skin analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-lg">1. Upload Image</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload your skin image securely. Our system preprocesses and normalizes it to match trained model requirements
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-lg">2. AI Analysis</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced CNN deep learning model analyzes cellular patterns, texture, and morphological features with 95%+ accuracy
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center space-y-4 p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h4 className="font-bold text-lg">3. Detailed Report</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Receive comprehensive analysis with risk assessment, medical recommendations, and actionable clinical insights
              </p>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
