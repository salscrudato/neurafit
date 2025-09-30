import React, { useState } from 'react'

interface RippleProps {
  className?: string
  color?: string
  duration?: number
}

export function useRipple({ color = 'rgba(255, 255, 255, 0.6)', duration = 600 }: RippleProps = {}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, duration)
  }

  const rippleElements = ripples.map(ripple => (
    <span
      key={ripple.id}
      className="absolute rounded-full animate-ripple pointer-events-none"
      style={{
        left: ripple.x - 10,
        top: ripple.y - 10,
        width: 20,
        height: 20,
        backgroundColor: color,
        transform: 'scale(0)',
        animation: `ripple ${duration}ms ease-out`,
      }}
    />
  ))

  return { addRipple, rippleElements }
}

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
