// src/components/AppHeader.tsx
import { useState, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Menu, X, Zap, Home, Dumbbell, History, User, LogOut, type LucideIcon } from 'lucide-react'
import { usePrefetchOnIdle, usePrefetchOnHover } from '../hooks/usePrefetch'
import { logger } from '../lib/logger'

// MenuItem component to properly use hooks - memoized to prevent re-renders
const MenuItem = memo(function MenuItem({
  path,
  icon: Icon,
  label,
  onClick
}: {
  path: string
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  const prefetchProps = usePrefetchOnHover(path)

  return (
    <button
      onClick={onClick}
      {...prefetchProps}
      className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-xl hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900 touch-manipulation min-h-[48px]"
      aria-label={`Navigate to ${label}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="font-medium">{label}</span>
    </button>
  )
})

export default function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const nav = useNavigate()

  // Prefetch critical routes on idle
  usePrefetchOnIdle(['/generate', '/history'], 2000)

  // Memoize menu items to prevent recreation on every render
  const menuItems = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Generate Workout', path: '/generate', icon: Dumbbell },
    { label: 'Workout History', path: '/history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
  ], [])

  // Memoize navigation handler to prevent recreation
  const handleNavigation = useCallback((path: string) => {
    nav(path)
    setIsMenuOpen(false)
  }, [nav])

  // Memoize sign out handler to prevent recreation
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth)
      nav('/')
      setIsMenuOpen(false)
    } catch (e) {
      logger.error('Sign out failed', e as Error)
      alert('Sign out failed. Please try again.')
    }
  }, [nav])

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-enhanced border-b border-gray-100" role="banner">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2 flex items-center justify-between" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
          {/* Logo */}
          <button
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] min-w-[44px]"
            aria-label="NeuraFit - Go to Dashboard"
          >
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-gray-900 tracking-tight">neurafit</span>
          </button>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 text-gray-700" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5 text-gray-700" aria-hidden="true" />
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
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <nav
            id="mobile-menu"
            className="fixed top-16 right-6 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="p-2">
              {menuItems.map((item) => {
                const Icon = item.icon

                return (
                  <MenuItem
                    key={item.path}
                    path={item.path}
                    icon={Icon}
                    label={item.label}
                    onClick={() => handleNavigation(item.path)}
                  />
                )
              })}

              {/* Divider */}
              <div className="my-2 h-px bg-gray-200" role="separator" aria-hidden="true" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-xl hover:bg-red-50 transition-colors text-red-600 hover:text-red-700 touch-manipulation min-h-[48px]"
                aria-label="Sign out of NeuraFit"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  )
}
