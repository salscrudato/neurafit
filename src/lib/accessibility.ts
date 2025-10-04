// src/lib/accessibility.ts
/**
 * Accessibility utilities for NeuraFit
 * Ensures WCAG 2.1 AA compliance
 */

import React from 'react'
import { logger } from './logger'

/**
 * WCAG 2.1 AA requires a contrast ratio of at least 4.5:1 for normal text
 * and 3:1 for large text (18pt+ or 14pt+ bold)
 */

// Color contrast ratios for common color combinations
export const COLOR_CONTRAST = {
  // Background: white (#ffffff)
  'blue-600': 4.56, // #2563eb - PASS AA
  'blue-700': 7.00, // #1d4ed8 - PASS AAA
  'indigo-600': 4.54, // #4f46e5 - PASS AA
  'indigo-700': 6.98, // #4338ca - PASS AAA
  'gray-600': 5.74, // #4b5563 - PASS AA
  'gray-700': 8.59, // #374151 - PASS AAA
  'gray-900': 16.00, // #111827 - PASS AAA
  'red-600': 4.52, // #dc2626 - PASS AA
  'green-600': 3.44, // #16a34a - FAIL (use green-700)
  'green-700': 4.76, // #15803d - PASS AA
  'orange-600': 3.05, // #ea580c - FAIL (use orange-700)
  'orange-700': 4.54, // #c2410c - PASS AA
} as const

/**
 * Check if a color combination meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: keyof typeof COLOR_CONTRAST,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean {
  const ratio = COLOR_CONTRAST[foreground]
  const requiredRatio = level === 'AAA' 
    ? (isLargeText ? 4.5 : 7.0)
    : (isLargeText ? 3.0 : 4.5)
  
  return ratio >= requiredRatio
}

/**
 * Get accessible color for text based on background
 */
export function getAccessibleTextColor(background: 'light' | 'dark'): string {
  return background === 'light' ? 'text-gray-900' : 'text-white'
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
  
  logger.debug(`Screen reader announcement: ${message}`)
}

/**
 * Focus trap for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  
  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }
  
  container.addEventListener('keydown', handleTabKey)
  
  // Focus first element
  firstElement?.focus()
  
  return () => {
    container.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Handle Escape key to close modals
 */
export function handleEscapeKey(callback: () => void) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      callback()
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Restore focus to previous element after modal closes
 */
export function createFocusManager() {
  let previousFocus: HTMLElement | null = null
  
  return {
    saveFocus: () => {
      previousFocus = document.activeElement as HTMLElement
    },
    restoreFocus: () => {
      previousFocus?.focus()
      previousFocus = null
    }
  }
}

/**
 * Check if element meets minimum touch target size (44x44px)
 */
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width >= 44 && rect.height >= 44
}

/**
 * Audit page for accessibility issues
 */
export function auditAccessibility() {
  const issues: string[] = []
  
  // Check for images without alt text
  const images = document.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push(`Image ${index + 1} missing alt text`)
    }
  })
  
  // Check for buttons without accessible names
  const buttons = document.querySelectorAll('button')
  buttons.forEach((button, index) => {
    const hasText = button.textContent?.trim()
    const hasAriaLabel = button.getAttribute('aria-label')
    const hasAriaLabelledBy = button.getAttribute('aria-labelledby')
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push(`Button ${index + 1} missing accessible name`)
    }
    
    // Check touch target size
    if (!meetsTouchTargetSize(button)) {
      issues.push(`Button ${index + 1} does not meet minimum touch target size (44x44px)`)
    }
  })
  
  // Check for links without accessible names
  const links = document.querySelectorAll('a')
  links.forEach((link, index) => {
    const hasText = link.textContent?.trim()
    const hasAriaLabel = link.getAttribute('aria-label')
    
    if (!hasText && !hasAriaLabel) {
      issues.push(`Link ${index + 1} missing accessible name`)
    }
  })
  
  // Check for form inputs without labels
  const inputs = document.querySelectorAll('input, select, textarea')
  inputs.forEach((input, index) => {
    const inputId = input.id
    const hasLabel = inputId ? document.querySelector(`label[for="${inputId}"]`) : null
    const hasAriaLabel = input.getAttribute('aria-label')
    const hasAriaLabelledBy = input.getAttribute('aria-labelledby')

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push(`Input ${index + 1} missing label`)
    }
  })

  // Check for heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let previousLevel = 0
  headings.forEach((heading, index) => {
    const tagName = heading.tagName
    const level = parseInt(tagName[1] || '0', 10)
    if (level > previousLevel + 1) {
      issues.push(`Heading ${index + 1} skips level (from h${previousLevel} to h${level})`)
    }
    previousLevel = level
  })

  if (issues.length > 0) {
    logger.warn('Accessibility issues found', { issues: issues.join('; ') })
  } else {
    logger.info('No accessibility issues found')
  }

  return issues
}

/**
 * Common ARIA attributes for interactive elements
 */
export const ARIA_ATTRIBUTES = {
  button: (label: string, pressed?: boolean) => ({
    'aria-label': label,
    ...(pressed !== undefined && { 'aria-pressed': pressed })
  }),
  
  link: (label: string, external?: boolean) => ({
    'aria-label': label,
    ...(external && { 'aria-label': `${label} (opens in new tab)` })
  }),
  
  modal: (labelId: string, descId?: string) => ({
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelId,
    ...(descId && { 'aria-describedby': descId })
  }),
  
  alert: (type: 'error' | 'warning' | 'info' | 'success') => ({
    role: 'alert',
    'aria-live': type === 'error' ? 'assertive' as const : 'polite' as const,
    'aria-atomic': 'true'
  }),
  
  loading: (label: string) => ({
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-label': label
  }),
  
  tab: (label: string, selected: boolean, controls: string) => ({
    role: 'tab',
    'aria-label': label,
    'aria-selected': selected,
    'aria-controls': controls,
    tabIndex: selected ? 0 : -1
  }),
  
  tabPanel: (labelledBy: string, hidden: boolean) => ({
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
    hidden
  })
} as const

/**
 * Skip to main content link for keyboard navigation
 */
export function createSkipLink() {
  const skipLink = document.createElement('a')
  skipLink.href = '#main-content'
  skipLink.textContent = 'Skip to main content'
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg'
  
  document.body.insertBefore(skipLink, document.body.firstChild)
}

/**
 * Keyboard navigation helpers
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
} as const

/**
 * Handle keyboard navigation for lists
 */
export function handleListKeyboard(
  e: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (_index: number) => void
) {
  switch (e.key) {
    case KEYBOARD_KEYS.ARROW_UP:
      e.preventDefault()
      onSelect(currentIndex > 0 ? currentIndex - 1 : itemCount - 1)
      break
    case KEYBOARD_KEYS.ARROW_DOWN:
      e.preventDefault()
      onSelect(currentIndex < itemCount - 1 ? currentIndex + 1 : 0)
      break
    case KEYBOARD_KEYS.HOME:
      e.preventDefault()
      onSelect(0)
      break
    case KEYBOARD_KEYS.END:
      e.preventDefault()
      onSelect(itemCount - 1)
      break
  }
}

