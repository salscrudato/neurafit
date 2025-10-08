/**
 * Touch Gestures Hook
 *
 * Provides utilities for handling touch gestures like swipe, long press,
 * and pinch-to-zoom on mobile devices.
 */

import type React from 'react'
import { useRef, useEffect, useCallback } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  minSwipeDistance?: number
  /** Maximum time in ms for a swipe gesture (default: 300) */
  maxSwipeTime?: number
  /** Prevent default touch behavior (default: false) */
  preventDefault?: boolean
}

/**
 * Hook for detecting swipe gestures
 * 
 * @example
 * ```tsx
 * const ref = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 * })
 * 
 * return <div ref={ref}>Swipe me!</div>
 * ```
 */
export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
): React.RefObject<T | null> {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventDefault = false,
  } = options

  const ref = useRef<T | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (preventDefault) {
        e.preventDefault()
      }

      const touch = e.touches[0]
      if (!touch) return

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
    },
    [preventDefault]
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return

      if (preventDefault) {
        e.preventDefault()
      }

      const touch = e.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const deltaTime = Date.now() - touchStartRef.current.time

      // Check if swipe was fast enough
      if (deltaTime > maxSwipeTime) {
        touchStartRef.current = null
        return
      }

      // Determine swipe direction
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Horizontal swipe
      if (absX > absY && absX > minSwipeDistance) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      }
      // Vertical swipe
      else if (absY > absX && absY > minSwipeDistance) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }

      touchStartRef.current = null
    },
    [handlers, minSwipeDistance, maxSwipeTime, preventDefault]
  )

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault })
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd, preventDefault])

  return ref
}

interface LongPressOptions {
  /** Duration in ms to trigger long press (default: 500) */
  delay?: number
  /** Callback when long press is triggered */
  onLongPress: () => void
  /** Callback when press is released before long press triggers */
  onCancel?: () => void
  /** Prevent default touch behavior (default: true) */
  preventDefault?: boolean
}

/**
 * Hook for detecting long press gestures
 * 
 * @example
 * ```tsx
 * const ref = useLongPress({
 *   onLongPress: () => console.log('Long pressed!'),
 *   delay: 500,
 * })
 * 
 * return <button ref={ref}>Long press me</button>
 * ```
 */
export function useLongPress<T extends HTMLElement = HTMLButtonElement>(
  options: LongPressOptions
): React.RefObject<T | null> {
  const { delay = 500, onLongPress, onCancel, preventDefault = true } = options

  const ref = useRef<T | null>(null)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isLongPressRef = useRef(false)

  const start = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (preventDefault) {
        e.preventDefault()
      }

      isLongPressRef.current = false
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        onLongPress()
      }, delay)
    },
    [delay, onLongPress, preventDefault]
  )

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!isLongPressRef.current) {
      onCancel?.()
    }

    isLongPressRef.current = false
  }, [onCancel])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', start, { passive: !preventDefault })
    element.addEventListener('touchend', cancel)
    element.addEventListener('touchcancel', cancel)
    element.addEventListener('mousedown', start)
    element.addEventListener('mouseup', cancel)
    element.addEventListener('mouseleave', cancel)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      element.removeEventListener('touchstart', start)
      element.removeEventListener('touchend', cancel)
      element.removeEventListener('touchcancel', cancel)
      element.removeEventListener('mousedown', start)
      element.removeEventListener('mouseup', cancel)
      element.removeEventListener('mouseleave', cancel)
    }
  }, [start, cancel, preventDefault])

  return ref
}

/**
 * Hook for preventing pull-to-refresh on mobile
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePreventPullToRefresh()
 *   return <div>Content that shouldn't trigger pull-to-refresh</div>
 * }
 * ```
 */
export function usePreventPullToRefresh() {
  useEffect(() => {
    let lastTouchY = 0
    let preventPullToRefresh = false

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      if (!touch) return
      lastTouchY = touch.clientY
      // Prevent pull-to-refresh if at the top of the page
      preventPullToRefresh = window.scrollY === 0
    }

    const touchMove = (e: TouchEvent) => {
      if (!preventPullToRefresh) return

      const touch = e.touches[0]
      if (!touch) return
      const touchY = touch.clientY
      const touchYDelta = touchY - lastTouchY
      lastTouchY = touchY

      // Prevent pull-to-refresh if scrolling down at the top
      if (touchYDelta > 0) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', touchStart, { passive: true })
    document.addEventListener('touchmove', touchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', touchStart)
      document.removeEventListener('touchmove', touchMove)
    }
  }, [])
}

/**
 * Hook for detecting double tap gestures
 * 
 * @example
 * ```tsx
 * const ref = useDoubleTap({
 *   onDoubleTap: () => console.log('Double tapped!'),
 *   delay: 300,
 * })
 * 
 * return <div ref={ref}>Double tap me!</div>
 * ```
 */
export function useDoubleTap<T extends HTMLElement = HTMLDivElement>(
  onDoubleTap: () => void,
  delay: number = 300
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null)
  const lastTapRef = useRef<number>(0)

  const handleTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      onDoubleTap()
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }, [onDoubleTap, delay])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('click', handleTap)

    return () => {
      element.removeEventListener('click', handleTap)
    }
  }, [handleTap])

  return ref
}

