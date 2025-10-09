/**
 * Button Component - UI Primitive
 *
 * Reusable button component with comprehensive variants and features.
 * Part of the NeuraFit design system.
 *
 * Features:
 * - Multiple variants (primary, secondary, success, danger, warning, ghost, outline)
 * - Flexible sizing (sm, md, lg, xl)
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Full accessibility (ARIA labels, keyboard navigation)
 * - Memoized for performance
 */

import React, { forwardRef, memo, type ButtonHTMLAttributes } from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { buttonVariants, iconButtonVariants } from './buttonVariants'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const ButtonBase = forwardRef<HTMLButtonElement, ButtonProps>(
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
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <div
            className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    )
  }
)

ButtonBase.displayName = 'Button'

const Button = memo(ButtonBase)

export { Button }

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode
  'aria-label': string
}

const IconButtonBase = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant, size, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButtonBase.displayName = 'IconButton'

const IconButton = memo(IconButtonBase)

export { IconButton }

// Button Group
export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2',
        className
      )}
    >
      {children}
    </div>
  )
}

