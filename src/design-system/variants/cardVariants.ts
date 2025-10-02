import { cva } from 'class-variance-authority'

export const cardVariants = cva(
  'border bg-white text-card-foreground transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'border-gray-200 shadow-sm',
        elevated: 'border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-lg shadow-slate-200/30',
        interactive: 'border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-300/20 hover:scale-[1.01] cursor-pointer transition-all duration-500'
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
