import { cva } from 'class-variance-authority'

export const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200',
        elevated: 'bg-white border-gray-200 shadow-lg',
        outlined: 'bg-transparent border-2 border-gray-300',
        filled: 'bg-gray-50 border-gray-200',
        gradient: 'bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-md',
        interactive: 'bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer'
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8'
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        default: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
        full: 'rounded-full'
      },
      backdrop: {
        true: 'backdrop-blur-sm bg-white/80',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
      backdrop: false
    }
  }
)
