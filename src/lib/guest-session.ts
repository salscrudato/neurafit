/**
 * Guest Session Management
 * Handles guest user sessions without Firebase authentication
 */

import type { UserProfile } from '../session/types'

const GUEST_SESSION_KEY = 'nf_guest_session'
const GUEST_PROFILE_KEY = 'nf_guest_profile'

/**
 * Create a generic guest profile with neutral values
 */
export function createGuestProfile(): UserProfile {
  return {
    experience: 'Intermediate',
    goals: ['General Health'],
    equipment: ['Bodyweight'],
    personal: {
      sex: 'Other',
      height: "5'6–5'9",
      weight: '150–179'
    },
    injuries: {
      list: ['None'],
      notes: ''
    },
    isGuest: true
  }
}

/**
 * Initialize a guest session
 */
export function initializeGuestSession(): void {
  const guestProfile = createGuestProfile()
  
  // Store guest session flag
  sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
    isGuest: true,
    createdAt: Date.now()
  }))
  
  // Store guest profile
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(guestProfile))
}

/**
 * Check if current session is a guest session
 */
export function isGuestSession(): boolean {
  const session = sessionStorage.getItem(GUEST_SESSION_KEY)
  return session ? JSON.parse(session).isGuest === true : false
}

/**
 * Get the guest profile
 */
export function getGuestProfile(): UserProfile | null {
  const profile = localStorage.getItem(GUEST_PROFILE_KEY)
  return profile ? JSON.parse(profile) : null
}

/**
 * Clear guest session
 */
export function clearGuestSession(): void {
  sessionStorage.removeItem(GUEST_SESSION_KEY)
  localStorage.removeItem(GUEST_PROFILE_KEY)
}

/**
 * Check if user should be treated as guest (either in guest session or guest profile)
 */
export function isUserGuest(): boolean {
  return isGuestSession() || (getGuestProfile()?.isGuest === true)
}

