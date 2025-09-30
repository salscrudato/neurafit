// Utility functions for handling Firebase timestamps and date conversions

export type TimestampType = string | Date | { toDate(): Date } | undefined

/**
 * Converts various timestamp formats to a Date object
 */
export function convertToDate(timestamp: TimestampType): Date {
  if (!timestamp) {
    return new Date()
  }
  
  if (timestamp instanceof Date) {
    return timestamp
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp)
  }
  
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate()
  }
  
  return new Date()
}

/**
 * Safely gets a date from a timestamp that might be undefined
 */
export function safeConvertToDate(timestamp?: TimestampType): Date {
  if (!timestamp) {
    return new Date()
  }
  return convertToDate(timestamp)
}

/**
 * Formats a timestamp to a local date string
 */
export function formatTimestamp(timestamp: TimestampType): string {
  return convertToDate(timestamp).toLocaleDateString()
}

/**
 * Safely formats a timestamp that might be undefined
 */
export function safeFormatTimestamp(timestamp?: TimestampType): string | undefined {
  if (!timestamp) return undefined
  return formatTimestamp(timestamp)
}

/**
 * Formats a timestamp to an ISO string for date inputs
 */
export function formatTimestampISO(timestamp: TimestampType): string {
  return convertToDate(timestamp).toISOString().split('T')[0]
}

/**
 * Checks if a timestamp represents a date within the last N days
 */
export function isWithinDays(timestamp: TimestampType, days: number): boolean {
  const date = convertToDate(timestamp)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= days
}
