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