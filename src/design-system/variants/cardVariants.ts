import { cva } from 'class-variance-authority'

export const cardVariants = cva(
  'rounded-lg border bg-white border-gray-200 text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-lg',
        interactive: 'hover:shadow-md transition-shadow cursor-pointer'
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8'
      },
      rounded: {
        default: 'rounded-lg',
        xl: 'rounded-xl'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default'
    }
  }
)
