import React, { forwardRef, memo, type ButtonHTMLAttributes } from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { buttonVariants, iconButtonVariants } from './buttonVariants'

/** ——— Button ——— */

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  /** Screen-reader text announced while loading (also used as aria-label for the spinner). */
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const ButtonBase = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      loadingText = 'Loading',
      leftIcon,
      rightIcon,
      children,
      disabled,
      type,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading }),
          className
        )}
        disabled={isDisabled}
        // Only render ARIA attribute when true to avoid noisy attributes
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        data-loading={loading ? '' : undefined}
        data-disabled={isDisabled ? '' : undefined}
        {...props}
      >
        {/* Inline grid keeps spacing consistent with/without spinner */}
        <span className="inline-grid auto-cols-max grid-flow-col items-center gap-2">
          {loading && (
            <>
              <span
                className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                role="status"
                aria-live="polite"
                aria-label={loadingText}
                aria-hidden={false}
              />
              {/* Hidden text ensures SRs have a reliable announcement string */}
              <span className="sr-only">{loadingText}</span>
            </>
          )}

          {/* Icons are hidden while loading to reduce motion and noise */}
          {!loading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}

          {/* Keep label present in both states to avoid layout shift */}
          <span>{children}</span>

          {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </span>
      </button>
    )
  }
)
ButtonBase.displayName = 'Button'
export const Button = memo(ButtonBase)

/** ——— IconButton ——— */

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode
  /** Required for non-textual controls */
  'aria-label': string
  /** Prevent accidental children usage at the type level */
  children?: never
}

const IconButtonBase = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant, size, className, type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        {icon}
      </button>
    )
  }
)
IconButtonBase.displayName = 'IconButton'
export const IconButton = memo(IconButtonBase)

/** ——— ButtonGroup ——— */

export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  /** Provide a label for SR users when the group adds meaning (e.g., “Editor actions”). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  ...a11y
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      {...a11y}
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