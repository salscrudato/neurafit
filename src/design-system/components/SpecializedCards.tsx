import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, type CardProps } from './Card'

// Simplified specialized card components
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

StatsCard.displayName = 'StatsCard'
