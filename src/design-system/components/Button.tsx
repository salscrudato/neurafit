import React, { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Button variants using class-variance-authority for type-safe styling
const buttonVariants = cva(
  // Base styles - common to all buttons
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-sm leading-none',
    'rounded-xl border transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none touch-manipulation',
    // Micro-interactions
    'active:scale-[0.98] hover:scale-[1.02]',
    'transform-gpu will-change-transform'
  ],
  {
    variants: {
      variant: {
        // Primary - Main call-to-action
        primary: [
          'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent',
          'hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25',
          'focus-visible:ring-blue-500',
          'active:from-blue-700 active:to-indigo-800'
        ],
        
        // Secondary - Supporting actions
        secondary: [
          'bg-white text-gray-900 border-gray-200',
          'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md',
          'focus-visible:ring-gray-500',
          'active:bg-gray-100'
        ],
        
        // Success - Positive actions
        success: [
          'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent',
          'hover:from-emerald-600 hover:to-green-700 hover:shadow-lg hover:shadow-emerald-500/25',
          'focus-visible:ring-emerald-500',
          'active:from-emerald-700 active:to-green-800'
        ],
        
        // Warning - Caution actions
        warning: [
          'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent',
          'hover:from-amber-600 hover:to-orange-700 hover:shadow-lg hover:shadow-amber-500/25',
          'focus-visible:ring-amber-500',
          'active:from-amber-700 active:to-orange-800'
        ],
        
        // Danger - Destructive actions
        danger: [
          'bg-gradient-to-r from-red-500 to-red-600 text-white border-transparent',
          'hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/25',
          'focus-visible:ring-red-500',
          'active:from-red-700 active:to-red-800'
        ],
        
        // Ghost - Subtle actions
        ghost: [
          'bg-transparent text-gray-700 border-transparent',
          'hover:bg-gray-100 hover:text-gray-900',
          'focus-visible:ring-gray-500',
          'active:bg-gray-200'
        ],
        
        // Outline - Alternative style
        outline: [
          'bg-transparent text-gray-700 border-gray-300',
          'hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400',
          'focus-visible:ring-gray-500',
          'active:bg-gray-100'
        ]
      },
      
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-11 w-11 p-0'
      },
      
      fullWidth: {
        true: 'w-full'
      },
      
      loading: {
        true: 'cursor-wait'
      }
    },
    
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    loading, 
    leftIcon, 
    rightIcon, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {!loading && leftIcon && leftIcon}
        {children}
        {!loading && rightIcon && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }

// Specialized button components
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
)

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
)

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="success" {...props} />
)

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
)

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
)

PrimaryButton.displayName = 'PrimaryButton'
SecondaryButton.displayName = 'SecondaryButton'
SuccessButton.displayName = 'SuccessButton'
DangerButton.displayName = 'DangerButton'
GhostButton.displayName = 'GhostButton'
