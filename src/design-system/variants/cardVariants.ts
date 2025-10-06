import { cva } from 'class-variance-authority'

export const cardVariants = cva(
  'border bg-white text-card-foreground transition-all duration-300 border-inner',
  {
    variants: {
      variant: {
        default: 'border-gray-200 shadow-depth-sm hover:shadow-depth-md',
        elevated: 'border-white/70 bg-gradient-to-br from-white/98 via-white/96 to-white/94 backdrop-blur-xl shadow-depth-lg hover:shadow-depth-xl',
        interactive: 'border-white/70 bg-gradient-to-br from-white/98 via-white/96 to-white/94 backdrop-blur-xl shadow-depth-lg hover:shadow-depth-xl hover:scale-[1.008] active:scale-[0.998] cursor-pointer transition-all duration-400 touch-manipulation'
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8'
      },
      rounded: {
        default: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default'
    }
  }
)
