// src/components/MobileEnhancements.tsx
import React, { useState, useEffect, useRef } from 'react'
import { X, Check, Minus, Plus } from 'lucide-react'

// Enhanced Bottom Sheet Component
interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[] // Percentage heights: [25, 50, 90]
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  snapPoints = [50, 90] 
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const deltaY = currentY - startY
    const threshold = 100
    
    if (deltaY > threshold) {
      // Swipe down
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1)
      } else {
        onClose()
      }
    } else if (deltaY < -threshold) {
      // Swipe up
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1)
      }
    }
  }

  if (!isOpen) return null

  const height = snapPoints[currentSnap]
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out"
        style={{
          height: `${height}vh`,
          transform: `translateY(${dragOffset}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Enhanced Touch Button Component
interface TouchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  hapticFeedback?: boolean
}

export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  hapticFeedback = true
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleTouchStart = () => {
    setIsPressed(true)
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
  }

  const handleClick = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(20)
    }
    onClick?.()
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-150 select-none'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700'
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  }

  const pressedScale = isPressed ? 'scale-95' : 'scale-100'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${pressedScale} ${disabledClasses} ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// Swipe Gesture Handler
interface SwipeGestureProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  className?: string
}

export function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = ''
}: SwipeGestureProps) {
  const [startTouch, setStartTouch] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setStartTouch({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startTouch) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startTouch.x
    const deltaY = touch.clientY - startTouch.y

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (Math.max(absDeltaX, absDeltaY) < threshold) return

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }

    setStartTouch(null)
  }

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

// Enhanced Number Input with Touch Controls
interface TouchNumberInputProps {
  value: number
  onChange: (_value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  disabled?: boolean
}

export function TouchNumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  unit,
  disabled = false
}: TouchNumberInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step)
    onChange(newValue)
    if ('vibrate' in navigator) navigator.vibrate(10)
  }

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step)
    onChange(newValue)
    if ('vibrate' in navigator) navigator.vibrate(10)
  }

  const handleInputSubmit = () => {
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue))
      onChange(clampedValue)
    }
    setIsEditing(false)
  }

  const handleInputCancel = () => {
    setInputValue(value.toString())
    setIsEditing(false)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-3">
        <TouchButton
          variant="secondary"
          size="sm"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="w-12 h-12 rounded-full"
        >
          <Minus className="h-4 w-4" />
        </TouchButton>

        <div className="flex-1 relative">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 text-center text-lg font-semibold bg-white border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                min={min}
                max={max}
                step={step}
                autoFocus
              />
              <TouchButton
                variant="primary"
                size="sm"
                onClick={handleInputSubmit}
                className="w-10 h-10 rounded-full"
              >
                <Check className="h-4 w-4" />
              </TouchButton>
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={handleInputCancel}
                className="w-10 h-10 rounded-full"
              >
                <X className="h-4 w-4" />
              </TouchButton>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="w-full text-center text-lg font-semibold bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {value} {unit && <span className="text-gray-500 ml-1">{unit}</span>}
            </button>
          )}
        </div>

        <TouchButton
          variant="secondary"
          size="sm"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="w-12 h-12 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </TouchButton>
      </div>
    </div>
  )
}
