/**
 * Card Variants - Shared CVA configurations
 * Extracted to separate file to fix Fast Refresh warnings
 */

import { cva } from 'class-variance-authority'

export const cardVariants = cva(
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

