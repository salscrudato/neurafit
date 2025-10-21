/**
 * Card Variants - Shared CVA configurations
 * Extracted to separate file to fix Fast Refresh warnings
 */

import { cva } from 'class-variance-authority'

// Modern Card variants - Clean, minimal, professional
export const cardVariants = cva(
  'rounded-xl transition-all duration-200',
  {
    variants: {
      variant: {
        // Default - Clean white card with subtle shadow
        default: 'bg-white shadow-sm border border-gray-100',

        // Glass - Frosted glass effect for premium feel
        glass: 'bg-white/80 backdrop-blur-md shadow-sm border border-white/40',

        // Gradient - Subtle gradient background
        gradient: 'bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/10 shadow-sm border border-gray-100',

        // Elevated - Higher elevation for emphasis
        elevated: 'bg-white shadow-md border border-gray-100',

        // Flat - Minimal, no shadow
        flat: 'bg-white border border-gray-200',

        // Outline - Bordered only
        outline: 'bg-transparent border-2 border-gray-300',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3 xs:p-4 sm:p-4',
        md: 'p-4 xs:p-5 sm:p-5',
        lg: 'p-5 xs:p-6 sm:p-6',
        xl: 'p-6 xs:p-7 sm:p-8',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-md hover:-translate-y-1 active:shadow-sm active:translate-y-0',
        glow: 'hover:shadow-lg hover:shadow-blue-500/10 active:shadow-md',
        scale: 'hover:scale-[1.01] active:scale-100',
      },
      interactive: {
        true: 'cursor-pointer active:scale-[0.99]',
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

