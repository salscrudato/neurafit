/**
 * Mobile-Optimized Skeleton Components
 *
 * Provides lightweight skeleton loaders optimized for mobile devices
 * with reduced animations and better performance.
 */

import React, { memo } from 'react'

interface SkeletonProps {
  className?: string
  animate?: boolean
  width?: string | number
  height?: string | number
  circle?: boolean
}

/**
 * Base skeleton component
 */
export const Skeleton = memo(function Skeleton({
  className = '',
  animate = true,
  width,
  height,
  circle = false,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      className={`
        bg-gray-200 
        ${animate ? 'animate-pulse' : ''} 
        ${circle ? 'rounded-full' : 'rounded-lg'}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  )
})

/**
 * Skeleton for text lines
 */
export const SkeletonText = memo(function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
})

/**
 * Skeleton for cards
 */
export const SkeletonCard = memo(function SkeletonCard({
  className = '',
  hasImage = false,
}: {
  className?: string
  hasImage?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      {hasImage && <Skeleton height={200} className="mb-4" />}
      <Skeleton height={24} width="70%" className="mb-2" />
      <SkeletonText lines={2} />
    </div>
  )
})

/**
 * Skeleton for list items
 */
export const SkeletonListItem = memo(function SkeletonListItem({
  className = '',
  hasAvatar = false,
}: {
  className?: string
  hasAvatar?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      {hasAvatar && <Skeleton circle width={48} height={48} />}
      <div className="flex-1">
        <Skeleton height={16} width="60%" className="mb-2" />
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  )
})

/**
 * Skeleton for workout card
 */
export const SkeletonWorkoutCard = memo(function SkeletonWorkoutCard({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton height={24} width={120} />
        <Skeleton circle width={40} height={40} />
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2 mt-4">
        <Skeleton height={32} width={80} />
        <Skeleton height={32} width={80} />
      </div>
    </div>
  )
})

/**
 * Skeleton for dashboard stats
 */
export const SkeletonDashboardStats = memo(function SkeletonDashboardStats({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
          <Skeleton height={16} width="50%" className="mb-2" />
          <Skeleton height={32} width="70%" />
        </div>
      ))}
    </div>
  )
})

/**
 * Skeleton for exercise card
 */
export const SkeletonExerciseCard = memo(function SkeletonExerciseCard({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton height={20} width="70%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
        <Skeleton circle width={32} height={32} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton circle width={24} height={24} />
            <Skeleton height={16} width="30%" />
          </div>
        ))}
      </div>
    </div>
  )
})

/**
 * Full page skeleton loader
 */
export const SkeletonPage = memo(function SkeletonPage({
  type = 'default',
}: {
  type?: 'default' | 'dashboard' | 'workout' | 'profile'
}) {
  if (type === 'dashboard') {
    return (
      <div className="p-4 space-y-6">
        <Skeleton height={40} width="60%" />
        <SkeletonDashboardStats />
        <div className="space-y-4">
          <SkeletonWorkoutCard />
          <SkeletonWorkoutCard />
        </div>
      </div>
    )
  }

  if (type === 'workout') {
    return (
      <div className="p-4 space-y-4">
        <Skeleton height={48} width="100%" />
        <div className="space-y-3">
          <SkeletonExerciseCard />
          <SkeletonExerciseCard />
          <SkeletonExerciseCard />
        </div>
      </div>
    )
  }

  if (type === 'profile') {
    return (
      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center">
          <Skeleton circle width={96} height={96} className="mb-4" />
          <Skeleton height={24} width={150} className="mb-2" />
          <Skeleton height={16} width={200} />
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <Skeleton height={40} width="70%" />
      <SkeletonText lines={5} />
      <div className="space-y-3">
        <SkeletonCard hasImage />
        <SkeletonCard hasImage />
      </div>
    </div>
  )
})

/**
 * Shimmer effect for better perceived performance
 */
export const ShimmerEffect = memo(function ShimmerEffect({
  className = '',
}: {
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  )
})

