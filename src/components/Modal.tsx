// src/components/Modal.tsx
/**
 * Accessible Modal Component
 * - Focus trap
 * - Escape key handling
 * - Focus restoration
 * - ARIA attributes
 * - Keyboard navigation
 */

import React, { useEffect, useRef, memo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createFocusTrap, handleEscapeKey, createFocusManager } from '../lib/accessibility'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ''
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const focusManagerRef = useRef(createFocusManager())
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }
  
  useEffect(() => {
    if (!isOpen) return

    // Save current focus and capture reference for cleanup
    const focusManager = focusManagerRef.current
    focusManager.saveFocus()

    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    // Setup focus trap
    const cleanupFocusTrap = modalRef.current
      ? createFocusTrap(modalRef.current)
      : () => {}

    // Setup escape key handler
    const cleanupEscape = handleEscapeKey(onClose)

    return () => {
      // Restore body scroll
      document.body.style.overflow = ''

      // Cleanup
      cleanupFocusTrap()
      cleanupEscape()

      // Restore focus
      focusManager.restoreFocus()
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal={true}
        aria-labelledby="modal-title"
        {...(description && { 'aria-describedby': 'modal-description' })}
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {description && (
            <p id="modal-description" className="text-gray-600 mb-4">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
})

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export const ConfirmModal = memo(function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}: ConfirmModalProps) {
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: 'bg-orange-100 text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700 text-white'
    },
    info: {
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }
  
  const styles = variantStyles[variant]
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] font-medium"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] font-medium ${styles.button}`}
            aria-label={confirmText}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
})

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  actionText?: string
}

export const AlertModal = memo(function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  variant: _variant = 'info',
  actionText = 'OK'
}: AlertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      <button
        onClick={onClose}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors min-h-[44px] font-medium"
        aria-label={actionText}
      >
        {actionText}
      </button>
    </Modal>
  )
})

export default Modal

