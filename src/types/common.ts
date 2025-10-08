/**
 * Common TypeScript Types and Utilities
 * 
 * Provides reusable type definitions and type utilities for better
 * type safety across the application.
 */

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Makes all properties of T required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

/**
 * Makes all properties of T readonly recursively
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * Extracts the type of a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T

/**
 * Makes specific keys K of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Makes specific keys K of T required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Extracts keys of T where the value type is V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]

/**
 * Creates a union of all possible paths through an object
 */
export type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
        : never
    }[keyof T]
  : ''

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Status types for async operations
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Generic async state
 */
export interface AsyncState<T, E = Error> {
  data: T | null
  error: E | null
  status: AsyncStatus
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  field: keyof T
  direction: SortDirection
}

/**
 * Filter operator
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'

/**
 * Filter configuration
 */
export interface FilterConfig<T> {
  field: keyof T
  operator: FilterOperator
  value: unknown
}

/**
 * API error response
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * API success response
 */
export interface ApiResponse<T> {
  data: T
  message?: string
  timestamp: string
}

/**
 * Form field error
 */
export interface FieldError {
  field: string
  message: string
  type?: string
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: FieldError[]
}

/**
 * Coordinates
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Date range
 */
export interface DateRange {
  start: Date
  end: Date
}

/**
 * Time range
 */
export interface TimeRange {
  start: string // HH:mm format
  end: string // HH:mm format
}

/**
 * File metadata
 */
export interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: number
  url?: string
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends'
    showActivity: boolean
  }
}

/**
 * Notification
 */
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

/**
 * Toast notification
 */
export interface Toast {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  type?: 'info' | 'success' | 'warning' | 'error'
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType
}

/**
 * Tab item
 */
export interface TabItem {
  id: string
  label: string
  icon?: React.ComponentType
  disabled?: boolean
  badge?: string | number
}

/**
 * Menu item
 */
export interface MenuItem {
  id: string
  label: string
  icon?: React.ComponentType
  href?: string
  onClick?: () => void
  disabled?: boolean
  children?: MenuItem[]
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
}

/**
 * Chart series
 */
export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
}

/**
 * Utility type for extracting component props
 */
export type ComponentProps<T> = T extends { new (...args: unknown[]): { props: infer P } }
  ? P
  : T extends (props: infer P) => unknown
  ? P
  : never

/**
 * Utility type for making a type nullable
 */
export type Nullable<T> = T | null

/**
 * Utility type for making a type optional
 */
export type Optional<T> = T | undefined

/**
 * Utility type for making a type nullable or optional
 */
export type Maybe<T> = T | null | undefined

/**
 * Utility type for extracting array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never

/**
 * Utility type for creating a discriminated union
 */
export type DiscriminatedUnion<K extends string, T extends Record<string, unknown>> = {
  [P in keyof T]: { [key in K]: P } & T[P]
}[keyof T]

