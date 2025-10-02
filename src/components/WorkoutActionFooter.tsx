// src/components/WorkoutActionFooter.tsx
import React from 'react'
import { SkipForward, Check, X } from 'lucide-react'

interface WorkoutActionFooterProps {
  onCompleteSet: () => void
  onSkipSet: () => void
  onSkipExercise: () => void
  isCompleting?: boolean
  className?: string
}

function WorkoutActionFooter({
  onCompleteSet,
  onSkipSet,
  onSkipExercise,
  isCompleting = false,
  className = ""
}: WorkoutActionFooterProps) {
  return (
    <div className={`fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200/60 shadow-lg shadow-gray-200/20 ${className}`}>
      <div
        className="mx-auto max-w-4xl px-3 sm:px-6 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Skip Exercise Button */}
          <button
            onClick={onSkipExercise}
            className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-gray-300 bg-white/80 text-gray-700 hover:bg-white hover:border-gray-400 transition-all duration-200 text-sm font-medium touch-manipulation min-h-[44px] active:scale-95"
            disabled={isCompleting}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Skip Exercise</span>
            <span className="sm:hidden">Skip</span>
          </button>

          {/* Action Buttons Container */}
          <div className="flex gap-2 sm:gap-3 flex-1 justify-end">
            {/* Skip Set Button */}
            <button
              onClick={onSkipSet}
              className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-all duration-200 font-medium touch-manipulation min-h-[44px] active:scale-95"
              disabled={isCompleting}
            >
              <SkipForward className="h-4 w-4" />
              <span className="hidden xs:inline">Skip Set</span>
              <span className="xs:hidden">Skip</span>
            </button>

            {/* Complete Set Button */}
            <button
              onClick={onCompleteSet}
              disabled={isCompleting}
              className="flex items-center gap-1.5 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md touch-manipulation min-h-[44px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Check className="h-4 w-4" />
              <span className="hidden xs:inline">{isCompleting ? 'Completing...' : 'Complete Set'}</span>
              <span className="xs:hidden">{isCompleting ? 'Done...' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkoutActionFooter
