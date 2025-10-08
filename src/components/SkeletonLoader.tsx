/**
 * Skeleton Loader Components
 * Prevents layout shifts during lazy loading
 */

import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
  circle?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
  circle = false,
}) => {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`animate-pulse bg-gray-200 ${
        circle ? 'rounded-full' : rounded ? 'rounded-lg' : ''
      } ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton width={200} height={32} rounded />
          <Skeleton circle width={40} height={40} />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <Skeleton width={100} height={20} className="mb-2" />
              <Skeleton width={60} height={32} />
            </div>
          ))}
        </div>

        {/* Main Action Card Skeleton */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <Skeleton width={250} height={28} className="mb-4" />
          <Skeleton width="100%" height={48} rounded />
        </div>

        {/* Recent Workouts Skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <Skeleton width={150} height={24} className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Skeleton width={180} height={20} className="mb-2" />
                  <Skeleton width={120} height={16} />
                </div>
                <Skeleton width={60} height={32} rounded />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const WorkoutListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Skeleton width={200} height={24} className="mb-2" />
              <Skeleton width={150} height={16} />
            </div>
            <Skeleton circle width={48} height={48} />
          </div>
          <div className="space-y-2">
            <Skeleton width="100%" height={12} />
            <Skeleton width="80%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

export const ExerciseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <Skeleton width={180} height={28} />
        <Skeleton circle width={40} height={40} />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton width={80} height={20} />
          <Skeleton width={100} height={20} />
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4">
          <Skeleton width="100%" height={48} rounded className="mb-3" />
          <div className="flex gap-2">
            <Skeleton width={60} height={36} rounded />
            <Skeleton width={60} height={36} rounded />
            <Skeleton width={60} height={36} rounded />
          </div>
        </div>

        <div className="flex gap-3">
          <Skeleton width="50%" height={48} rounded />
          <Skeleton width="50%" height={48} rounded />
        </div>
      </div>
    </div>
  )
}

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton circle width={80} height={80} />
          <div className="flex-1">
            <Skeleton width={150} height={28} className="mb-2" />
            <Skeleton width={200} height={16} />
          </div>
        </div>

        {/* Profile Sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
            <Skeleton width={120} height={24} className="mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton width={100} height={16} />
                  <Skeleton width={150} height={16} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const HistorySkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton width={150} height={32} />
          <Skeleton width={100} height={36} rounded />
        </div>

        {/* Workout Cards */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Skeleton width={180} height={24} className="mb-2" />
                  <Skeleton width={120} height={16} />
                </div>
                <Skeleton width={80} height={24} rounded />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[1, 2, 3].map((j) => (
                  <div key={j}>
                    <Skeleton width={60} height={16} className="mb-1" />
                    <Skeleton width={40} height={20} />
                  </div>
                ))}
              </div>

              <Skeleton width="100%" height={8} rounded />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const GenerateSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton width={250} height={32} className="mb-8" />
        
        {/* Form Sections */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
            <Skeleton width={150} height={20} className="mb-4" />
            <div className="space-y-3">
              <Skeleton width="100%" height={48} rounded />
              <Skeleton width="100%" height={48} rounded />
            </div>
          </div>
        ))}

        <Skeleton width="100%" height={56} rounded />
      </div>
    </div>
  )
}

/**
 * Generic page skeleton for lazy-loaded routes
 */
export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton width={200} height={32} className="mb-6" />
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <Skeleton width="100%" height={24} className="mb-4" />
          <Skeleton width="100%" height={16} className="mb-2" />
          <Skeleton width="90%" height={16} className="mb-2" />
          <Skeleton width="95%" height={16} />
        </div>
      </div>
    </div>
  )
}

