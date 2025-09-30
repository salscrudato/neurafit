import React, { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

// Ripple effect component for touch feedback

// Magnetic hover effect
interface MagneticProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

export function Magnetic({ children, strength = 0.3, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength
      
      setPosition({ x: deltaX, y: deltaY })
    }

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 })
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [strength])

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-200 ease-out', className)}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`
      }}
    >
      {children}
    </div>
  )
}

// Floating animation component
interface FloatingProps {
  children: React.ReactNode
  duration?: number
  intensity?: number
  className?: string
}

export function Floating({ children, duration = 3000, intensity = 10, className }: FloatingProps) {
  return (
    <div
      className={cn('animate-float', className)}
      style={{
        animationDuration: `${duration}ms`,
        '--float-intensity': `${intensity}px`
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// Parallax scroll effect
interface ParallaxProps {
  children: React.ReactNode
  speed?: number
  className?: string
}

export function Parallax({ children, speed = 0.5, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      
      // const rect = ref.current.getBoundingClientRect() // Unused for now
      const scrolled = window.pageYOffset
      const rate = scrolled * -speed
      
      setOffset(rate)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return (
    <div
      ref={ref}
      className={cn('will-change-transform', className)}
      style={{
        transform: `translate3d(0, ${offset}px, 0)`
      }}
    >
      {children}
    </div>
  )
}

// Stagger animation for lists
interface StaggerProps {
  children: React.ReactNode | React.ReactNode[]
  delay?: number
  className?: string
}

export function Stagger({ children, delay = 100, className }: StaggerProps) {
  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in-up"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Morphing button component
interface MorphButtonProps {
  children: React.ReactNode
  morphTo?: React.ReactNode
  trigger?: 'hover' | 'click'
  className?: string
  onClick?: () => void
}

export function MorphButton({ 
  children, 
  morphTo, 
  trigger = 'hover', 
  className,
  onClick 
}: MorphButtonProps) {
  const [isMorphed, setIsMorphed] = useState(false)

  const handleInteraction = () => {
    if (trigger === 'click') {
      setIsMorphed(!isMorphed)
      onClick?.()
    }
  }

  const handleHover = () => {
    if (trigger === 'hover') {
      setIsMorphed(true)
    }
  }

  const handleLeave = () => {
    if (trigger === 'hover') {
      setIsMorphed(false)
    }
  }

  return (
    <button
      className={cn(
        'relative overflow-hidden transition-all duration-300 ease-out',
        className
      )}
      onClick={handleInteraction}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
    >
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          isMorphed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
      >
        {children}
      </div>
      
      {morphTo && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out',
            isMorphed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          {morphTo}
        </div>
      )}
    </button>
  )
}

// Pulse animation for notifications
interface PulseProps {
  children: React.ReactNode
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Pulse({ children, color = 'bg-blue-500', size = 'md', className }: PulseProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className={cn('relative', className)}>
      {children}
      <div className={cn('absolute -top-1 -right-1', sizeClasses[size])}>
        <div className={cn('absolute inset-0 rounded-full animate-ping', color)} />
        <div className={cn('relative rounded-full', color, sizeClasses[size])} />
      </div>
    </div>
  )
}


