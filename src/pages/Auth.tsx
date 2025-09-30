// src/pages/Auth.tsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth'
import { Zap, Brain, Target, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import type { ReactElement } from 'react'
import { trackUserSignUp, trackUserLogin } from '../lib/firebase-analytics'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Initialize component and performance optimizations
  useEffect(() => {
    setLoading(false)

    // Optimize animations for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    }
  }, [])

  const googleLogin = async () => {
    setLoading(true)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })

    try {
      // Try popup first
      const result = await signInWithPopup(auth, provider)
      // Track successful Google sign in
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
      if (isNewUser) {
        trackUserSignUp('google')
      } else {
        trackUserLogin('google')
      }
      // Success - SessionProvider will handle the rest
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string }
      // Suppress COOP-related console errors as they're expected in development
      if (!firebaseError.message?.includes('Cross-Origin-Opener-Policy')) {
        console.log('Popup failed, trying redirect:', firebaseError.code)
      }

      // If popup fails due to COOP or being blocked, fall back to redirect
      if (firebaseError.code === 'auth/popup-blocked' ||
          firebaseError.code === 'auth/popup-closed-by-user' ||
          (error as Error)?.message?.includes('Cross-Origin-Opener-Policy') ||
          (error as Error)?.message?.includes('window.closed')) {
        try {
          await signInWithRedirect(auth, provider)
          // Redirect will happen, don't set loading to false
          return
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError)
          alert('Failed to sign in with Google. Please try again.')
        }
      } else if (firebaseError.code !== 'auth/cancelled-popup-request') {
        // Only show error for non-cancellation errors
        console.error('Google sign-in error:', firebaseError)
        alert('Failed to sign in with Google. Please try again.')
      }
      setLoading(false)
    }
  }

  const validateForm = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError('Email is required')
      isValid = false
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      isValid = false
    }

    // Confirm password validation for signup
    if (authMode === 'signup' && password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      isValid = false
    }

    return isValid
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
        trackUserSignUp('email')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        trackUserLogin('email')
      }
      // Success - SessionProvider will handle the rest
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string }
      console.error('Email auth error:', firebaseError)

      // Handle specific Firebase auth errors
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setEmailError('An account with this email already exists')
          break
        case 'auth/weak-password':
          setPasswordError('Password is too weak')
          break
        case 'auth/user-not-found':
          setEmailError('No account found with this email')
          break
        case 'auth/wrong-password':
          setPasswordError('Incorrect password')
          break
        case 'auth/invalid-email':
          setEmailError('Invalid email address')
          break
        case 'auth/too-many-requests':
          setPasswordError('Too many failed attempts. Please try again later.')
          break
        default:
          setPasswordError('Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setEmailError('')
    setPasswordError('')
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900 relative overflow-hidden" role="main" aria-label="NeuraFit Authentication Page">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.04),transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.02)_50%,transparent_75%)]" />

      {/* Floating Elements - Optimized with will-change and reduced motion support */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-xl animate-float will-change-transform" style={{'--float-intensity': '-8px'} as React.CSSProperties} />
      <div className="absolute top-40 right-16 w-16 h-16 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-xl animate-float will-change-transform" style={{'--float-intensity': '-12px'} as React.CSSProperties} />
      <div className="absolute bottom-32 left-20 w-12 h-12 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-xl animate-float will-change-transform" style={{'--float-intensity': '-6px'} as React.CSSProperties} />

      {/* Main Content */}
      <div className="relative max-w-md mx-auto px-6 py-8 sm:py-12 animate-fade-in-up safe-area-inset-top safe-area-inset-bottom" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {/* Enhanced Header Badge */}
        <div className="flex items-center justify-center mb-8 sm:mb-12">
          <div className="group inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-100/60 rounded-full shadow-sm hover:shadow-lg transition-all duration-500 hover:scale-105 cursor-default touch-manipulation">
            <div className="relative">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-blue-700 tracking-wide group-hover:text-blue-800 transition-colors duration-300">
              AI-Powered Fitness Technology
            </span>
          </div>
        </div>

        {/* Enhanced Hero Title */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6 sm:mb-8 tracking-tight px-2" role="heading" aria-level={1}>
            <span className="block mb-1 sm:mb-2">Transform Your Body</span>
            <span className="block mb-1 sm:mb-2">with{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI-Powered
              </span>
            </span>
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Precision
            </span>
          </h1>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed max-w-sm mx-auto mb-6 px-4">
            Experience personalized workout plans that evolve with you. Our advanced AI
            analyzes your progress, adapts to your goals, and delivers{' '}
            <span className="text-blue-600 font-semibold">results that matter.</span>
          </p>

        </div>

        {/* Enhanced CTA Buttons */}
        <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <button
            onClick={googleLogin}
            disabled={loading}
            className="group relative w-full bg-white/80 backdrop-blur-sm border border-gray-200/80 text-gray-700 px-6 py-4 sm:py-4 rounded-2xl font-semibold hover:bg-white hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden touch-manipulation min-h-[48px]"
            aria-label="Sign in with Google"
            type="button"
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Google glyph */}
            <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.94 0 7.48 1.53 10.2 4.02l6.8-6.8C36.84 2.61 30.77 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.96 6.18C12.3 13 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.75H24v9.01h12.65c-.55 2.94-2.23 5.43-4.74 7.11l7.24 5.62C43.99 36.76 46.5 30.79 46.5 24z"/>
              <path fill="#FBBC05" d="M10.52 27.6A14.47 14.47 0 0 1 9.5 24c0-1.25.17-2.46.48-3.6l-7.96-6.18A24 24 0 0 0 0 24c0 3.84.9 7.47 2.5 10.68l8.02-7.08z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.83l-7.24-5.62c-2.01 1.36-4.59 2.16-8.66 2.16-6.26 0-11.7-3.5-13.48-8.52l-8.02 7.08C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="transition-colors duration-300 group-hover:text-gray-800 relative z-10 flex items-center gap-2">
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>

            {/* Loading shimmer effect */}
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </button>

          {/* Enhanced Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/60"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-6 py-2 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 backdrop-blur-sm text-gray-500 font-medium text-sm rounded-full border border-gray-100/50 shadow-sm">
                or continue with email
              </span>
            </div>
          </div>

          {/* Enhanced Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-5" role="form" aria-label="Email and password authentication form">
            {/* Enhanced Email Input */}
            <div className="group">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md touch-manipulation min-h-[48px] text-base ${
                    emailError
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500 animate-shake'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                  disabled={loading}
                  aria-invalid={emailError ? 'true' : 'false'}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
                {/* Focus ring enhancement */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              {emailError && (
                <p id="email-error" className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {emailError}
                </p>
              )}
            </div>

            {/* Enhanced Password Input */}
            <div className="group">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-4 rounded-2xl border font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md touch-manipulation min-h-[48px] text-base ${
                    passwordError
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500 animate-shake'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                  disabled={loading}
                  aria-invalid={passwordError ? 'true' : 'false'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg p-1 transition-all duration-200 hover:scale-110"
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {/* Focus ring enhancement */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              {passwordError && (
                <p id="password-error" className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {passwordError}
                </p>
              )}
            </div>

            {/* Enhanced Confirm Password Input (only for signup) */}
            {authMode === 'signup' && (
              <div className="group animate-fade-in-up">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-gray-300 hover:shadow-md font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                    disabled={loading}
                  />
                  {/* Focus ring enhancement */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Enhanced Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg overflow-hidden group touch-manipulation min-h-[48px]"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />

              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {loading ? 'Please wait...' : (authMode === 'signup' ? 'Create Account' : 'Sign In')}
              </span>
            </button>

            {/* Enhanced Toggle Auth Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={toggleAuthMode}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 disabled:opacity-60 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                {authMode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </div>

        {/* Enhanced Why Choose NeuraFit Section */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                NeuraFit
              </span>
              ?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-lg mx-auto">
              Experience the perfect blend of cutting-edge AI technology and personalized fitness coaching
            </p>
          </div>

          {/* Enhanced Feature Cards */}
          <div className="space-y-6">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <EnhancedFeatureCard
                icon={<Brain className="h-7 w-7" />}
                title="AI-Powered Workouts"
                desc="Personalized training plans that adapt to your progress and goals using advanced machine learning algorithms."
                bgGradient="from-blue-500/10 via-indigo-500/10 to-purple-500/10"
                iconBg="from-blue-500 to-indigo-600"
                accentColor="blue"
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <EnhancedFeatureCard
                icon={<Target className="h-7 w-7" />}
                title="Goal-Focused Training"
                desc="Every workout is optimized to help you reach your specific fitness objectives faster and more efficiently."
                bgGradient="from-emerald-500/10 via-teal-500/10 to-cyan-500/10"
                iconBg="from-emerald-500 to-teal-600"
                accentColor="emerald"
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <EnhancedFeatureCard
                icon={<Shield className="h-7 w-7" />}
                title="Safety First"
                desc="Built-in injury prevention with intelligent form guidance and personalized recovery recommendations."
                bgGradient="from-orange-500/10 via-amber-500/10 to-yellow-500/10"
                iconBg="from-orange-500 to-amber-600"
                accentColor="orange"
              />
            </div>
          </div>
        </div>



        {/* Enhanced Footer */}
        <div className="text-center pt-8 border-t border-gray-100/80">
          <p className="text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">terms of service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline transition-colors duration-200">privacy policy</Link>.
            <br />
            <span className="text-gray-400 font-medium">Secure authentication powered by Firebase • v1.0.0</span>
          </p>
        </div>
      </div>
    </div>

  )
}





/* ---------- Enhanced Feature card ---------- */
function EnhancedFeatureCard({
  icon,
  title,
  desc,
  bgGradient,
  iconBg,
  accentColor,
}: {
  icon: ReactElement
  title: string
  desc: string
  bgGradient: string
  iconBg: string
  accentColor: string
}) {
  const accentColors = {
    blue: {
      border: 'border-blue-200/50',
      glow: 'group-hover:shadow-blue-500/20',
      text: 'text-blue-600'
    },
    emerald: {
      border: 'border-emerald-200/50',
      glow: 'group-hover:shadow-emerald-500/20',
      text: 'text-emerald-600'
    },
    orange: {
      border: 'border-orange-200/50',
      glow: 'group-hover:shadow-orange-500/20',
      text: 'text-orange-600'
    }
  }

  const colors = accentColors[accentColor as keyof typeof accentColors]

  return (
    <div className={`group relative p-6 rounded-2xl border ${colors.border} bg-gradient-to-br ${bgGradient} backdrop-blur-sm hover:bg-white/90 hover:shadow-xl ${colors.glow} transition-all duration-500 hover:scale-[1.02] overflow-hidden`}>
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />

      <div className="relative z-10 flex items-start gap-4">
        {/* Enhanced Icon */}
        <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
          <div className="text-white">
            {icon}
          </div>
          {/* Icon glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${iconBg} rounded-2xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
            {desc}
          </p>
        </div>

        {/* Subtle arrow indicator */}
        <div className={`flex-shrink-0 w-6 h-6 ${colors.text} opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1`}>
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}