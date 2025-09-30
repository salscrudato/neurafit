// Advanced gesture recognition system for NeuraFit
// Supports swipe, pinch, tap, and long press gestures

import React from 'react'

export interface GestureEvent {
  type: 'swipe' | 'tap' | 'longpress' | 'pinch'
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  duration?: number
  scale?: number
  velocity?: number
  target: HTMLElement
  originalEvent: TouchEvent | MouseEvent
}

export interface GestureConfig {
  swipeThreshold: number
  longPressDelay: number
  tapTimeout: number
  pinchThreshold: number
  velocityThreshold: number
}

const defaultConfig: GestureConfig = {
  swipeThreshold: 50,
  longPressDelay: 500,
  tapTimeout: 300,
  pinchThreshold: 0.1,
  velocityThreshold: 0.3
}

export class GestureRecognizer {
  private element: HTMLElement
  private config: GestureConfig
  private startTouch: Touch | null = null
  private startTime: number = 0
  private longPressTimer: number | null = null
  private tapTimer: number | null = null
  private lastTap: number = 0
  private initialDistance: number = 0
  private listeners: Map<string, ((event: GestureEvent) => void)[]> = new Map()

  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element
    this.config = { ...defaultConfig, ...config }
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })

    // Mouse events for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this))
  }

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.startTouch = event.touches[0]
      this.startTime = Date.now()
      
      // Start long press timer
      this.longPressTimer = window.setTimeout(() => {
        this.emitGesture({
          type: 'longpress',
          duration: Date.now() - this.startTime,
          target: this.element,
          originalEvent: event
        })
      }, this.config.longPressDelay)
    } else if (event.touches.length === 2) {
      // Pinch gesture
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      this.initialDistance = this.getDistance(touch1, touch2)
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }

    if (event.touches.length === 2 && this.initialDistance > 0) {
      // Handle pinch
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const currentDistance = this.getDistance(touch1, touch2)
      const scale = currentDistance / this.initialDistance

      if (Math.abs(scale - 1) > this.config.pinchThreshold) {
        this.emitGesture({
          type: 'pinch',
          scale,
          target: this.element,
          originalEvent: event
        })
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }

    if (this.startTouch && event.changedTouches.length === 1) {
      const endTouch = event.changedTouches[0]
      const deltaX = endTouch.clientX - this.startTouch.clientX
      const deltaY = endTouch.clientY - this.startTouch.clientY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const duration = Date.now() - this.startTime
      const velocity = distance / duration

      if (distance > this.config.swipeThreshold && velocity > this.config.velocityThreshold) {
        // Swipe gesture
        const direction = this.getSwipeDirection(deltaX, deltaY)
        this.emitGesture({
          type: 'swipe',
          direction,
          distance,
          duration,
          velocity,
          target: this.element,
          originalEvent: event
        })
      } else if (distance < 10 && duration < this.config.tapTimeout) {
        // Tap gesture
        const now = Date.now()
        const isDoubleTap = now - this.lastTap < 300

        if (this.tapTimer) {
          clearTimeout(this.tapTimer)
          this.tapTimer = null
        }

        if (isDoubleTap) {
          this.emitGesture({
            type: 'tap',
            duration,
            target: this.element,
            originalEvent: event
          })
          this.lastTap = 0
        } else {
          this.tapTimer = window.setTimeout(() => {
            this.emitGesture({
              type: 'tap',
              duration,
              target: this.element,
              originalEvent: event
            })
          }, 200)
          this.lastTap = now
        }
      }
    }

    this.startTouch = null
    this.initialDistance = 0
  }

  // Mouse event handlers for desktop testing
  private handleMouseDown(event: MouseEvent) {
    this.startTime = Date.now()
    // Convert mouse event to touch-like event
    const fakeTouch = {
      clientX: event.clientX,
      clientY: event.clientY
    } as Touch
    this.startTouch = fakeTouch
  }

  private handleMouseMove(_event: MouseEvent) { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private handleMouseUp(event: MouseEvent) {
    if (this.startTouch) {
      const deltaX = event.clientX - this.startTouch.clientX
      const deltaY = event.clientY - this.startTouch.clientY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const duration = Date.now() - this.startTime

      if (distance > this.config.swipeThreshold) {
        const direction = this.getSwipeDirection(deltaX, deltaY)
        this.emitGesture({
          type: 'swipe',
          direction,
          distance,
          duration,
          target: this.element,
          originalEvent: event
        })
      } else if (distance < 10) {
        this.emitGesture({
          type: 'tap',
          duration,
          target: this.element,
          originalEvent: event
        })
      }
    }

    this.startTouch = null
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const deltaX = touch2.clientX - touch1.clientX
    const deltaY = touch2.clientY - touch1.clientY
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }

  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  private emitGesture(gesture: GestureEvent) {
    const listeners = this.listeners.get(gesture.type) || []
    listeners.forEach(listener => listener(gesture))

    // Also emit to 'all' listeners
    const allListeners = this.listeners.get('all') || []
    allListeners.forEach(listener => listener(gesture))
  }

  public on(eventType: string, callback: (event: GestureEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(callback)
  }

  public off(eventType: string, callback: (event: GestureEvent) => void) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  public destroy() {
    // Clear all timers
    if (this.longPressTimer) clearTimeout(this.longPressTimer)
    if (this.tapTimer) clearTimeout(this.tapTimer)

    // Remove event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this))

    // Clear listeners
    this.listeners.clear()
  }
}

// React hook for gesture recognition
export function useGestures(
  ref: React.RefObject<HTMLElement | null>,
  config?: Partial<GestureConfig>
) {
  const recognizerRef = React.useRef<GestureRecognizer | null>(null)

  React.useEffect(() => {
    if (ref.current) {
      recognizerRef.current = new GestureRecognizer(ref.current, config)
    }

    return () => {
      recognizerRef.current?.destroy()
    }
  }, [ref, config])

  const on = React.useCallback((eventType: string, callback: (event: GestureEvent) => void) => {
    recognizerRef.current?.on(eventType, callback)
  }, [])

  const off = React.useCallback((eventType: string, callback: (event: GestureEvent) => void) => {
    recognizerRef.current?.off(eventType, callback)
  }, [])

  return { on, off }
}
