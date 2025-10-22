// src/pages/Auth.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth'
import { Zap, Brain, Target, Shield, Smartphone, Zap as ZapIcon } from 'lucide-react'
import { trackUserSignUp, trackUserLogin } from '../lib/firebase-analytics'
import PhoneAuthModal from '../components/PhoneAuthModal'
import FeatureCard from '../components/FeatureCard'
import { logger } from '../lib/logger'
import { useInitializeGuestSession } from '../store'
import { initializeGuestSession } from '../lib/guest-session'

export default function Auth() {
  const nav = useNavigate()
  const initGuestSession = useInitializeGuestSession()
  const [loading, setLoading] = useState(false)

  // Phone authentication state
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null)

  // Initialize component and apply performance optimizations
  useEffect(() => {
    setLoading(false)

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    }
  }, [])

  // Initialize invisible reCAPTCHA when phone modal opens
  useEffect(() => {
    if (showPhoneModal && !recaptchaVerifier) {
      // Add delay to ensure DOM is ready and avoid race conditions
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container')
          if (!container) {
            logger.error('reCAPTCHA container not found')
            setPhoneError('Verification system not ready. Please refresh the page.')
            return
          }

          // Create invisible reCAPTCHA verifier
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved - will proceed with phone auth
              logger.debug('reCAPTCHA solved')
            },
            'expired-callback': () => {
              // reCAPTCHA expired - user needs to try again
              logger.warn('reCAPTCHA expired')
              setPhoneError('Verification expired. Please try again.')
            },
          })

          // Render the verifier to ensure it's ready
          verifier.render().then(() => {
            setRecaptchaVerifier(verifier)
            logger.debug('reCAPTCHA initialized successfully')
          }).catch((error) => {
            logger.error('Error rendering reCAPTCHA', error as Error)
            setPhoneError('Failed to initialize verification. Please refresh the page.')
          })
        } catch (error) {
          logger.error('Error initializing reCAPTCHA', error as Error)
          setPhoneError('Verification system error. Please refresh the page.')
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    // Cleanup when modal closes
    if (!showPhoneModal && recaptchaVerifier) {
      try {
        recaptchaVerifier.clear()
      } catch (error) {
        logger.error('Error clearing reCAPTCHA', error as Error)
      }
      setRecaptchaVerifier(null)
    }

    return undefined
  }, [showPhoneModal, recaptchaVerifier])

  const googleLogin = useCallback(async () => {
    setLoading(true)

    try {
      // Use Firebase modular API for Google Auth
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })

      try {
        // Attempt popup authentication first
        const result = await signInWithPopup(auth, provider)
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
        if (isNewUser) {
          trackUserSignUp('google')
        } else {
          trackUserLogin('google')
        }
        // Success - AppProvider will handle navigation
      } catch (error) {
        const firebaseError = error as { code?: string; message?: string }
        // Suppress expected COOP errors in development
        if (import.meta.env.MODE === 'development' && !firebaseError.message?.includes('Cross-Origin-Opener-Policy')) {
          logger.debug('Popup failed, trying redirect', { code: firebaseError.code })
        }

        // Fallback to redirect if popup fails
        if (firebaseError.code === 'auth/popup-blocked' ||
            firebaseError.code === 'auth/popup-closed-by-user' ||
            (error as Error)?.message?.includes('Cross-Origin-Opener-Policy') ||
            (error as Error)?.message?.includes('window.closed')) {
          try {
            await signInWithRedirect(auth, provider)
            // Redirect initiated, no need to reset loading
            return
          } catch (redirectError) {
            logger.error('Redirect also failed', redirectError as Error)
            alert('Failed to sign in with Google. Please try again.')
          }
        } else if (firebaseError.code !== 'auth/cancelled-popup-request') {
          logger.error('Google sign-in error', error as Error, { code: firebaseError.code })
          alert('Failed to sign in with Google. Please try again.')
        }
        setLoading(false)
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Auth', error as Error)
      alert('Authentication service not available. Please try again.')
      setLoading(false)
    }
  }, [])

  const handlePhoneSignIn = useCallback(() => {
    setShowPhoneModal(true)
    setPhoneStep('phone')
    setPhoneError('')
    setPhoneNumber('')
  }, [])

  const handleContinueAsGuest = useCallback(() => {
    try {
      // Initialize guest session in store
      initGuestSession()

      // Initialize guest session in storage
      initializeGuestSession()

      logger.info('Guest session initialized')

      // Navigate directly to generate page
      nav('/generate')
    } catch (error) {
      logger.error('Failed to initialize guest session', error as Error)
      alert('Failed to start guest session. Please try again.')
    }
  }, [initGuestSession, nav])

  const handlePhoneSubmit = useCallback(async (phone: string) => {
    setLoading(true)
    setPhoneError('')

    try {
      // Clean phone number - remove formatting
      const cleanedPhone = phone.replace(/\D/g, '')

      // Validate phone number format (US numbers - should be 10 digits)
      if (cleanedPhone.length !== 10) {
        setPhoneError('Please enter a valid 10-digit US phone number')
        setLoading(false)
        return
      }

      // Automatically prepend +1 for US numbers
      const formattedPhone = `+1${cleanedPhone}`

      // Use reCAPTCHA verifier for phone authentication
      if (!recaptchaVerifier) {
        setPhoneError('Verification not ready. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      logger.debug('Sending verification code', { phone: formattedPhone })
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier)
      setConfirmationResult(confirmation)
      setPhoneNumber(phone)
      setPhoneStep('code')
      logger.info('Verification code sent successfully')
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string }
      logger.error('Phone sign-in error', error as Error, { code: firebaseError.code })

      // Provide user-friendly error messages
      switch (firebaseError.code) {
        case 'auth/invalid-phone-number':
          setPhoneError('Invalid phone number format. Please check and try again.')
          break
        case 'auth/too-many-requests':
          setPhoneError('Too many attempts. Please wait a few minutes and try again.')
          break
        case 'auth/quota-exceeded':
          setPhoneError('SMS quota exceeded. Please try again later or contact support.')
          break
        case 'auth/invalid-app-credential':
          setPhoneError('Authentication service error. Please try again or use Google sign-in.')
          break
        case 'auth/captcha-check-failed':
          setPhoneError('Verification failed. Please refresh the page and try again.')
          // Clear and reinitialize reCAPTCHA
          if (recaptchaVerifier) {
            try {
              recaptchaVerifier.clear()
              setRecaptchaVerifier(null)
            } catch (clearError) {
              logger.error('Error clearing reCAPTCHA after failure', clearError as Error)
            }
          }
          break
        case 'auth/missing-phone-number':
          setPhoneError('Please enter a phone number.')
          break
        default:
          setPhoneError(firebaseError.message || 'Failed to send verification code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [recaptchaVerifier])

  const handleCodeSubmit = useCallback(async (code: string) => {
    setLoading(true)
    setPhoneError('')

    try {
      if (!confirmationResult) {
        setPhoneError('Verification session expired. Please request a new code.')
        setPhoneStep('phone')
        setLoading(false)
        return
      }

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        setPhoneError('Please enter a valid 6-digit code.')
        setLoading(false)
        return
      }

      logger.debug('Verifying code')
      const result = await confirmationResult.confirm(code)
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime

      if (isNewUser) {
        trackUserSignUp('phone')
        logger.info('New user signed up via phone')
      } else {
        trackUserLogin('phone')
        logger.info('User logged in via phone')
      }

      // Success - close modal and AppProvider will handle navigation
      setShowPhoneModal(false)
      setPhoneStep('phone')
      setPhoneNumber('')
      setConfirmationResult(null)
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string }
      logger.error('Code verification error', error as Error, { code: firebaseError.code })

      switch (firebaseError.code) {
        case 'auth/invalid-verification-code':
          setPhoneError('Invalid code. Please check and try again.')
          break
        case 'auth/code-expired':
          setPhoneError('Code expired. Please request a new one.')
          setPhoneStep('phone')
          setConfirmationResult(null)
          break
        case 'auth/session-expired':
          setPhoneError('Session expired. Please start over.')
          setPhoneStep('phone')
          setConfirmationResult(null)
          break
        default:
          setPhoneError(firebaseError.message || 'Failed to verify code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [confirmationResult])

  const handleClosePhoneModal = useCallback(() => {
    setShowPhoneModal(false)
    setPhoneStep('phone')
    setPhoneNumber('')
    setPhoneError('')
    setConfirmationResult(null)
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
      setRecaptchaVerifier(null)
    }
  }, [recaptchaVerifier])

  // Memoize feature cards data to prevent unnecessary re-renders
  const featureCards = useMemo(() => [
    {
      icon: <Brain className="h-7 w-7" />,
      title: "AI-Powered Workouts",
      desc: "Personalized training plans that adapt to your progress and goals using advanced machine learning algorithms.",
      bgGradient: "from-blue-500/10 via-indigo-500/10 to-purple-500/10",
      iconBg: "from-blue-500 to-indigo-600",
      accentColor: "blue" as const,
    },
    {
      icon: <Target className="h-7 w-7" />,
      title: "Goal-Focused Training",
      desc: "Every workout is optimized to help you reach your specific fitness objectives faster and more efficiently.",
      bgGradient: "from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
      iconBg: "from-emerald-500 to-teal-600",
      accentColor: "emerald" as const,
    },
    {
      icon: <Shield className="h-7 w-7" />,
      title: "Safety First",
      desc: "Built-in injury prevention with intelligent form guidance and personalized recovery recommendations.",
      bgGradient: "from-orange-500/10 via-amber-500/10 to-yellow-500/10",
      iconBg: "from-orange-500 to-amber-600",
      accentColor: "orange" as const,
    },
  ], [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100/50 text-gray-900 relative overflow-hidden" role="main" aria-label="NeuraFit Authentication Page">
      {/* Premium Glassmorphic Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-slate-50/70 to-slate-100/50 backdrop-blur-3xl" />

      {/* AI-Inspired Subtle Animated Radial Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_70%)] ai-pulse-glow" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06),transparent_70%)] ai-pulse-glow" style={{ animationDelay: '3s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.04),transparent_80%)] ai-pulse-glow" style={{ animationDelay: '6s' }} />

      {/* Subtle Animated Mesh Grid - Ultra-refined */}
      <div className="absolute inset-0 opacity-[0.008]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* Floating Orbs - Premium Glassmorphic Effect with Breathing Animation */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl animate-float-enhanced will-change-transform opacity-50 breathing" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-br from-indigo-400/8 to-purple-500/8 rounded-full blur-3xl animate-float-enhanced will-change-transform opacity-40 breathing" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-400/6 to-indigo-500/6 rounded-full blur-3xl animate-float-enhanced will-change-transform opacity-30 breathing" style={{ animationDelay: '4s' }} />

      {/* Main Content Container */}
      <div className="relative max-w-lg mx-auto px-4 xs:px-5 sm:px-6 py-8 xs:py-10 sm:py-12 md:py-16 animate-fade-in-up safe-area-inset-top safe-area-inset-bottom" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {/* Premium Header Badge - Liquid Glass */}
        <div className="flex items-center justify-center mb-8 xs:mb-9 sm:mb-10 md:mb-14">
          <div className="group inline-flex items-center gap-2 xs:gap-2.5 sm:gap-3 px-4 xs:px-5 sm:px-7 py-2 xs:py-2.5 sm:py-3.5 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-full shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-400/20 transition-all duration-700 hover:scale-[1.04] hover:bg-white/50 cursor-default touch-manipulation">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-lg opacity-25 group-hover:opacity-50 transition-opacity duration-700" />
              <Zap className="h-3.5 xs:h-4 sm:h-4.5 w-3.5 xs:w-4 sm:w-4.5 text-blue-600 group-hover:text-indigo-600 transition-all duration-700 relative z-10 group-hover:scale-110" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] xs:text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-wide group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500 transition-all duration-700">
              AI-Powered Fitness Technology
            </span>
          </div>
        </div>

        {/* Hero Title - Apple-inspired Typography */}
        <div className="text-center mb-10 xs:mb-12 sm:mb-14 md:mb-16">
          <h1 className="text-3xl xs:text-3.5xl sm:text-5xl md:text-6xl font-bold leading-[1.15] xs:leading-[1.12] sm:leading-[1.1] mb-6 xs:mb-7 sm:mb-8 md:mb-10 tracking-tight px-1 xs:px-2" role="heading" aria-level={1}>
            <span className="block mb-1.5 xs:mb-2 sm:mb-2.5 md:mb-3 text-gray-900">Transform Your Body</span>
            <span className="block mb-1.5 xs:mb-2 sm:mb-2.5 md:mb-3">
              <span className="text-gray-900">with </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
                  AI-Powered Precision
                </span>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-indigo-600/20 to-purple-600/20 blur-2xl -z-10 opacity-50" />
              </span>
            </span>
          </h1>
          <p className="text-gray-600 text-sm xs:text-base sm:text-lg leading-relaxed max-w-md mx-auto px-2 xs:px-3 sm:px-4 font-normal">
            Experience personalized workout plans that evolve with you. Our advanced AI
            analyzes your progress, adapts to your goals, and delivers{' '}
            <span className="text-blue-600 font-semibold">results that matter.</span>
          </p>
        </div>

        {/* Premium CTA Buttons - Liquid Glass */}
        <div className="space-y-3 xs:space-y-3.5 sm:space-y-4 mb-12 xs:mb-14 sm:mb-16 md:mb-20">
          <button
            onClick={googleLogin}
            disabled={loading}
            className="group relative w-full bg-white/40 backdrop-blur-2xl border border-white/60 text-gray-800 px-4 xs:px-5 sm:px-6 py-4 xs:py-4.5 sm:py-5 rounded-[18px] xs:rounded-[20px] font-semibold hover:bg-white/50 hover:border-white/80 hover:shadow-2xl hover:shadow-blue-400/15 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2.5 xs:gap-3 sm:gap-3.5 shadow-xl shadow-gray-200/20 hover:scale-[1.02] active:scale-[0.98] overflow-hidden touch-manipulation min-h-[52px] xs:min-h-[56px] sm:min-h-[60px]"
            aria-label="Sign in with Google"
            type="button"
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-[18px] xs:rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-blue-400/15 via-purple-400/15 to-pink-400/15" />

            {/* Google glyph */}
            <svg className="h-5 xs:h-5.5 sm:h-5.5 w-5 xs:w-5.5 sm:w-5.5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 relative z-10 flex-shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.94 0 7.48 1.53 10.2 4.02l6.8-6.8C36.84 2.61 30.77 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.96 6.18C12.3 13 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.75H24v9.01h12.65c-.55 2.94-2.23 5.43-4.74 7.11l7.24 5.62C43.99 36.76 46.5 30.79 46.5 24z"/>
              <path fill="#FBBC05" d="M10.52 27.6A14.47 14.47 0 0 1 9.5 24c0-1.25.17-2.46.48-3.6l-7.96-6.18A24 24 0 0 0 0 24c0 3.84.9 7.47 2.5 10.68l8.02-7.08z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.83l-7.24-5.62c-2.01 1.36-4.59 2.16-8.66 2.16-6.26 0-11.7-3.5-13.48-8.52l-8.02 7.08C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="transition-all duration-500 group-hover:text-gray-900 relative z-10 flex items-center gap-2 xs:gap-2.5 text-sm xs:text-[15px] sm:text-[15px] font-medium">
              {loading && (
                <div className="animate-spin rounded-full h-4 xs:h-4.5 w-4 xs:w-4.5 border-2 border-gray-400 border-t-transparent flex-shrink-0" role="status" aria-label="Loading" />
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>

            {/* Loading shimmer effect */}
            {loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </button>

          {/* Phone Sign-In Button */}
          <button
            onClick={handlePhoneSignIn}
            disabled={loading}
            className="group relative w-full bg-white/40 backdrop-blur-2xl border border-white/60 text-gray-800 px-4 xs:px-5 sm:px-6 py-4 xs:py-4.5 sm:py-5 rounded-[18px] xs:rounded-[20px] font-semibold hover:bg-white/50 hover:border-white/80 hover:shadow-2xl hover:shadow-emerald-400/15 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2.5 xs:gap-3 sm:gap-3.5 shadow-xl shadow-gray-200/20 hover:scale-[1.02] active:scale-[0.98] overflow-hidden touch-manipulation min-h-[52px] xs:min-h-[56px] sm:min-h-[60px]"
            aria-label="Sign in with Phone"
            type="button"
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-[18px] xs:rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-emerald-400/15 via-teal-400/15 to-cyan-400/15" />

            <Smartphone className="h-5 xs:h-5.5 sm:h-5.5 w-5 xs:w-5.5 sm:w-5.5 text-gray-700 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 relative z-10 flex-shrink-0" strokeWidth={2} />
            <span className="transition-all duration-500 group-hover:text-gray-900 relative z-10 text-sm xs:text-[15px] sm:text-[15px] font-medium">
              Continue with Phone
            </span>
          </button>

          {/* Continue as Guest Button */}
          <button
            onClick={handleContinueAsGuest}
            disabled={loading}
            className="group relative w-full bg-gradient-to-r from-amber-50/40 to-orange-50/40 backdrop-blur-2xl border border-amber-200/60 text-gray-800 px-4 xs:px-5 sm:px-6 py-4 xs:py-4.5 sm:py-5 rounded-[18px] xs:rounded-[20px] font-semibold hover:bg-gradient-to-r hover:from-amber-100/50 hover:to-orange-100/50 hover:border-amber-300/80 hover:shadow-2xl hover:shadow-amber-400/15 transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2.5 xs:gap-3 sm:gap-3.5 shadow-xl shadow-amber-200/15 hover:scale-[1.02] active:scale-[0.98] overflow-hidden touch-manipulation min-h-[52px] xs:min-h-[56px] sm:min-h-[60px]"
            aria-label="Continue as Guest"
            type="button"
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-[18px] xs:rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-amber-400/15 via-orange-400/15 to-red-400/15" />

            <ZapIcon className="h-5 xs:h-5.5 sm:h-5.5 w-5 xs:w-5.5 sm:w-5.5 text-amber-600 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 relative z-10 flex-shrink-0" strokeWidth={2} />
            <span className="transition-all duration-500 group-hover:text-gray-900 relative z-10 text-sm xs:text-[15px] sm:text-[15px] font-medium">
              Continue as Guest
            </span>
          </button>
        </div>

        {/* Why Choose neurafit Section - Premium Design */}
        <div className="mb-12 xs:mb-14 sm:mb-16">
          <div className="text-center mb-10 xs:mb-12 sm:mb-14">
            <h2 className="text-2xl xs:text-2.5xl sm:text-3xl md:text-4xl font-bold mb-3 xs:mb-4 sm:mb-5 text-gray-900 tracking-tight px-1">
              Why Choose{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  neurafit
                </span>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-indigo-600/20 to-purple-600/20 blur-xl -z-10 opacity-40" />
              </span>
              ?
            </h2>
            <p className="text-gray-600 text-sm xs:text-base sm:text-lg leading-relaxed max-w-md mx-auto px-2 xs:px-3 sm:px-4 font-normal">
              Experience the perfect blend of cutting-edge AI technology and personalized fitness coaching
            </p>
          </div>

          {/* Premium Feature Cards */}
          <div className="space-y-4 xs:space-y-4.5 sm:space-y-5">
            {featureCards.map((card, index) => (
              <div key={card.title} className="animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'both' }}>
                <FeatureCard
                  icon={card.icon}
                  title={card.title}
                  desc={card.desc}
                  bgGradient={card.bgGradient}
                  iconBg={card.iconBg}
                  accentColor={card.accentColor}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Premium Footer - Glass Border */}
        <div className="text-center pt-8 xs:pt-9 sm:pt-10 border-t border-white/40 backdrop-blur-sm">
          <p className="text-[11px] xs:text-xs sm:text-xs text-gray-600 leading-relaxed px-2">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 underline-offset-2 hover:underline hover:scale-105 inline-block">terms of service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 underline-offset-2 hover:underline hover:scale-105 inline-block">privacy policy</Link>.
            <br />
            <span className="text-gray-500 font-medium mt-2 inline-block text-[10px] xs:text-[11px]">Secure authentication powered by Firebase • v1.0.0</span>
          </p>
        </div>
      </div>

      {/* Phone Authentication Modal */}
      <PhoneAuthModal
        isOpen={showPhoneModal}
        onClose={handleClosePhoneModal}
        onSubmitPhone={handlePhoneSubmit}
        onSubmitCode={handleCodeSubmit}
        step={phoneStep}
        loading={loading}
        error={phoneError}
        phoneNumber={phoneNumber}
      />

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  )
}