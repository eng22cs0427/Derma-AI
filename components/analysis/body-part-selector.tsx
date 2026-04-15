"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, CheckCircle2, ChevronRight } from "lucide-react"
import { BODY_PARTS, BODY_DISEASE_MAP, DISEASE_DB, type BodyPartInfo } from "@/lib/skin-disease-db"
import { Button } from "@/components/ui/button"

interface BodyPartSelectorProps {
  onSelect: (bodyPart: string) => void
}

export function BodyPartSelector({ onSelect }: BodyPartSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hoveredPart, setHoveredPart] = useState<string | null>(null)

  const getTopConditions = (partId: string) => {
    const diseaseList = BODY_DISEASE_MAP[partId]
    if (diseaseList === 'all') return 'All 40+ conditions checked'
    const names = diseaseList.slice(0, 3).map(code => DISEASE_DB[code]?.name || code)
    return names.join(', ') + (diseaseList.length > 3 ? ` +${diseaseList.length - 3} more` : '')
  }

  const selectedPart = BODY_PARTS.find(p => p.id === selected)

  return (
    <div className="min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Step 1 of 4 — Select Scan Area
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2"
        >
          Which part of your body would you like to scan?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground max-w-xl mx-auto"
        >
          Our AI will look for moles, rashes, lesions, and skin conditions specific to that region using 3 AI engines simultaneously.
        </motion.p>
      </div>

      {/* Body Part Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6 flex-1">
        {BODY_PARTS.map((part, index) => (
          <motion.button
            key={part.id}
            id={`body-part-${part.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected(part.id)}
            onMouseEnter={() => setHoveredPart(part.id)}
            onMouseLeave={() => setHoveredPart(null)}
            className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer ${
              selected === part.id
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
            }`}
          >
            {/* Selected checkmark */}
            <AnimatePresence>
              {selected === part.id && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-1.5 right-1.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </motion.div>
              )}
            </AnimatePresence>

            <span className="text-3xl leading-none">{part.icon}</span>
            <span className={`text-xs font-semibold leading-tight ${
              selected === part.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {part.label}
            </span>

            {/* Hover tooltip showing conditions */}
            <AnimatePresence>
              {hoveredPart === part.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
                >
                  <p className="font-semibold mb-1">{part.label}</p>
                  <p className="text-gray-300 leading-relaxed">{part.hint}</p>
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-900 dark:bg-gray-700 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Selected Info Panel */}
      <AnimatePresence>
        {selected && selectedPart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{selectedPart.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                  Scanning: {selectedPart.label}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Common conditions: {getTopConditions(selected)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          id="continue-to-camera-btn"
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          size="lg"
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base py-6"
        >
          <Camera className="mr-2 h-5 w-5" />
          {selected ? `Continue to Camera — ${BODY_PARTS.find(p => p.id === selected)?.label}` : 'Select a body part to continue'}
          {selected && <ChevronRight className="ml-2 h-5 w-5" />}
        </Button>
      </motion.div>
    </div>
  )
}
