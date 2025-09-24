// src/pages/Auth.tsx
import { useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect
} from 'firebase/auth'
import { Zap, Brain, Target, Shield } from 'lucide-react'
import type { ReactElement } from 'react'

export default function Auth() {
  const [loading, setLoading] = useState(false)

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
      console.log('Popup failed, trying redirect:', error.code)

      // If popup fails due to COOP or being blocked, fall back to redirect
      if (error.code === 'auth/popup-blocked' ||
          error.code === 'auth/popup-closed-by-user' ||
          error.message?.includes('Cross-Origin-Opener-Policy')) {
        try {
          await signInWithRedirect(auth, provider)
          // Redirect will happen, don't set loading to false
          return
        } catch (redirectError: any) {
          console.error('Redirect also failed:', redirectError)
          alert('Failed to sign in with Google. Please try again.')
        }
      } else {
        console.error('Google sign-in error:', error)
        alert('Failed to sign in with Google. Please try again.')
      }
      setLoading(false)
    }
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
        <div className="text-center pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our terms of service and privacy policy.
            <br />
            <span className="text-gray-400">Secure authentication powered by Google</span>
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