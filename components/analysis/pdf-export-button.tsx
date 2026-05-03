"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createRoot } from "react-dom/client"
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react"

// Helper functions for PDF styling
function getRiskConfig(risk: string) {
  if (risk?.includes("Very High")) return { label: "Very High", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", Icon: ShieldAlert }
  if (risk?.includes("High"))      return { label: "High",     bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", Icon: AlertTriangle }
  if (risk?.includes("Medium"))    return { label: "Medium",   bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", Icon: null }
  return                                  { label: "Low",      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", Icon: CheckCircle2 }
}

const PdfTemplate = ({ details }: { details: any }) => {
  const result = details.fullReport || details
  const riskConf = getRiskConfig(result.severity || details.Risk_Level || "Low")

  return (
    <div id="pdf-export-container" className="bg-white text-slate-900 p-8 font-sans w-[650px] mx-auto border-2 border-slate-100 rounded-xl">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
        <div className="flex gap-4">
          {details.imageUrl && (
            <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200">
              <img src={details.imageUrl} alt="Skin Scan" className="w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-emerald-800 tracking-tight">DermaSense AI</h1>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">Medical AI Diagnostic Report</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4 max-w-[200px] break-words">
          <p className="text-sm font-bold text-slate-700">{details.Patient_Name || "Patient"}</p>
          <p className="text-xs text-slate-500 mt-1">Age: {details.Patient_Age || "N/A"}</p>
          <p className="text-xs text-slate-500 mt-0.5">{details.analysis_time || new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Doctor Review Section (If closed ticket) */}
      {details.doctorReviewed && (
        <div className="mb-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex justify-between items-start mb-3 border-b border-emerald-100 pb-2">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Dermatologist Review</h3>
              <p className="text-sm font-bold text-emerald-900 mt-0.5">Dr. {details.doctorName}</p>
            </div>
            {details.verdict && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-emerald-200 text-emerald-700">
                Verdict: {details.verdict}
              </span>
            )}
          </div>
          <div className="mt-2">
            <p className="text-sm text-emerald-800 italic leading-relaxed">
              "{details.doctorMessage}"
            </p>
          </div>
          {details.reviewedAt && (
            <p className="text-[10px] text-emerald-600 mt-3 font-semibold">
              Reviewed on: {new Date(details.reviewedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Primary Diagnosis */}
      <div className={`p-6 rounded-xl border mb-6 ${riskConf.bg} ${riskConf.border}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Primary Diagnosis</h2>
            <p className={`text-2xl font-black ${riskConf.text}`}>{result.prediction_name || details.Diagnosis_Name}</p>
            {(result.prediction || result.icd10) && (
              <p className="text-sm font-semibold mt-1 opacity-80">
                {result.prediction ? `Code: ${result.prediction}` : ''}
                {result.prediction && result.icd10 ? ' · ' : ''}
                {result.icd10 ? `ICD-10: ${result.icd10}` : ''}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-4 max-w-[250px]">
            <div className="flex flex-wrap gap-2 justify-end mb-2">
              {result.urgency && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border bg-white shadow-sm ${
                  result.urgency.toLowerCase().includes('immediate') || result.urgency.toLowerCase().includes('urgent') 
                    ? 'text-red-700 border-red-200' 
                    : 'text-slate-700 border-slate-200'
                }`}>
                  {result.urgency}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border bg-white shadow-sm ${riskConf.text} ${riskConf.border}`}>
                {riskConf.label} Risk Level
              </span>
            </div>
            <p className="text-lg font-black">
              {result.confidence ? (result.confidence * 100).toFixed(1) : parseFloat(details.Confidence || "0").toFixed(1)}% Match
            </p>
          </div>
        </div>
        
        {result.message && (
          <p className="text-sm font-semibold mt-4 pt-4 border-t border-black/10">
            {result.message}
          </p>
        )}
      </div>

      {/* Clinical Assessment Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Location</h3>
          <p className="text-sm font-semibold">{details.Body_Part || "N/A"}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Skin Profile</h3>
          <p className="text-sm font-semibold">{result.fitzpatrick_type || details.Fitzpatrick || "N/A"}</p>
        </div>
        
        {/* Differential Diagnoses */}
        {(result.differential_diagnoses || []).length > 0 && (
          <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Differential Diagnoses Considered</h3>
            <div className="flex flex-wrap gap-2">
              {result.differential_diagnoses.map((d: string) => (
                <span key={d} className="px-2.5 py-1 bg-white border rounded-md text-xs font-semibold text-slate-600">{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

        <div className="grid grid-cols-2 gap-6 mb-6 pdf-page-break">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Common Symptoms</h3>
              <ul className="space-y-2">
                {(result.symptoms || []).map((s: string) => (
                  <li key={s} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-300 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            
            {(result.precautions || []).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Precautions</h3>
                <ul className="space-y-2">
                  {result.precautions.map((p: string) => (
                    <li key={p} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">⚠</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Recommended Management</h3>
              <ul className="space-y-2">
                {(result.treatments || []).map((t: string) => (
                  <li key={t} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">→</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            
            {(details.Recommended_Specialist || (result.recommended_specialists && result.recommended_specialists.length > 0)) && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">Recommended Specialists</h3>
                <ul className="space-y-2">
                  {(result.recommended_specialists || [details.Recommended_Specialist]).filter(Boolean).map((s: string) => (
                    <li key={s} className="text-sm font-semibold text-blue-700 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">⚕</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

      {/* Clinical Notes */}
      {(result.clinical_notes || details.Assessment) && (
        <div className="mb-6 p-5 rounded-xl bg-blue-50 border border-blue-100">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">AI Clinical Reasoning</h3>
          <p className="text-sm text-blue-900 leading-relaxed">
            {result.clinical_notes || details.Assessment}
          </p>
        </div>
      )}

      {/* ABCDE Panel for Melanoma */}
      {result.abcde && Object.keys(result.abcde).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">ABCDE Melanoma Criteria Assessment</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { k: 'A', l: 'Asymmetry', v: result.abcde.asymmetry, danger: String(result.abcde.asymmetry || '').toLowerCase().includes('asymmetric') },
              { k: 'B', l: 'Border', v: result.abcde.border, danger: String(result.abcde.border || '').toLowerCase().includes('irregular') },
              { k: 'C', l: 'Color', v: Array.isArray(result.abcde.color) ? result.abcde.color.join(', ') : result.abcde.color, danger: Array.isArray(result.abcde.color) && result.abcde.color.length > 2 },
              { k: 'D', l: 'Diameter', v: result.abcde.diameter_estimate, danger: String(result.abcde.diameter_estimate || '').includes('>6') || String(result.abcde.diameter_estimate || '').includes('>10') },
              { k: 'E', l: 'Evolution', v: result.abcde.evolution || result.abcde.evolution_indicators, danger: false },
            ].map(c => (
              c.v && (
                <div key={c.k} className={`flex items-center gap-3 p-3 border rounded-lg ${c.danger ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center font-black rounded-md ${c.danger ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-700'}`}>{c.k}</div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${c.danger ? 'text-red-400' : 'text-slate-400'}`}>{c.l}</p>
                  <p className={`text-sm font-semibold ${c.danger ? 'text-red-900' : 'text-slate-800'}`}>{String(c.v) || 'N/A'}</p>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs font-bold ${c.danger ? 'text-red-600' : 'text-slate-400'}`}>{c.danger ? 'Warning' : 'Pass'}</span>
                </div>
              </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t-2 border-slate-100 text-center space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">End of Report</p>
        <p className="text-[10px] text-slate-400 max-w-lg mx-auto">
          ⚕️ This analysis is AI-generated (Azure CV + Deep Learning + GPT-4o Vision) and is intended for informational and clinical-support purposes only. It is not a substitute for a biopsy or professional medical diagnosis.
        </p>
      </div>
    </div>
  )
}

export function PdfExportButton({ 
  details, 
  variant = "outline",
  className = "", 
  label = "Download Full PDF"
}: { 
  details: any
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
  label?: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      // Create a hidden container
      const container = document.createElement("div")
      container.style.position = "absolute"
      container.style.top = "-9999px"
      container.style.left = "-9999px"
      document.body.appendChild(container)

      // Render the template into the container
      const root = createRoot(container)
      
      // Wait for render to complete
      await new Promise<void>(resolve => {
        root.render(<PdfTemplate details={details} />)
        // Give React a moment to flush to DOM
        setTimeout(resolve, 500)
      })

      // Generate PDF
      const { default: html2pdf } = await import("html2pdf.js")
      const resultName = (details.fullReport?.prediction_name || details.Diagnosis_Name || "Result").replace(/\s+/g, '_')
      
      await html2pdf()
        .set({
          margin: [0.4, 0.4, 0.6, 0.4],
          filename: `DermaSense_Analysis_${resultName}.pdf`,
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 650 },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"], before: ".pdf-page-break" }
        })
        .from(container.firstElementChild)
        .save()

      // Cleanup
      root.unmount()
      document.body.removeChild(container)
      
    } catch (error) {
      console.error("PDF Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant={variant} 
      className={className} 
      onClick={handleExport} 
      disabled={isExporting}
    >
      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {isExporting ? "Generating PDF..." : label}
    </Button>
  )
}
