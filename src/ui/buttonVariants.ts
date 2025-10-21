/**
 * Button Variants - Shared CVA configurations
 * Extracted to separate file to fix Fast Refresh warnings
 */

import { cva } from 'class-variance-authority'

// Modern Button variants - Inspired by Google, Apple, Tesla
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        // Primary - Bold, confident, action-oriented
        primary: 'bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700 active:scale-95 focus-visible:ring-blue-500 active:shadow-sm',

        // Secondary - Subtle, supporting actions
        secondary: 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-200 active:scale-95 focus-visible:ring-gray-500',

        // Success - Positive, confirmatory actions
        success: 'bg-green-600 text-white shadow-md hover:shadow-lg hover:bg-green-700 active:scale-95 focus-visible:ring-green-500 active:shadow-sm',

        // Danger - Destructive, warning actions
        danger: 'bg-red-600 text-white shadow-md hover:shadow-lg hover:bg-red-700 active:scale-95 focus-visible:ring-red-500 active:shadow-sm',

        // Warning - Cautionary actions
        warning: 'bg-amber-600 text-white shadow-md hover:shadow-lg hover:bg-amber-700 active:scale-95 focus-visible:ring-amber-500 active:shadow-sm',

        // Ghost - Minimal, text-only
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500',

        // Outline - Bordered, secondary emphasis
        outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-500',
      },
      size: {
        sm: 'px-3 py-2 text-sm min-h-[36px]',
        md: 'px-4 py-3 text-base min-h-[44px]',
        lg: 'px-6 py-4 text-lg min-h-[48px]',
        xl: 'px-8 py-5 text-lg min-h-[56px]',
      },
      fullWidth: {
        true: 'w-full',
      },
      loading: {
        true: 'cursor-wait',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// Modern Icon Button variant - Compact, accessible
export const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white shadow-sm hover:shadow-md hover:bg-blue-700 active:scale-95 focus-visible:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-200 active:scale-95 focus-visible:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white shadow-sm hover:shadow-md hover:bg-red-700 active:scale-95 focus-visible:ring-red-500',
      },
      size: {
        sm: 'w-8 h-8 p-1.5 min-w-[36px] min-h-[36px]',
        md: 'w-10 h-10 p-2 min-w-[44px] min-h-[44px]',
        lg: 'w-12 h-12 p-2.5 min-w-[48px] min-h-[48px]',
        xl: 'w-14 h-14 p-3 min-w-[56px] min-h-[56px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

