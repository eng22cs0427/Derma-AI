import { ImageAnalyzer } from "@/components/analysis/image-analyzer"
import { Brain, Shield, Sparkles, Clock } from "lucide-react"

export default async function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <Brain className="h-4 w-4" />
            <span>3-Engine AI Skin Analysis</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              DermaSense AI Analysis
            </h1>
          </div>
          <div className="flex justify-center mt-4">
            <a href="/dashboard/analysis/history" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-emerald-200 bg-white hover:bg-emerald-100 hover:text-emerald-900 h-10 px-4 py-2 text-emerald-700 shadow-sm">
              <Clock className="w-4 h-4 mr-2" />
              View Analysis History
            </a>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your scan area, capture or upload, and get a clinically-detailed report from our 3-engine AI pipeline — works accurately for all skin types (Fitzpatrick Types I–VI).
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Azure CV + GPT-4o + ML — 3 Engines</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-600" />
              <span>40+ Skin Conditions · All Skin Tones</span>
            </div>
          </div>

          {/* 4-Step flow indicator */}
          <div className="flex flex-wrap justify-center gap-1 items-center mt-3 text-xs text-muted-foreground">
            {['Select Body Part', 'Scan / Upload', 'AI Analysis', 'Full Report'].map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">{i + 1}. {s}</span>
                {i < 3 && <span className="text-gray-300">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Main Analyzer */}
        <ImageAnalyzer />

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-lg mx-auto">
          ⚕️ DermaSense AI is an adjunct diagnostic tool — not a substitute for professional medical advice.
          Always consult a qualified dermatologist for accurate diagnosis and treatment.
        </p>
      </div>
    </div>
  )
}
