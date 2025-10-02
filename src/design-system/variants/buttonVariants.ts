import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95',
        outline: 'border border-slate-300/60 bg-white/90 backdrop-blur-sm hover:bg-white hover:border-slate-400/80 text-slate-700 hover:text-slate-900 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95',
        secondary: 'bg-gradient-to-r from-slate-100 via-slate-100 to-gray-100 text-slate-900 hover:from-slate-200 hover:via-slate-200 hover:to-gray-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95',
      },
      size: {
        default: 'h-11 px-6 py-3 text-sm',
        sm: 'h-10 rounded-xl px-4 py-2 text-sm',
        lg: 'h-12 rounded-xl px-8 py-3 text-base font-semibold',
        icon: 'h-11 w-11'
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
