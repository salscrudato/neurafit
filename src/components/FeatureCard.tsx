import type { ReactElement } from 'react'

interface FeatureCardProps {
  icon: ReactElement
  title: string
  desc: string
  bgGradient: string
  iconBg: string
  accentColor: 'blue' | 'emerald' | 'orange'
}

const accentColorMap = {
  blue: {
    border: 'border-blue-100/60',
    glow: 'group-hover:shadow-blue-500/15',
    text: 'text-blue-600',
    shimmer: 'from-blue-500/5 via-indigo-500/5 to-purple-500/5'
  },
  emerald: {
    border: 'border-emerald-100/60',
    glow: 'group-hover:shadow-emerald-500/15',
    text: 'text-emerald-600',
    shimmer: 'from-emerald-500/5 via-teal-500/5 to-cyan-500/5'
  },
  orange: {
    border: 'border-orange-100/60',
    glow: 'group-hover:shadow-orange-500/15',
    text: 'text-orange-600',
    shimmer: 'from-orange-500/5 via-amber-500/5 to-yellow-500/5'
  }
} as const

/**
 * Premium Feature Card Component
 * Displays a feature with icon, title, and description
 * Includes hover effects and smooth animations
 */
export default function FeatureCard({
  icon,
  title,
  desc,
  bgGradient,
  iconBg,
  accentColor,
}: FeatureCardProps) {
  const colors = accentColorMap[accentColor]

  return (
    <div className={`group relative p-5 xs:p-6 sm:p-7 rounded-[20px] xs:rounded-[22px] sm:rounded-[24px] border ${colors.border} bg-white/70 backdrop-blur-xl hover:bg-white hover:shadow-2xl ${colors.glow} transition-all duration-700 hover:scale-[1.01] overflow-hidden shadow-lg shadow-gray-200/50`}>
      {/* Animated shimmer background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.shimmer} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-30 group-hover:opacity-0 transition-opacity duration-700`} />

      <div className="relative z-10 flex items-start gap-4 xs:gap-4.5 sm:gap-5">
        {/* Premium Icon Container */}
        <div className="relative flex-shrink-0">
          <div className={`w-14 xs:w-15 sm:w-16 h-14 xs:h-15 sm:h-16 bg-gradient-to-br ${iconBg} rounded-[16px] xs:rounded-[18px] sm:rounded-[20px] flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          {/* Icon glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${iconBg} rounded-[16px] xs:rounded-[18px] sm:rounded-[20px] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700`} />
        </div>

        {/* Content */}
        <div className="flex-1 text-left pt-0.5 xs:pt-0.5 sm:pt-1">
          <h3 className="text-lg xs:text-lg sm:text-xl font-bold text-gray-900 mb-1.5 xs:mb-2 sm:mb-2.5 group-hover:text-gray-800 transition-colors duration-500 tracking-tight">
            {title}
          </h3>
          <p className="text-gray-600 text-sm xs:text-sm sm:text-[15px] leading-relaxed group-hover:text-gray-700 transition-colors duration-500 font-normal">
            {desc}
          </p>
        </div>

        {/* Subtle arrow indicator */}
        <div className={`flex-shrink-0 w-5 xs:w-5.5 sm:w-6 h-5 xs:h-5.5 sm:h-6 ${colors.text} opacity-0 group-hover:opacity-60 transition-all duration-500 group-hover:translate-x-1 mt-0.5 xs:mt-0.5 sm:mt-1`}>
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

