import { Brain, HeartPulse, Microscope, ShieldCheck, Stethoscope } from "lucide-react"

const features = [
  {
    icon: Microscope,
    title: "AI-Powered Analysis",
    description: "Advanced skin condition detection using machine learning",
  },
  {
    icon: Stethoscope,
    title: "Expert Recommendations",
    description: "Get matched with qualified dermatologists",
  },
  {
    icon: HeartPulse,
    title: "Health Tracking",
    description: "Monitor your skin health progress over time",
  },
  {
    icon: Brain,
    title: "Personalized Care",
    description: "Customized treatment plans and recommendations",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description: "Your health data is encrypted and protected",
  },
]

export function AnimatedAuthSidebar() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400 p-8 xl:p-12 text-white relative overflow-hidden h-screen">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-300/20 blur-[100px]" />

      <div className="max-w-md mx-auto z-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Join DermaAI</h1>
          <p className="text-white/80 text-base">
            Your trusted AI companion for dermatology and personalized skin care.
          </p>
        </div>

        <div className="space-y-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div 
                key={idx} 
                className="flex gap-4 items-center hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors cursor-default"
              >
                <div className="bg-white/10 p-2.5 rounded-xl shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{feature.title}</h3>
                  <p className="text-white/70 text-sm font-medium leading-snug">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
