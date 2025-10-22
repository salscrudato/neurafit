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

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-auth-title"
    >
      {/* Backdrop - Premium Glass Effect */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - Liquid Glass */}
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-2xl xs:rounded-2.5xl sm:rounded-3xl shadow-2xl shadow-black/20 max-w-md w-full p-6 xs:p-7 sm:p-8 animate-scale-in-smooth max-h-[90vh] overflow-y-auto border border-white/60" role="document">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 xs:top-4 right-3 xs:right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 xs:p-2 hover:bg-gray-100 rounded-full"
          aria-label="Close modal"
          type="button"
        >
          <X className="h-5 xs:h-5 w-5 xs:w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6 xs:mb-7 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 xs:w-15 sm:w-16 h-14 xs:h-15 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl xs:rounded-2xl sm:rounded-2xl mb-3 xs:mb-4 shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-blue-400/40">
            {step === 'phone' ? (
              <Phone className="h-7 xs:h-7.5 sm:h-8 w-7 xs:w-7.5 sm:w-8 text-white transition-transform duration-300" aria-hidden="true" />
            ) : (
              <Shield className="h-7 xs:h-7.5 sm:h-8 w-7 xs:w-7.5 sm:w-8 text-white transition-transform duration-300" aria-hidden="true" />
            )}
          </div>
          <h2 id="phone-auth-title" className="text-xl xs:text-xl sm:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
            {step === 'phone' ? 'Sign in with Phone' : 'Enter Verification Code'}
          </h2>
          <p className="text-gray-600 text-sm xs:text-sm sm:text-base">
            {step === 'phone'
              ? 'Enter your phone number to receive a verification code'
              : `We sent a code to ${phoneNumber}`
            }
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 xs:mb-6 sm:mb-6 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg xs:rounded-xl animate-shake" role="alert" aria-live="polite">
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-4 xs:h-5 w-4 xs:w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs xs:text-sm text-red-600 font-medium flex-1">{error}</p>
            </div>
          </div>
        )}

        {/* Phone number step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5 xs:space-y-6 sm:space-y-6">
            <div className="group">
              <label htmlFor="phone" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 xs:left-4 top-1/2 transform -translate-y-1/2 h-4.5 xs:h-5 w-4.5 xs:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 flex-shrink-0" aria-hidden="true" />
                <input
                  ref={phoneInputRef}
                  id="phone"
                  type="tel"
                  value={localPhoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 xs:pl-12 pr-3 xs:pr-4 py-3 xs:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl border border-white/50 bg-white/40 backdrop-blur-xl hover:bg-white/50 hover:border-white/70 hover:shadow-lg hover:shadow-blue-400/10 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white/60 transition-all duration-300 touch-manipulation min-h-[48px] text-base"
                  disabled={loading}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label="Phone number"
                  aria-describedby="phone-hint"
                />
                <div className="absolute inset-0 rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <p id="phone-hint" className="mt-1.5 xs:mt-2 text-[10px] xs:text-xs text-gray-500">
                US numbers only. Standard messaging rates may apply.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !localPhoneNumber}
              className="relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 xs:px-6 py-3 xs:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl font-semibold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-blue-600/30 overflow-hidden group touch-manipulation min-h-[48px]"
              aria-label="Send verification code"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm xs:text-base">
                {loading && (
                  <div className="animate-spin rounded-full h-4 xs:h-4 w-4 xs:w-4 border-2 border-white border-t-transparent flex-shrink-0" role="status" aria-label="Loading" />
                )}
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </span>
            </button>
          </form>
        )}

        {/* Verification code step */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-5 xs:space-y-6 sm:space-y-6">
            <div className="group">
              <label htmlFor="code" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-3 xs:left-4 top-1/2 transform -translate-y-1/2 h-4.5 xs:h-5 w-4.5 xs:w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 flex-shrink-0" aria-hidden="true" />
                <input
                  ref={codeInputRef}
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="123456"
                  className="w-full pl-10 xs:pl-12 pr-3 xs:pr-4 py-3 xs:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl border border-white/50 bg-white/40 backdrop-blur-xl hover:bg-white/50 hover:border-white/70 hover:shadow-lg hover:shadow-blue-400/10 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white/60 transition-all duration-300 touch-manipulation min-h-[48px] text-base xs:text-lg sm:text-xl text-center tracking-widest"
                  disabled={loading}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  aria-label="Verification code"
                  aria-describedby="code-hint"
                />
                <div className="absolute inset-0 rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <p id="code-hint" className="mt-1.5 xs:mt-2 text-[10px] xs:text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 xs:px-6 py-3 xs:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl font-semibold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-blue-600/30 overflow-hidden group touch-manipulation min-h-[48px]"
              aria-label="Verify code and sign in"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer-slow" />
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm xs:text-base">
                {loading && (
                  <div className="animate-spin rounded-full h-4 xs:h-4 w-4 xs:w-4 border-2 border-white border-t-transparent flex-shrink-0" role="status" aria-label="Loading" />
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
                className="text-xs xs:text-sm text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 hover:bg-blue-50 px-3 xs:px-4 py-1.5 xs:py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 xs:gap-2"
                aria-label={resendCooldown > 0 ? `Resend code in ${resendCooldown} seconds` : 'Resend verification code'}
              >
                <RefreshCw className={`h-3.5 xs:h-4 w-3.5 xs:w-4 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleBackToPhone}
              className="w-full text-xs xs:text-sm text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
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

