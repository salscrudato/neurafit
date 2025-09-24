// src/pages/Auth.tsx
import { useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider, signInWithRedirect,
  RecaptchaVerifier, signInWithPhoneNumber
} from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { Zap, Brain, Target, Shield } from 'lucide-react'
import type { ReactElement } from 'react'

export default function Auth() {
  const [phone, setPhone] = useState('')
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize component
  useEffect(() => {
    // Just set loading to false on mount - let SessionProvider handle auth state
    setLoading(false)
  }, [])

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if ((window as any).recaptchaVerifier) {
        try {
          ;(window as any).recaptchaVerifier.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        ;(window as any).recaptchaVerifier = null
      }
    }
  }, [])

  const googleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      // Add custom parameters to ensure we get a fresh sign-in
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      await signInWithRedirect(auth, provider)
      // Note: signInWithRedirect doesn't return immediately, it redirects the page
      // The result will be handled in the useEffect hook
    } catch (error: any) {
      console.error('Error with Google login:', error)
      alert('Failed to sign in with Google. Please try again.')
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    if (!phone) return
    setLoading(true)
    try {
      // Create recaptcha verifier if it doesn't exist
      if (!(window as any).recaptchaVerifier) {
        ;(window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber
          },
          'expired-callback': () => {
            // Reset on expiration
            if ((window as any).recaptchaVerifier) {
              ;(window as any).recaptchaVerifier.clear()
              ;(window as any).recaptchaVerifier = null
            }
          }
        })
      }
      const appVerifier = (window as any).recaptchaVerifier
      const cr = await signInWithPhoneNumber(auth, phone, appVerifier)
      setConfirm(cr)
    } catch (error: any) {
      console.error('Error sending OTP:', error)

      // Show user-friendly error message
      let errorMessage = 'Failed to send verification code. '
      if (error.code === 'auth/invalid-app-credential') {
        errorMessage += 'Please try using Google Sign-In instead.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage += 'Too many attempts. Please try again later.'
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage += 'Please enter a valid phone number with country code (e.g., +1234567890).'
      } else {
        errorMessage += 'Please try Google Sign-In instead.'
      }

      alert(errorMessage)

      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        try {
          ;(window as any).recaptchaVerifier.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        ;(window as any).recaptchaVerifier = null
      }

      // Close the phone modal on error
      setPhone('')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!confirm || !code) return
    setLoading(true)
    try {
      await confirm.confirm(code)
    } catch (error: any) {
      console.error('Error verifying OTP:', error)

      let errorMessage = 'Invalid verification code. '
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage += 'Please check the code and try again.'
      } else if (error.code === 'auth/code-expired') {
        errorMessage += 'The code has expired. Please request a new one.'
        setConfirm(null)
        setCode('')
      } else {
        errorMessage += 'Please try again.'
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header Badge */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">AI-Powered Fitness Technology</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Transform Your Body with{' '}
            <span className="text-blue-600">AI-Powered</span>{' '}
            <span className="text-teal-600">Precision</span>
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Experience personalized workout plans that evolve with you. Our advanced AI
            analyzes your progress, adapts to your goals, and delivers{' '}
            <span className="text-blue-600 font-medium">results that matter.</span>
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={googleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="h-5 w-5" />
            Start Your AI Journey
          </button>

          <button
            onClick={googleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {/* Google glyph */}
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.94 0 7.48 1.53 10.2 4.02l6.8-6.8C36.84 2.61 30.77 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.96 6.18C12.3 13 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.75H24v9.01h12.65c-.55 2.94-2.23 5.43-4.74 7.11l7.24 5.62C43.99 36.76 46.5 30.79 46.5 24z"/>
              <path fill="#FBBC05" d="M10.52 27.6A14.47 14.47 0 0 1 9.5 24c0-1.25.17-2.46.48-3.6l-7.96-6.18A24 24 0 0 0 0 24c0 3.84.9 7.47 2.5 10.68l8.02-7.08z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.83l-7.24-5.62c-2.01 1.36-4.59 2.16-8.66 2.16-6.26 0-11.7-3.5-13.48-8.52l-8.02 7.08C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="text-center">
            <button
              onClick={() => setPhone('+')}
              disabled={loading}
              className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors disabled:opacity-60"
            >
              Or sign in with phone number
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mb-8">
          <p>Phone authentication may not work in development.</p>
          <p>Google Sign-In is recommended for the best experience.</p>
        </div>

        {/* Powered by AI Badge */}
        <div className="flex items-center justify-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
            <Brain className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Powered by Advanced AI</span>
          </div>
        </div>

        {/* Why Choose NeuraFit Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-2">Why Choose NeuraFit?</h2>
          <p className="text-gray-600 text-center mb-8">
            Experience the perfect blend of cutting-edge AI technology and personalized fitness coaching
          </p>

          {/* Feature Cards */}
          <div className="space-y-6">
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI-Powered Workouts"
              desc="Personalized training plans that adapt to your progress and goals using advanced machine learning."
              bgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Goal-Focused Training"
              desc="Every workout is optimized to help you reach your specific fitness objectives faster."
              bgColor="bg-green-50"
              iconColor="text-green-600"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Safety First"
              desc="Built-in injury prevention with form guidance and recovery recommendations."
              bgColor="bg-orange-50"
              iconColor="text-orange-600"
            />
          </div>
        </div>

        {/* Phone Auth Modal */}
        {confirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">Enter Verification Code</h3>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 6-digit code"
                inputMode="numeric"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyOtp}
                  disabled={loading || !code}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phone Input Modal */}
        {!confirm && phone && phone !== '' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">Enter Phone Number</h3>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
                inputMode="tel"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setPhone('')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendOtp}
                  disabled={loading || !phone}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  Send Code
                </button>
                <div id="recaptcha-container"></div>
              </div>
            </div>
          </div>
        )}
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
}: {
  icon: ReactElement
  title: string
  desc: string
  bgColor: string
  iconColor: string
}) {
  return (
    <div className="text-center">
      <div className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}