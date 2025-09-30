import React, { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { useRipple } from '../../components/MicroInteractions'

const cardVariants = cva(
  [
    'relative overflow-hidden transition-all duration-200',
    'bg-white border border-gray-200',
    'focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300'
  ],
  {
    variants: {
      variant: {
        default: 'shadow-sm hover:shadow-md',
        elevated: 'shadow-md hover:shadow-lg',
        floating: 'shadow-lg hover:shadow-xl',
        interactive: [
          'cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02]',
          'active:scale-[0.98] transform-gpu will-change-transform'
        ],
        gradient: [
          'bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50',
          'border-blue-100/50 shadow-sm hover:shadow-md'
        ]
      },
      
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10'
      },
      
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-lg',
        md: 'rounded-xl',
        lg: 'rounded-2xl',
        xl: 'rounded-3xl'
      },
      
      backdrop: {
        none: '',
        blur: 'backdrop-blur-sm bg-white/80',
        strong: 'backdrop-blur-md bg-white/90'
      }
    },
    
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'lg'
    }
  }
)

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
  ripple?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    size, 
    rounded, 
    backdrop,
    interactive,
    ripple = false,
    onClick,
    children,
    ...props 
  }, ref) => {
    const { addRipple, RippleContainer } = useRipple()
    
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (ripple) {
        addRipple(e)
      }
      onClick?.(e)
    }

    const cardVariant = interactive ? 'interactive' : variant

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant: cardVariant, size, rounded, backdrop }), className)}
        onClick={handleClick}
        {...props}
      >
        {ripple && <RippleContainer />}
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card sub-components
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
)

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900', className)}
      {...props}
    />
  )
)

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-600 leading-relaxed', className)}
      {...props}
    />
  )
)

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1', className)}
      {...props}
    />
  )
)

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

// Specialized card components
export const DashboardCard = forwardRef<HTMLDivElement, CardProps & {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}>(({ title, description, icon, action, children, ...props }, ref) => (
  <Card ref={ref} variant="gradient" rounded="xl" {...props}>
    {(title || description || icon || action) && (
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                {icon}
              </div>
            )}
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </CardHeader>
    )}
    <CardContent>{children}</CardContent>
  </Card>
))

export const StatsCard = forwardRef<HTMLDivElement, CardProps & {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}>(({ label, value, change, trend, icon, ...props }, ref) => {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  }

  return (
    <Card ref={ref} variant="elevated" rounded="xl" {...props}>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change && (
              <p className={cn(
                'text-xs font-medium px-2 py-1 rounded-full mt-2 inline-block',
                trend ? trendColors[trend] : trendColors.neutral
              )}>
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

DashboardCard.displayName = 'DashboardCard'
StatsCard.displayName = 'StatsCard'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants }
