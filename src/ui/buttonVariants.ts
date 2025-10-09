/**
 * Button Variants - Shared CVA configurations
 * Extracted to separate file to fix Fast Refresh warnings
 */

import { cva } from 'class-variance-authority'

// Button variants with comprehensive styling options
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:ring-blue-500',
        secondary: 'bg-white text-gray-900 border border-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 focus-visible:ring-gray-500',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:ring-green-500',
        danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:ring-red-500',
        warning: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:ring-amber-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500',
        outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-500',
      },
      size: {
        sm: 'px-3 py-2 text-sm min-h-[36px]',
        md: 'px-4 py-3 text-base min-h-[44px]',
        lg: 'px-6 py-4 text-lg min-h-[52px]',
        xl: 'px-8 py-5 text-xl min-h-[60px]',
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

// Icon Button variant
export const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 focus-visible:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:scale-95 focus-visible:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95 focus-visible:ring-red-500',
      },
      size: {
        sm: 'w-8 h-8 p-1.5 min-w-[32px] min-h-[32px]',
        md: 'w-10 h-10 p-2 min-w-[40px] min-h-[40px]',
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

