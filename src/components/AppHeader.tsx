// src/components/AppHeader.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Menu, X, Zap, Home, Dumbbell, History, User, LogOut } from 'lucide-react'

export default function AppHeader() {
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
      console.error('Sign out failed', e)
      alert('Sign out failed. Please try again.')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-enhanced border-b border-gray-100 safe-area-inset-top">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight">neurafit</span>
          </button>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 text-gray-700" />
            ) : (
              <Menu className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>
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
          <div className="fixed top-16 right-6 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl">
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
