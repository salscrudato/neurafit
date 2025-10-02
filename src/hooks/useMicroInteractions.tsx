import { useState } from 'react'

// Shake animation for errors
export function useShake() {
  const [isShaking, setIsShaking] = useState(false)

  const shake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const shakeClass = isShaking ? 'animate-shake' : ''

  return { shake, shakeClass }
}

// Bounce animation for success states
export function useBounce() {
  const [isBouncing, setIsBouncing] = useState(false)

  const bounce = () => {
    setIsBouncing(true)
    setTimeout(() => setIsBouncing(false), 600)
  }

  const bounceClass = isBouncing ? 'animate-bounce-once' : ''

  return { bounce, bounceClass }
}
