/**
 * Reusable Button Component with CVA Variants
 * 
 * Provides consistent button styling across the application with
 * multiple variants for different use cases.
 */

import { cva, type VariantProps } from 'class-variance-authority'
import type React from 'react'

export const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:ring-blue-500',
        secondary: 'bg-white text-gray-900 border border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 focus:ring-gray-500',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:ring-green-500',
        danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:ring-red-500',
        warning: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:ring-amber-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
        outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:ring-blue-500',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-6 py-4 text-lg',
        xl: 'px-8 py-5 text-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  children,
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonVariants({ variant, size, fullWidth })} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

// Icon Button variant
export const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:scale-95 focus:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95 focus:ring-red-500',
      },
      size: {
        sm: 'w-8 h-8 p-1.5',
        md: 'w-10 h-10 p-2',
        lg: 'w-12 h-12 p-2.5',
        xl: 'w-14 h-14 p-3',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode
  'aria-label': string
}

export function IconButton({
  icon,
  variant,
  size,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`${iconButtonVariants({ variant, size })} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}

// Button Group
export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ButtonGroup({
  children,
  className = '',
  orientation = 'horizontal',
}: ButtonGroupProps) {
  return (
    <div
      className={`inline-flex ${
        orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2'
      } ${className}`}
    >
      {children}
    </div>
  )
}

