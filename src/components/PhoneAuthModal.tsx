import React, { useState, useEffect, useRef } from 'react'
import { X, Phone, Shield, RefreshCw } from 'lucide-react'

interface PhoneAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitPhone: (phoneNumber: string) => Promise<void>
  onSubmitCode: (code: string) => Promise<void>
  step: 'phone' | 'code'
  loading: boolean
  error: string
  phoneNumber: string
}

export default function PhoneAuthModal({
  isOpen,
  onClose,
  onSubmitPhone,
  onSubmitCode,
  step,
  loading,
  error,
  phoneNumber,
}: PhoneAuthModalProps) {
  const [localPhoneNumber, setLocalPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Refs for auto-focus
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on input when modal opens or step changes
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (step === 'phone' && phoneInputRef.current) {
        phoneInputRef.current.focus()
      } else if (step === 'code' && codeInputRef.current) {
        codeInputRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isOpen, step])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalPhoneNumber('')
      setVerificationCode('')
      setResendCooldown(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmitPhone(localPhoneNumber)
    // Start 60-second cooldown for resend
    setResendCooldown(60)
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmitCode(verificationCode)
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return

    setVerificationCode('') // Clear existing code
    await onSubmitPhone(localPhoneNumber)
    setResendCooldown(60) // Start new cooldown
  }

  const handleBackToPhone = () => {
    setVerificationCode('')
    setResendCooldown(0)
    onClose()
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX (without +1 prefix for display)
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return `(${cleaned}`
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setLocalPhoneNumber(formatted)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(code)

    // Auto-submit when 6 digits are entered
    if (code.length === 6 && !loading) {
      // Small delay to show the last digit before submitting
      setTimeout(() => {
        if (code.length === 6) { // Double-check in case user deleted
          onSubmitCode(code)
        }
      }, 300)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-auth-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          aria-label="Close modal"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg transition-transform duration-300 hover:scale-105">
            {step === 'phone' ? (
              <Phone className="h-8 w-8 text-white" aria-hidden="true" />
            ) : (
              <Shield className="h-8 w-8 text-white" aria-hidden="true" />
            )}
          </div>
          <h2 id="phone-auth-title" className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'phone' ? 'Sign in with Phone' : 'Enter Verification Code'}
          </h2>
          <p className="text-gray-600">
            {step === 'phone'
              ? 'Enter your phone number to receive a verification code'
              : `We sent a code to ${phoneNumber}`
            }
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Phone number step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div className="group">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" aria-hidden="true" />
                <input
                  ref={phoneInputRef}
                  id="phone"
                  type="tel"
                  value={localPhoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-gray-300 hover:shadow-md font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 touch-manipulation min-h-[48px] text-base"
                  disabled={loading}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label="Phone number"
                  aria-describedby="phone-hint"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <p id="phone-hint" className="mt-2 text-xs text-gray-500">
                US numbers only. Standard messaging rates may apply.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !localPhoneNumber}
              className="relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg overflow-hidden group touch-manipulation min-h-[48px]"
              aria-label="Send verification code"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" role="status" aria-label="Loading" />
                )}
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </span>
            </button>
          </form>
        )}

        {/* Verification code step */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div className="group">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" aria-hidden="true" />
                <input
                  ref={codeInputRef}
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="123456"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200/80 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-gray-300 hover:shadow-md font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 touch-manipulation min-h-[48px] text-base text-center tracking-widest text-2xl"
                  disabled={loading}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  aria-label="Verification code"
                  aria-describedby="code-hint"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <p id="code-hint" className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg overflow-hidden group touch-manipulation min-h-[48px]"
              aria-label="Verify code and sign in"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" role="status" aria-label="Loading" />
                )}
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </span>
            </button>

            {/* Resend code button */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 hover:bg-blue-50 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label={resendCooldown > 0 ? `Resend code in ${resendCooldown} seconds` : 'Resend verification code'}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleBackToPhone}
              className="w-full text-sm text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
              aria-label="Use a different phone number"
            >
              Use a different phone number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

