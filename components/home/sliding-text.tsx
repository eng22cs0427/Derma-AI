"use client"

import { useState, useEffect } from "react"

const SENTENCES = [
  "Advanced AI Skin Analysis",
  "Connect to Top Dermatologists",
  "Personalized Treatment Plans",
  "Track Your Skin Health Daily"
]

export function SlidingText() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SENTENCES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative h-full min-h-[4rem] w-full flex items-center overflow-hidden">
      {/* We use widespread framer-motion approach if installed, but fallback to CSS otherwise. 
          Assuming Framer Motion is available since standard UI libs like shadcn/Acertinity use it. */}
      {SENTENCES.map((text, i) => (
        <span
          key={text}
          className={`absolute left-0 w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-300 transition-all duration-700 ease-in-out transform ${
            i === index
              ? "opacity-100 translate-y-0"
              : i < index
              ? "opacity-0 -translate-y-8"
              : "opacity-0 translate-y-8"
          }`}
          // We apply manual CSS trick instead of framer-motion to avoid crashes if it's missing
        >
          {text}
        </span>
      ))}
    </div>
  )
}
