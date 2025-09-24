// src/pages/Auth.tsx
import { useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import {
  GoogleAuthProvider, signInWithPopup,
  RecaptchaVerifier, signInWithPhoneNumber
} from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'

export default function Auth() {
  const [phone, setPhone] = useState('')
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Invisible reCAPTCHA for phone auth
  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      ;(window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'phone-login', { size: 'invisible' })
    }
  }, [])

  const googleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    if (!phone) return
    setLoading(true)
    try {
      const appVerifier = (window as any).recaptchaVerifier
      const cr = await signInWithPhoneNumber(auth, phone, appVerifier)
      setConfirm(cr)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!confirm || !code) return
    setLoading(true)
    try {
      await confirm.confirm(code)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Top Nav / Brand */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Simple logo mark */}
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-lg ring-1 ring-white/20" />
          <span className="text-lg font-semibold tracking-tight">Neurafit</span>
        </div>
        <a
          href="#features"
          className="text-sm text-white/70 hover:text-white transition"
        >
          Features
        </a>
      </header>

      {/* Hero / Landing Section */}
      <main className="mx-auto max-w-6xl px-6 pt-4 pb-16">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              Your AI-Powered Personal Fitness Coach
            </h1>
            <p className="mt-4 text-white/80 text-lg">
              Generate personalized, equipment-aware workouts in seconds.
              Clear guidance, rest timers, and progress history—built for busy people.
            </p>

            {/* Auth Actions */}
            <div className="mt-8 space-y-3 max-w-md">
              <button
                onClick={googleLogin}
                disabled={loading}
                className="group w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-slate-900 px-4 py-3 font-medium ring-1 ring-white/10 hover:bg-white/90 transition disabled:opacity-60"
              >
                {/* Google glyph */}
                <svg className="h-5 w-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.94 0 7.48 1.53 10.2 4.02l6.8-6.8C36.84 2.61 30.77 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.96 6.18C12.3 13 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.75H24v9.01h12.65c-.55 2.94-2.23 5.43-4.74 7.11l7.24 5.62C43.99 36.76 46.5 30.79 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.52 27.6A14.47 14.47 0 0 1 9.5 24c0-1.25.17-2.46.48-3.6l-7.96-6.18A24 24 0 0 0 0 24c0 3.84.9 7.47 2.5 10.68l8.02-7.08z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.83l-7.24-5.62c-2.01 1.36-4.59 2.16-8.66 2.16-6.26 0-11.7-3.5-13.48-8.52l-8.02 7.08C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>

              {/* Phone Auth */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <label className="block text-sm text-white/80 mb-2">
                  Phone (E.164, e.g. +15551234567)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400"
                  placeholder="+1…"
                  inputMode="tel"
                />
                {!confirm ? (
                  <button
                    id="phone-login"
                    onClick={sendOtp}
                    disabled={loading || !phone}
                    className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium ring-1 ring-white/10 hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    Send code
                  </button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400"
                      placeholder="Enter code"
                      inputMode="numeric"
                    />
                    <button
                      onClick={verifyOtp}
                      disabled={loading || !code}
                      className="w-full rounded-xl bg-emerald-500 text-slate-950 px-4 py-3 font-semibold hover:bg-emerald-400 transition disabled:opacity-60"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-white/60">
                By continuing you agree to our Terms & Privacy.
              </p>
            </div>
          </div>

          {/* Visual / Feature Cards */}
          <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <FeatureCard
              icon={<BoltIcon />}
              title="Instant, Personalized Plans"
              desc="Tell us your goals, experience, equipment & injuries—get a precise plan in seconds using GPT-4o-mini."
              gradient="from-fuchsia-400 to-pink-400"
            />
            <FeatureCard
              icon={<TimerIcon />}
              title="Guided Flow & Rest Timer"
              desc="Clear instructions, form & safety tips, and an elegant progress-circle rest timer between sets."
              gradient="from-cyan-400 to-emerald-400"
            />
            <FeatureCard
              icon={<HistoryIcon />}
              title="History & Insights"
              desc="Your completed sessions are saved automatically so you can review progress and repeat favorites."
              gradient="from-amber-400 to-orange-500"
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-sm text-white/50">
        © {new Date().getFullYear()} Neurafit. All rights reserved.
      </footer>
    </div>
  )
}

/* ---------- Small, inline icon components (no external libs) ---------- */
function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
    </svg>
  )
}
function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="13" r="8" />
      <path strokeLinecap="round" d="M12 9v4l3 2" />
      <path d="M9 3h6" strokeLinecap="round" />
    </svg>
  )
}
function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.708M3 3v6h6" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  )
}

/* ---------- Feature card ---------- */
function FeatureCard({
  icon,
  title,
  desc,
  gradient,
}: {
  icon: JSX.Element
  title: string
  desc: string
  gradient: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-tr ${gradient} opacity-30 blur-2xl`} />
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-white/80">{desc}</p>
        </div>
      </div>
    </div>
  )
}