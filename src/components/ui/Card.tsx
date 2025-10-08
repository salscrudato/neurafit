/**
 * Reusable Card Component with CVA Variants
 * 
 * Provides consistent card styling across the application with
 * multiple variants for different use cases.
 */

import { cva, type VariantProps } from 'class-variance-authority'
import type React from 'react'

// Card variants using CVA
export const cardVariants = cva(
  // Base styles
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white shadow-lg border border-white/80',
        glass: 'bg-white/95 backdrop-blur-xl shadow-lg border border-white/80',
        gradient: 'bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl shadow-lg border border-white/80',
        elevated: 'bg-white shadow-xl border border-gray-100',
        flat: 'bg-white border border-gray-200',
        outline: 'bg-transparent border-2 border-gray-300',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-5',
        lg: 'p-5 sm:p-6',
        xl: 'p-6 sm:p-8',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-xl hover:-translate-y-1',
        glow: 'hover:shadow-2xl hover:shadow-blue-500/10',
        scale: 'hover:scale-[1.02]',
      },
      interactive: {
        true: 'cursor-pointer active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: 'none',
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
}

export function Card({
  children,
  variant,
  padding,
  hover,
  interactive,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`${cardVariants({ variant, padding, hover, interactive })} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Stat Card variant
export const statCardVariants = cva(
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white shadow-lg border border-white/80',
        gradient: 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border border-blue-100',
        success: 'bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg border border-green-100',
        warning: 'bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg border border-amber-100',
        info: 'bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg border border-cyan-100',
      },
      size: {
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-5',
        lg: 'p-5 sm:p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant,
  size,
  className = '',
  ...props
}: StatCardProps) {
  return (
    <div
      className={`${statCardVariants({ variant, size })} ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p
              className={`text-xs font-medium mt-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/50 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Action Card variant
export const actionCardVariants = cva(
  'rounded-2xl transition-all duration-300 cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl',
        secondary: 'bg-white text-gray-900 shadow-lg border border-white/80 hover:shadow-xl hover:-translate-y-1',
        success: 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl',
        danger: 'bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl',
      },
      size: {
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-5',
        lg: 'p-5 sm:p-6',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
)

export interface ActionCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof actionCardVariants> {
  title: string
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  variant,
  size,
  className = '',
  ...props
}: ActionCardProps) {
  return (
    <div
      className={`${actionCardVariants({ variant, size })} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      {...props}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold mb-1">{title}</h3>
          {description && (
            <p className="text-sm opacity-90 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Workout Card variant
export const workoutCardVariants = cva(
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-white shadow-lg border border-white/80 hover:shadow-xl hover:-translate-y-1',
        completed: 'bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg border border-green-100 hover:shadow-xl',
        inProgress: 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border border-blue-100 hover:shadow-xl',
      },
      interactive: {
        true: 'cursor-pointer active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: true,
    },
  }
)

export interface WorkoutCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof workoutCardVariants> {
  children: React.ReactNode
}

export function WorkoutCard({
  children,
  variant,
  interactive,
  className = '',
  ...props
}: WorkoutCardProps) {
  return (
    <div
      className={`${workoutCardVariants({ variant, interactive })} p-4 sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

