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
            <span>AI-Powered Diagnosis</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              DermaAI Analysis
            </h1>
          </div>
          <div className="flex justify-center mt-4">
            <a href="/dashboard/analysis/history" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-emerald-200 bg-white hover:bg-emerald-100 hover:text-emerald-900 h-10 px-4 py-2 text-emerald-700 shadow-sm">
              <Clock className="w-4 h-4 mr-2" />
              View Analysis History
            </a>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced skin condition detection powered by deep learning. Get instant analysis with detailed medical insights.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>85-95%+ Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-600" />
              <span>Deep Learning Model</span>
            </div>
          </div>
        </div>

        {/* Pass authentication status to client component if needed */}
        <ImageAnalyzer />
      </div>
    </div>
  )
}
