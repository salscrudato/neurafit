// src/components/SkeletonLoaders.tsx
import React from 'react'

// Enhanced skeleton component with improved shimmer animation and accessibility
export function SkeletonBase({
  className = '',
  children,
  variant = 'default',
  speed = 'normal'
}: {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  speed?: 'slow' | 'normal' | 'fast';
}) {
  const speedClasses = {
    slow: 'animate-shimmer-slow',
    normal: 'animate-shimmer',
    fast: 'animate-shimmer-fast'
  }

  const variantClasses = {
    default: 'rounded',
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${speedClasses[speed]} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading content"
    >
      {children}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Workout History Page Skeleton
export function WorkoutHistorySkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-6 rounded-lg" />
            <SkeletonBase className="h-5 w-20" />
          </div>
          <SkeletonBase className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <SkeletonBase className="inline-block h-8 w-32 rounded-full mb-4" />
          <SkeletonBase className="h-8 w-64 mx-auto mb-2" />
          <SkeletonBase className="h-4 w-96 mx-auto" />
        </div>

        {/* Workout List Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <WorkoutCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}

// Individual workout card skeleton
export function WorkoutCardSkeleton() {
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <SkeletonBase className="h-6 w-48 mb-2" />
          <div className="flex items-center gap-4">
            <SkeletonBase className="h-4 w-24" />
            <SkeletonBase className="h-4 w-16" />
          </div>
        </div>
        <SkeletonBase className="h-16 w-16 rounded-xl" />
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-4">
        <div className="text-center">
          <SkeletonBase className="h-6 w-8 mb-1" />
          <SkeletonBase className="h-3 w-12" />
        </div>
        <div className="text-center">
          <SkeletonBase className="h-6 w-8 mb-1" />
          <SkeletonBase className="h-3 w-8" />
        </div>
        <div className="text-center">
          <SkeletonBase className="h-6 w-12 mb-1" />
          <SkeletonBase className="h-3 w-16" />
        </div>
      </div>

      {/* Exercise Preview */}
      <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <SkeletonBase className="h-4 w-32 mb-1" />
              <SkeletonBase className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Workout Detail Page Skeleton
export function WorkoutDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative text-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-6 rounded-lg" />
            <SkeletonBase className="h-5 w-20" />
          </div>
          <SkeletonBase className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Workout Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <SkeletonBase className="h-8 w-48 mb-3" />
              <div className="flex items-center gap-4">
                <SkeletonBase className="h-4 w-24" />
                <SkeletonBase className="h-4 w-16" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <SkeletonBase className="h-8 w-12 mx-auto mb-2" />
                <SkeletonBase className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <ExerciseDetailSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}

// Individual exercise detail skeleton
export function ExerciseDetailSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <SkeletonBase className="h-6 w-48 mb-2" />
          <SkeletonBase className="h-4 w-32" />
        </div>
        <SkeletonBase className="h-12 w-12 rounded-full" />
      </div>

      {/* Weight Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <SkeletonBase className="h-4 w-4" />
          <SkeletonBase className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <SkeletonBase className="h-6 w-12 mx-auto mb-1" />
              <SkeletonBase className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Sets */}
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <SkeletonBase className="h-4 w-16" />
            <SkeletonBase className="h-4 w-20" />
            <SkeletonBase className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Generate Page Skeleton
export function GeneratePageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-6 rounded-lg" />
            <SkeletonBase className="h-5 w-20" />
          </div>
          <SkeletonBase className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-16 pt-6">
        {/* Hero card */}
        <section className="rounded-3xl border border-blue-100/50 bg-white/70 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden shadow-lg mb-8">
          <SkeletonBase className="h-10 w-80 mb-2" />
          <SkeletonBase className="h-4 w-96" />
        </section>

        {/* Form sections */}
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <section key={i} className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-sm">
              <SkeletonBase className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, j) => (
                  <SkeletonBase key={j} className="h-12 rounded-xl" />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Generate button */}
        <div className="mt-8 flex justify-end">
          <SkeletonBase className="h-12 w-40 rounded-xl" />
        </div>
      </main>
    </div>
  )
}

// Profile Page Skeleton
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-6 rounded-lg" />
            <SkeletonBase className="h-5 w-20" />
          </div>
          <SkeletonBase className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-6 pb-14 pt-6">
        {/* Identity */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
          <SkeletonBase className="h-4 w-20 mb-1" />
          <SkeletonBase className="h-6 w-48" />
        </div>

        {/* Editable sections */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
              <SkeletonBase className="h-5 w-24 mb-1" />
              <SkeletonBase className="h-3 w-40 mb-4" />
              <div className="flex flex-wrap gap-2">
                {[...Array(3)].map((_, j) => (
                  <SkeletonBase key={j} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="mt-8 flex justify-end">
          <SkeletonBase className="h-12 w-32 rounded-xl" />
        </div>
      </main>
    </div>
  )
}
