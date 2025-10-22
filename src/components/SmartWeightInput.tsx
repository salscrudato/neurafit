// src/components/SmartWeightInput.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, Plus, RotateCcw, Zap } from 'lucide-react'

interface WeightHistory {
  exerciseName: string
  setNumber: number
  weight: number
  timestamp: number
  reps?: number
}

interface SmartWeightInputProps {
  exerciseName: string
  setNumber: number
  currentWeight: number | null
  onWeightChange: (_weight: number | null) => void
  isOptimistic?: boolean
  previousWeights?: WeightHistory[]
  targetReps?: number | string
}

export const SmartWeightInput = React.memo(function SmartWeightInput({
  exerciseName,
  setNumber,
  currentWeight,
  onWeightChange,
  isOptimistic = false,
  previousWeights = [],
  targetReps: _targetReps
}: SmartWeightInputProps) {
  const [inputValue, setInputValue] = useState(currentWeight?.toString() || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Weight validation constants
  const MIN_WEIGHT = 0
  const MAX_WEIGHT = 1000

  // Sync input value when currentWeight changes externally
  useEffect(() => {
    setInputValue(currentWeight?.toString() || '')
  }, [currentWeight])

  // Calculate smart suggestions based on previous weights
  const suggestions = useMemo(() => {
    const relevantWeights = previousWeights
      .filter(w => w.exerciseName === exerciseName)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5) // Last 5 sessions

    if (relevantWeights.length === 0) return []

    const lastWeight = relevantWeights[0]?.weight || 0
    const avgWeight = relevantWeights.reduce((sum, w) => sum + w.weight, 0) / relevantWeights.length

    const suggestions = []

    // Previous weight (safe option)
    if (lastWeight > 0) {
      suggestions.push({
        weight: lastWeight,
        label: 'Last used',
        type: 'previous' as const,
        confidence: 'high' as const
      })
    }

    // Progressive overload suggestions
    if (lastWeight > 0) {
      // Small increment (2.5-5 lbs)
      const smallIncrement = lastWeight + (lastWeight < 50 ? 2.5 : 5)
      suggestions.push({
        weight: smallIncrement,
        label: '+2.5-5 lbs',
        type: 'progressive' as const,
        confidence: 'medium' as const
      })

      // Larger increment (10% increase)
      const largeIncrement = Math.round(lastWeight * 1.1 * 2) / 2 // Round to nearest 0.5
      if (largeIncrement !== smallIncrement) {
        suggestions.push({
          weight: largeIncrement,
          label: '+10%',
          type: 'progressive' as const,
          confidence: 'low' as const
        })
      }
    }

    // Average weight from recent sessions
    if (avgWeight > 0 && Math.abs(avgWeight - lastWeight) > 2.5) {
      suggestions.push({
        weight: Math.round(avgWeight * 2) / 2,
        label: 'Recent avg',
        type: 'average' as const,
        confidence: 'medium' as const
      })
    }

    return suggestions.slice(0, 4) // Limit to 4 suggestions
  }, [exerciseName, previousWeights])

  // Quick increment buttons
  const quickIncrements = [2.5, 5, 10, 25]

  // Cleanup debounce timer on unmount
  useEffect(() => {
    const timer = debounceTimerRef.current
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    const weight = inputValue.trim() === '' ? null : parseFloat(inputValue)

    // Validate weight input
    if (weight !== null) {
      if (isNaN(weight)) {
        setValidationError('Please enter a valid number')
        return
      }
      if (weight < MIN_WEIGHT) {
        setValidationError(`Weight must be at least ${MIN_WEIGHT} lbs`)
        return
      }
      if (weight > MAX_WEIGHT) {
        setValidationError(`Weight must be less than ${MAX_WEIGHT} lbs`)
        return
      }
    }

    setValidationError(null)
    setIsSubmitting(true)
    try {
      onWeightChange(weight)
      setShowSuggestions(false)
      await new Promise(resolve => setTimeout(resolve, 200))
    } finally {
      setIsSubmitting(false)
    }
  }, [inputValue, onWeightChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [handleSubmit])

  // Auto-save weight on blur
  const handleInputBlur = useCallback(() => {
    if (inputValue.trim() !== '') {
      handleSubmit()
    }
  }, [inputValue, handleSubmit])

  const handleSuggestionClick = useCallback((weight: number) => {
    setInputValue(weight.toString())
    onWeightChange(weight)
    setShowSuggestions(false)
  }, [onWeightChange])

  const adjustWeight = useCallback((delta: number) => {
    const current = parseFloat(inputValue) || 0
    const newWeight = Math.max(0, current + delta)
    setInputValue(newWeight.toString())
  }, [inputValue])

  const resetWeight = useCallback(() => {
    setInputValue('')
    onWeightChange(null)
  }, [onWeightChange])

  // Get trend indicator
  const getTrendIndicator = () => {
    if (previousWeights.length < 2) return null

    const recent = previousWeights
      .filter(w => w.exerciseName === exerciseName)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)

    if (recent.length < 2 || !recent[0] || !recent[recent.length - 1]) return null

    const trend = recent[0]!.weight - recent[recent.length - 1]!.weight
    if (Math.abs(trend) < 2.5) return null

    return trend > 0 ? 'up' : 'down'
  }

  const trend = getTrendIndicator()

  return (
    <div className={`rounded-2xl border backdrop-blur-sm p-4 transition-all duration-200 ${
      isOptimistic 
        ? 'border-blue-300 bg-blue-50/70 shadow-md' 
        : 'border-gray-200 bg-white/70'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="font-medium text-gray-900 flex items-center gap-2">
            Weight for Set {setNumber}
            {isOptimistic && (
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            )}
            {trend && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                trend === 'up' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend === 'up' ? 'Trending up' : 'Trending down'}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isOptimistic ? 'Saving...' : 'Enter weight in lbs (optional)'}
          </div>
        </div>
      </div>

      {/* Weight Input with Quick Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => adjustWeight(-2.5)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          disabled={isSubmitting}
          aria-label="Decrease weight by 2.5 lbs"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex-1 relative">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setValidationError(null) // Clear error on input change
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200)
              handleInputBlur() // Auto-save on blur
            }}
            onKeyDown={handleKeyDown}
            placeholder="0"
            min={MIN_WEIGHT}
            max={MAX_WEIGHT}
            step="0.5"
            className={`w-full rounded-lg border ${validationError ? 'border-red-400' : 'border-gray-200'} bg-white px-4 py-3 text-center text-lg font-semibold text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20`}
            disabled={isSubmitting}
            aria-label={`Weight for set ${setNumber} of ${exerciseName} in pounds`}
            aria-describedby={`weight-help-${setNumber}`}
            aria-invalid={!!validationError}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            lbs
          </div>
        </div>

        <button
          onClick={() => adjustWeight(2.5)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          disabled={isSubmitting}
          aria-label="Increase weight by 2.5 lbs"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          onClick={resetWeight}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          disabled={isSubmitting}
          aria-label="Clear weight"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mb-3 text-sm text-red-600 flex items-center gap-2">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {validationError}
        </div>
      )}

      {/* Quick Increment Buttons */}
      <div className="flex gap-2 mb-4">
        {quickIncrements.map(increment => (
          <button
            key={increment}
            onClick={() => adjustWeight(increment)}
            className="flex-1 px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            +{increment}
          </button>
        ))}
      </div>

      {/* Smart Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Smart Suggestions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.weight)}
                className={`p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${
                  suggestion.confidence === 'high'
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : suggestion.confidence === 'medium'
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                }`}
              >
                <div className="font-semibold text-gray-900">
                  {suggestion.weight} lbs
                </div>
                <div className="text-xs text-gray-600">
                  {suggestion.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-save on blur - no submit button needed */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-render prevention
  return (
    prevProps.exerciseName === nextProps.exerciseName &&
    prevProps.setNumber === nextProps.setNumber &&
    prevProps.currentWeight === nextProps.currentWeight &&
    prevProps.isOptimistic === nextProps.isOptimistic &&
    prevProps.targetReps === nextProps.targetReps &&
    // Deep comparison for previousWeights array
    (prevProps.previousWeights?.length || 0) === (nextProps.previousWeights?.length || 0) &&
    (prevProps.previousWeights || []).every((prev, idx) => {
      const next = (nextProps.previousWeights || [])[idx]
      return next && prev.weight === next.weight && prev.timestamp === next.timestamp
    })
  )
})
