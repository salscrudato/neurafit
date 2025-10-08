/**
 * Performance Monitoring Utilities
 * 
 * Provides utilities for monitoring and optimizing application performance,
 * including render tracking, memory monitoring, and performance metrics.
 */

import { useEffect, useRef } from 'react'

/**
 * Tracks component render performance
 * Only logs in development mode
 */
export function useRenderTracking(componentName: string, props?: Record<string, unknown>) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())

  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return

    renderCount.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    lastRenderTime.current = now

    console.log(`[Render] ${componentName}`, {
      renderCount: renderCount.current,
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      props,
    })
  })
}

/**
 * Tracks why a component re-rendered
 * Only logs in development mode
 */
export function useWhyDidYouUpdate(componentName: string, props: Record<string, unknown>) {
  const previousProps = useRef<Record<string, unknown> | undefined>(undefined)

  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changedProps: Record<string, { from: unknown; to: unknown }> = {}

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          }
        }
      })

      if (Object.keys(changedProps).length > 0) {
        console.log(`[Why Update] ${componentName}`, changedProps)
      }
    }

    previousProps.current = props
  })
}

/**
 * Measures the execution time of a function
 */
export function measurePerformance<T extends (...args: unknown[]) => unknown>(
  fn: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()

    if (import.meta.env.MODE === 'development') {
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`)
    }

    return result
  }) as T
}

/**
 * Measures the execution time of an async function
 */
export function measureAsyncPerformance<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  label: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now()
    const result = await fn(...args)
    const end = performance.now()

    if (import.meta.env.MODE === 'development') {
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`)
    }

    return result
  }) as T
}

/**
 * Monitors memory usage
 * Only works in browsers that support performance.memory
 */
export function useMemoryMonitor(intervalMs: number = 5000) {
  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return

    // Check if performance.memory is available (Chrome only)
    if (!('memory' in performance)) {
      console.warn('[Memory Monitor] performance.memory not available in this browser')
      return
    }

    const logMemory = () => {
      const memory = (performance as Performance & { memory?: {
        usedJSHeapSize: number
        totalJSHeapSize: number
        jsHeapSizeLimit: number
      }}).memory

      if (memory) {
        console.log('[Memory]', {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
          percentage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)}%`,
        })
      }
    }

    const interval = setInterval(logMemory, intervalMs)

    return () => {
      clearInterval(interval)
    }
  }, [intervalMs])
}

/**
 * Reports Web Vitals metrics
 */
export function reportWebVitals() {
  if (import.meta.env.MODE !== 'development') return

  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number }
    console.log('[Web Vitals] LCP:', `${lastEntry.renderTime || lastEntry.loadTime}ms`)
  })

  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch {
    // LCP not supported
  }

  // First Input Delay (FID)
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      const fidEntry = entry as PerformanceEntry & { processingStart?: number }
      const fid = fidEntry.processingStart ? fidEntry.processingStart - entry.startTime : 0
      console.log('[Web Vitals] FID:', `${fid}ms`)
    })
  })

  try {
    fidObserver.observe({ entryTypes: ['first-input'] })
  } catch {
    // FID not supported
  }

  // Cumulative Layout Shift (CLS)
  let clsScore = 0
  const clsObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      if (!layoutShiftEntry.hadRecentInput) {
        clsScore += layoutShiftEntry.value || 0
      }
    })
    console.log('[Web Vitals] CLS:', clsScore.toFixed(4))
  })

  try {
    clsObserver.observe({ entryTypes: ['layout-shift'] })
  } catch {
    // CLS not supported
  }

  // Time to First Byte (TTFB)
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navigationEntry) {
    const ttfb = navigationEntry.responseStart - navigationEntry.requestStart
    console.log('[Web Vitals] TTFB:', `${ttfb.toFixed(2)}ms`)
  }
}

/**
 * Detects slow renders and logs warnings
 */
export function useSlowRenderDetection(componentName: string, thresholdMs: number = 16) {
  const renderStartTime = useRef<number | undefined>(undefined)

  // Mark render start
  renderStartTime.current = performance.now()

  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return

    const renderTime = performance.now() - (renderStartTime.current || 0)

    if (renderTime > thresholdMs) {
      console.warn(
        `[Slow Render] ${componentName} took ${renderTime.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
      )
    }
  })
}

/**
 * Tracks long tasks (tasks that block the main thread for >50ms)
 */
export function trackLongTasks() {
  if (import.meta.env.MODE !== 'development') return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      console.warn('[Long Task]', {
        duration: `${entry.duration.toFixed(2)}ms`,
        startTime: `${entry.startTime.toFixed(2)}ms`,
      })
    })
  })

  try {
    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    console.warn('[Long Task] PerformanceObserver not supported for longtask')
  }

  return () => {
    observer.disconnect()
  }
}

/**
 * Checks if the device is low-end based on hardware concurrency and memory
 */
export function isLowEndDevice(): boolean {
  // Check CPU cores
  const cores = navigator.hardwareConcurrency || 1
  
  // Check memory (if available)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  
  // Consider low-end if:
  // - Less than 4 CPU cores
  // - Less than 4GB RAM (if available)
  return cores < 4 || (memory !== undefined && memory < 4)
}

/**
 * Gets performance recommendations based on device capabilities
 */
export function getPerformanceRecommendations() {
  const recommendations: string[] = []

  if (isLowEndDevice()) {
    recommendations.push('Reduce animations')
    recommendations.push('Disable non-essential features')
    recommendations.push('Use simpler UI components')
  }

  // Check connection speed
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
    recommendations.push('Reduce image quality')
    recommendations.push('Defer non-critical resources')
    recommendations.push('Enable aggressive caching')
  }

  return recommendations
}

