// src/components/EnhancedRestTimer.tsx
import React, { useEffect, useState, useRef } from 'react'
import { Play, Pause, SkipForward, Plus, Minus } from 'lucide-react'
import { CircularProgress, NextExercisePreview } from './WorkoutProgress'

interface EnhancedRestTimerProps {
  initialSeconds: number
  onComplete: () => void
  nextExercise?: {
    name: string
    sets: number
    reps: string | number
    restSeconds?: number
  }
  onTimeChange?: (seconds: number) => void
}

export function EnhancedRestTimer({
  initialSeconds,
  onComplete,
  nextExercise,
  onTimeChange
}: EnhancedRestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(Math.max(1, initialSeconds))
  const [remainingSeconds, setRemainingSeconds] = useState(Math.max(1, initialSeconds))
  const [isPaused, setIsPaused] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  
  const intervalRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Audio context not supported:', error)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isPaused || isComplete) return

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsComplete(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, isComplete])

  // Handle completion
  useEffect(() => {
    if (isComplete) {
      playCompletionSound()
      vibrate(500)
      onComplete()
    }
  }, [isComplete, onComplete])

  // Audio and haptic feedback
  useEffect(() => {
    if (isPaused || isComplete) return

    if (remainingSeconds === 3 || remainingSeconds === 2 || remainingSeconds === 1) {
      playBeep(remainingSeconds === 1 ? 980 : 820)
      vibrate(100)
    }

    // Update document title
    document.title = `Rest: ${remainingSeconds}s - NeuraFit`

    return () => {
      document.title = 'NeuraFit'
    }
  }, [remainingSeconds, isPaused, isComplete])

  // Notify parent of time changes
  useEffect(() => {
    onTimeChange?.(remainingSeconds)
  }, [remainingSeconds, onTimeChange])

  const playBeep = (frequency: number) => {
    if (!audioContextRef.current) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + 0.1)
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }

  const playCompletionSound = () => {
    if (!audioContextRef.current) return

    try {
      // Play a pleasant completion chord
      const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContextRef.current!.createOscillator()
          const gainNode = audioContextRef.current!.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContextRef.current!.destination)

          oscillator.frequency.value = freq
          oscillator.type = 'sine'

          gainNode.gain.setValueAtTime(0.1, audioContextRef.current!.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + 0.3)

          oscillator.start(audioContextRef.current!.currentTime)
          oscillator.stop(audioContextRef.current!.currentTime + 0.3)
        }, index * 100)
      })
    } catch (error) {
      console.warn('Completion sound failed:', error)
    }
  }

  const vibrate = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration)
    }
  }

  const adjustTime = (delta: number) => {
    const newTotal = Math.max(1, totalSeconds + delta)
    const newRemaining = Math.max(0, remainingSeconds + delta)
    
    setTotalSeconds(newTotal)
    setRemainingSeconds(newRemaining)
    
    if (newRemaining === 0) {
      setIsComplete(true)
    }
  }

  const togglePause = () => {
    setIsPaused(prev => !prev)
  }

  const skip = () => {
    setRemainingSeconds(0)
    setIsComplete(true)
  }

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 100
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-4xl px-5 pb-20 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 md:p-8 shadow-lg text-center">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 blur-3xl" />
          
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Rest Time</h1>
          <p className="text-gray-600 text-sm mb-8">
            {isPaused ? 'Timer paused' : isComplete ? 'Rest complete!' : 'Auto-continue when timer ends'}
          </p>

          {/* Main Timer Display */}
          <div className="flex justify-center mb-8">
            <CircularProgress progress={progress} size={200} strokeWidth={12}>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600">
                  {isPaused ? 'Paused' : isComplete ? 'Done!' : 'Remaining'}
                </div>
              </div>
            </CircularProgress>
          </div>

          {/* Quick Time Adjustments */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => adjustTime(-15)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              disabled={isComplete}
            >
              <Minus className="h-4 w-4" />
              <span className="text-sm font-medium">15s</span>
            </button>

            <button
              onClick={togglePause}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                isPaused
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              disabled={isComplete}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={() => adjustTime(15)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              disabled={isComplete}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">15s</span>
            </button>
          </div>

          {/* Skip Button */}
          <button
            onClick={skip}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors mx-auto mb-8"
            disabled={isComplete}
          >
            <SkipForward className="h-5 w-5" />
            <span>Skip Rest</span>
          </button>

          {/* Next Exercise Preview */}
          {nextExercise && (
            <NextExercisePreview 
              nextExercise={nextExercise} 
              timeRemaining={remainingSeconds} 
            />
          )}
        </div>
      </main>
    </div>
  )
}
