// src/pages/Auth.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth'
import { Zap, Brain, Target, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import type { ReactElement } from 'react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Initialize component
  useEffect(() => {
    setLoading(false)
  }, [])

  const googleLogin = async () => {
    setLoading(true)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({
      prompt: 'select_account'
    })

    try {
      // Try popup first
      await signInWithPopup(auth, provider)
      // Success - SessionProvider will handle the rest
    } catch (error: any) {
      // Suppress COOP-related console errors as they're expected in development
      if (!error.message?.includes('Cross-Origin-Opener-Policy')) {
        console.log('Popup failed, trying redirect:', error.code)
      }

      // If popup fails due to COOP or being blocked, fall back to redirect
      if (error.code === 'auth/popup-blocked' ||
          error.code === 'auth/popup-closed-by-user' ||
          error.message?.includes('Cross-Origin-Opener-Policy') ||
          error.message?.includes('window.closed')) {
        try {
          await signInWithRedirect(auth, provider)
          // Redirect will happen, don't set loading to false
          return
        } catch (redirectError: any) {
          console.error('Redirect also failed:', redirectError)
          alert('Failed to sign in with Google. Please try again.')
        }
      } else if (error.code !== 'auth/cancelled-popup-request') {
        // Only show error for non-cancellation errors
        console.error('Google sign-in error:', error)
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
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      // Success - SessionProvider will handle the rest
    } catch (error: any) {
      console.error('Email auth error:', error)

      // Handle specific Firebase auth errors
      switch (error.code) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.05),transparent_50%)]" />

      {/* Main Content */}
      <div className="relative max-w-md mx-auto px-6 py-12">
        {/* Header Badge */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-full shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700 tracking-wide">AI-Powered Fitness Technology</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight">
            Transform Your Body with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI-Powered</span>{' '}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Precision</span>
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-sm mx-auto">
            Experience personalized workout plans that evolve with you. Our advanced AI
            analyzes your progress, adapts to your goals, and delivers{' '}
            <span className="text-blue-600 font-semibold">results that matter.</span>
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4 mb-12">
          <button
            onClick={googleLogin}
            disabled={loading}
            className="group w-full bg-white border border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Google glyph */}
            <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.94 0 7.48 1.53 10.2 4.02l6.8-6.8C36.84 2.61 30.77 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.96 6.18C12.3 13 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.75H24v9.01h12.65c-.55 2.94-2.23 5.43-4.74 7.11l7.24 5.62C43.99 36.76 46.5 30.79 46.5 24z"/>
              <path fill="#FBBC05" d="M10.52 27.6A14.47 14.47 0 0 1 9.5 24c0-1.25.17-2.46.48-3.6l-7.96-6.18A24 24 0 0 0 0 24c0 3.84.9 7.47 2.5 10.68l8.02-7.08z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.83l-7.24-5.62c-2.01 1.36-4.59 2.16-8.66 2.16-6.26 0-11.7-3.5-13.48-8.52l-8.02 7.08C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="transition-colors duration-300 group-hover:text-gray-800">
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-500 font-medium">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Input */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 ${
                    emailError
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  disabled={loading}
                />
              </div>
              {emailError && (
                <p className="mt-2 text-sm text-red-600 font-medium">{emailError}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-4 rounded-2xl border font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 ${
                    passwordError
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 font-medium">{passwordError}</p>
              )}
            </div>

            {/* Confirm Password Input (only for signup) */}
            {authMode === 'signup' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              {loading ? 'Please wait...' : (authMode === 'signup' ? 'Create Account' : 'Sign In')}
            </button>

            {/* Toggle Auth Mode */}
            <div className="text-center">
              <button
                type="button"
                onClick={toggleAuthMode}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200 disabled:opacity-60"
              >
                {authMode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </div>

        {/* Why Choose NeuraFit Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-3 text-gray-900">Why Choose NeuraFit?</h2>
          <p className="text-gray-600 text-center mb-10 leading-relaxed">
            Experience the perfect blend of cutting-edge AI technology and personalized fitness coaching
          </p>

          {/* Feature Cards */}
          <div className="space-y-5">
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI-Powered Workouts"
              desc="Personalized training plans that adapt to your progress and goals using advanced machine learning."
              bgColor="bg-gradient-to-br from-blue-50 to-indigo-50"
              iconColor="text-blue-600"
              borderColor="border-blue-100/50"
            />
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Goal-Focused Training"
              desc="Every workout is optimized to help you reach your specific fitness objectives faster."
              bgColor="bg-gradient-to-br from-emerald-50 to-teal-50"
              iconColor="text-emerald-600"
              borderColor="border-emerald-100/50"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Safety First"
              desc="Built-in injury prevention with form guidance and recovery recommendations."
              bgColor="bg-gradient-to-br from-orange-50 to-amber-50"
              iconColor="text-orange-600"
              borderColor="border-orange-100/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-100/80">
          <p className="text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">terms of service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">privacy policy</Link>.
            <br />
            <span className="text-gray-400 font-medium">Secure authentication powered by Firebase • v1.0.0</span>
          </p>
        </div>
      </div>
    </div>

  )
}



/* ---------- Feature card ---------- */
function FeatureCard({
  icon,
  title,
  desc,
  bgColor,
  iconColor,
  borderColor,
}: {
  icon: ReactElement
  title: string
  desc: string
  bgColor: string
  iconColor: string
  borderColor: string
}) {
  return (
    <div className="group text-center p-6 rounded-2xl border bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <div className={`w-16 h-16 ${bgColor} ${borderColor} border rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}