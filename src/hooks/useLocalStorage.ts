/**
 * Local Storage Hook
 * 
 * Provides a type-safe hook for managing localStorage with automatic
 * serialization, error handling, and synchronization across tabs.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseLocalStorageOptions<T> {
  /** Serializer function (default: JSON.stringify) */
  serializer?: (value: T) => string
  /** Deserializer function (default: JSON.parse) */
  deserializer?: (value: string) => T
  /** Sync across tabs (default: true) */
  syncAcrossTabs?: boolean
  /** Error handler */
  onError?: (error: Error) => void
}

/**
 * Hook for managing localStorage with type safety and synchronization
 * 
 * @example
 * ```tsx
 * const [user, setUser, removeUser] = useLocalStorage('user', null)
 * 
 * // Set value
 * setUser({ name: 'John', email: 'john@example.com' })
 * 
 * // Remove value
 * removeUser()
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    syncAcrossTabs = true,
    onError,
  } = options

  // Keep track of the key to detect changes
  const keyRef = useRef(key)

  // Read from localStorage
  const readValue = useCallback((): T => {
    // Prevent build error "window is undefined" during SSR
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? deserializer(item) : initialValue
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to read from localStorage')
      onError?.(err)
      if (import.meta.env.MODE === 'development') {
        console.warn(`Error reading localStorage key "${key}":`, error)
      }
      return initialValue
    }
  }, [key, initialValue, deserializer, onError])

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      // Prevent build error "window is undefined" during SSR
      if (typeof window === 'undefined') {
        if (import.meta.env.MODE === 'development') {
          console.warn('Tried to set localStorage value during SSR')
        }
        return
      }

      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Save to local storage
        window.localStorage.setItem(key, serializer(valueToStore))

        // Save state
        setStoredValue(valueToStore)

        // Dispatch custom event for cross-tab synchronization
        if (syncAcrossTabs) {
          window.dispatchEvent(
            new CustomEvent('local-storage-change', {
              detail: { key, value: valueToStore },
            })
          )
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to write to localStorage')
        onError?.(err)
        if (import.meta.env.MODE === 'development') {
          console.warn(`Error setting localStorage key "${key}":`, error)
        }
      }
    },
    [key, storedValue, serializer, syncAcrossTabs, onError]
  )

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    // Prevent build error "window is undefined" during SSR
    if (typeof window === 'undefined') {
      if (import.meta.env.MODE === 'development') {
        console.warn('Tried to remove localStorage value during SSR')
      }
      return
    }

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)

      // Dispatch custom event for cross-tab synchronization
      if (syncAcrossTabs) {
        window.dispatchEvent(
          new CustomEvent('local-storage-change', {
            detail: { key, value: null },
          })
        )
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to remove from localStorage')
      onError?.(err)
      if (import.meta.env.MODE === 'development') {
        console.warn(`Error removing localStorage key "${key}":`, error)
      }
    }
  }, [key, initialValue, syncAcrossTabs, onError])

  // Listen for changes to the key in other tabs/windows
  useEffect(() => {
    if (!syncAcrossTabs) return

    const handleStorageChange = (e: Event) => {
      if (e instanceof StorageEvent) {
        // Storage event from other tabs
        if (e.key === key) {
          try {
            const newValue = e.newValue
              ? deserializer(e.newValue)
              : initialValue
            setStoredValue(newValue)
          } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to parse storage event')
            onError?.(err)
          }
        }
      } else if (e instanceof CustomEvent) {
        // Custom event from same tab
        const customEvent = e as CustomEvent<{ key: string; value: T | null }>
        if (customEvent.detail.key === key) {
          setStoredValue(customEvent.detail.value ?? initialValue)
        }
      }
    }

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange)

    // Listen for custom events from same tab
    window.addEventListener('local-storage-change', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage-change', handleStorageChange)
    }
  }, [key, initialValue, deserializer, syncAcrossTabs, onError])

  // Update stored value if key changes
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key
      setStoredValue(readValue())
    }
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}

/**
 * Hook for managing sessionStorage (same API as useLocalStorage)
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options: Omit<UseLocalStorageOptions<T>, 'syncAcrossTabs'> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    onError,
  } = options

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.sessionStorage.getItem(key)
      return item ? deserializer(item) : initialValue
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to read from sessionStorage')
      onError?.(err)
      return initialValue
    }
  }, [key, initialValue, deserializer, onError])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') return

      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        window.sessionStorage.setItem(key, serializer(valueToStore))
        setStoredValue(valueToStore)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to write to sessionStorage')
        onError?.(err)
      }
    },
    [key, storedValue, serializer, onError]
  )

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      window.sessionStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to remove from sessionStorage')
      onError?.(err)
    }
  }, [key, initialValue, onError])

  return [storedValue, setValue, removeValue]
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get localStorage usage in bytes
 */
export function getLocalStorageSize(): number {
  let total = 0

  for (const key in window.localStorage) {
    if (Object.prototype.hasOwnProperty.call(window.localStorage, key)) {
      total += key.length + (window.localStorage.getItem(key)?.length || 0)
    }
  }

  return total
}

/**
 * Clear all localStorage items with a specific prefix
 */
export function clearLocalStorageByPrefix(prefix: string): void {
  const keysToRemove: string[] = []

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key))
}

