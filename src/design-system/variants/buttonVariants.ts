import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed btn-press-effect touch-manipulation',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-depth-md hover:shadow-blue-depth hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200',
        outline: 'border-2 border-slate-300 bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 hover:text-slate-900 hover:border-slate-400 shadow-depth-sm hover:shadow-depth-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
        secondary: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-900 hover:from-slate-200 hover:to-gray-200 shadow-depth-sm hover:shadow-depth-md hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200',
      },
      size: {
        default: 'h-10 px-4 py-2 gap-2',
        sm: 'h-9 rounded-lg px-3 text-xs gap-1.5',
        lg: 'h-11 rounded-lg px-8 text-base gap-2.5',
        icon: 'h-10 w-10'
      },
      fullWidth: {
        true: 'w-full',
        false: ''
      },
      loading: {
        true: 'cursor-wait',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
      loading: false
    }
  }
)
