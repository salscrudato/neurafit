// src/components/DashboardStats.tsx
import React from 'react'
import { Floating } from './MicroInteractions'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'
  trend?: {
    value: number
    isPositive: boolean
  }
  intensity?: number
  duration?: number
}

const colorClasses = {
  blue: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200/50'
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200/50'
  },
  purple: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200/50'
  },
  orange: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200/50'
  },
  red: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200/50'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200/50'
  }
}

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  intensity = 3,
  duration = 4000
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border ${colors.border} shadow-sm hover:shadow-md transition-all duration-300 group cursor-default`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            {trend && (
              <div className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </div>
            )}
          </div>
          <div className="text-xs text-slate-600 font-medium">{label}</div>
        </div>
      </div>
    </div>
  )
}

interface StatsGridProps {
  stats: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'
    trend?: {
      value: number
      isPositive: boolean
    }
  }>
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          color={stat.color}
          trend={stat.trend}
          intensity={3 + index}
          duration={4000 + index * 200}
        />
      ))}
    </div>
  )
}

interface QuickStatsProps {
  totalWorkouts: number
  weeklyWorkouts: number
  streak: number
  className?: string
}

export function QuickStats({ totalWorkouts, weeklyWorkouts, streak, className = '' }: QuickStatsProps) {
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="text-center">
        <div className="text-2xl font-bold text-slate-700">{streak}</div>
        <div className="text-sm text-slate-600">Day Streak</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-slate-700">{weeklyWorkouts}</div>
        <div className="text-sm text-slate-600">This Week</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-slate-700">{totalWorkouts}</div>
        <div className="text-sm text-slate-600">Total</div>
      </div>
    </div>
  )
}

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  children?: React.ReactNode
}

export function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 6, 
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  children 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
