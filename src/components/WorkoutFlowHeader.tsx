// src/components/WorkoutFlowHeader.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import {
  Menu,
  X,
  Zap,
  Home,
  Dumbbell,
  History,
  User,
  LogOut,
  ArrowLeft,
  Pause,
  Play,
  SkipForward
} from 'lucide-react'

interface WorkoutFlowHeaderProps {
  title?: string
  showBackButton?: boolean
  showWorkoutControls?: boolean
  onBack?: () => void
  onPause?: () => void
  onResume?: () => void
  onSkip?: () => void
  isPaused?: boolean
  className?: string
}

export default function WorkoutFlowHeader({
  title = "Workout",
  showBackButton = true,
  showWorkoutControls = false,
  onBack,
  onPause,
  onResume,
  onSkip,
  isPaused = false,
  className = ""
}: WorkoutFlowHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const nav = useNavigate()

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Generate Workout', path: '/generate', icon: Dumbbell },
    { label: 'Workout History', path: '/history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
  ]

  const handleNavigation = (path: string) => {
    nav(path)
    setIsMenuOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      nav('/')
      setIsMenuOpen(false)
    } catch (e) {
      if (import.meta.env.MODE === 'development') {
        console.error('Sign out failed', e)
      }
      alert('Sign out failed. Please try again.')
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      nav(-1)
    }
  }

  return (
    <>
      <header className={`sticky top-0 z-50 bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-lg shadow-gray-200/20 ${className}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center group"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
              </button>
            )}
            
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                  {title}
                </h1>
                <div className="text-xs text-gray-500 font-medium">
                  neurafit
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Workout Controls */}
          {showWorkoutControls && (
            <div className="hidden sm:flex items-center gap-2">
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
              
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-medium hover:from-slate-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
              )}
            </div>
          )}

          {/* Right Section - Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 rounded-xl hover:bg-gray-100/80 transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center group"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
            ) : (
              <Menu className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
            )}
          </button>
        </div>

        {/* Mobile Workout Controls */}
        {showWorkoutControls && (
          <div className="sm:hidden px-4 pb-3">
            <div className="flex items-center justify-center gap-2">
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
              
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-medium hover:from-slate-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-20 right-6 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl">
            <div className="p-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-xl hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900 touch-manipulation min-h-[48px]"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}

              {/* Divider */}
              <div className="my-2 h-px bg-gray-200" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-xl hover:bg-red-50 transition-colors text-red-600 hover:text-red-700 touch-manipulation min-h-[48px]"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
