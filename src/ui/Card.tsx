/**
 * Card Component - UI Primitive
 *
 * Reusable card component with comprehensive variants and features.
 * Part of the NeuraFit design system.
 *
 * Features:
 * - Multiple variants (default, glass, gradient, elevated, flat, outline)
 * - Flexible sizing and padding
 * - Hover effects (lift, glow, scale)
 * - Interactive mode with keyboard support
 * - Sub-components (Header, Title, Description, Content, Footer)
 * - Memoized for performance
 */

import React, { forwardRef, memo, type HTMLAttributes } from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { cardVariants } from './cardVariants'

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
  rounded?: 'sm' | 'md' | 'lg' | '2xl'
}

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant,
    padding,
    hover,
    interactive,
    rounded,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, hover, interactive }),
          rounded === 'sm' && 'rounded-lg',
          rounded === 'md' && 'rounded-xl',
          rounded === 'lg' && 'rounded-2xl',
          rounded === '2xl' && 'rounded-2xl',
          className
        )}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardBase.displayName = 'Card'

const Card = memo(CardBase)

// Card sub-components
const CardHeaderBase = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
)
CardHeaderBase.displayName = 'CardHeader'
const CardHeader = memo(CardHeaderBase)

const CardTitleBase = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }>(
  ({ className, level = 3, ...props }, ref) => {
    const Component = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : level === 4 ? 'h4' : level === 5 ? 'h5' : 'h6'
    return React.createElement(
      Component,
      {
        ref,
        className: cn('text-lg font-semibold leading-none tracking-tight text-gray-900', className),
        ...props
      }
    )
  }
)
CardTitleBase.displayName = 'CardTitle'
const CardTitle = memo(CardTitleBase)

const CardDescriptionBase = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-600 leading-relaxed', className)}
      {...props}
    />
  )
)
CardDescriptionBase.displayName = 'CardDescription'
const CardDescription = memo(CardDescriptionBase)

const CardContentBase = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1', className)}
      {...props}
    />
  )
)
CardContentBase.displayName = 'CardContent'
const CardContent = memo(CardContentBase)

const CardFooterBase = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
)
CardFooterBase.displayName = 'CardFooter'
const CardFooter = memo(CardFooterBase)



export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
}
