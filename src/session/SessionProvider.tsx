import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import type { UserProfile } from './types'
import { isProfileComplete } from './types'

type Status = 'loading' | 'signedOut' | 'needsOnboarding' | 'ready'

type Session = {
  user: User | null
  profile: UserProfile | null
  status: Status
}

const SessionCtx = createContext<Session>({ user: null, profile: null, status: 'loading' })

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let unsubDoc: (() => void) | null = null

    // Simple auth state listener - no complex redirect handling
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      console.log('🔐 Auth state:', u?.email || 'signed out')

      // Clean up any existing document listener first
      if (unsubDoc) {
        unsubDoc()
        unsubDoc = null
      }

      setUser(u || null)
      setProfile(null)

      if (!u) {
        setStatus('signedOut')
        return
      }

      // Load profile
      setStatus('loading')
      const ref = doc(db, 'users', u.uid)

      try {
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const p = snap.data() as UserProfile
          setProfile(p)
          const isComplete = isProfileComplete(p)
          console.log('🔐 Profile complete:', isComplete)
          setStatus(isComplete ? 'ready' : 'needsOnboarding')
        } else {
          console.log('🔐 No profile found, needs onboarding')
          setProfile(null)
          setStatus('needsOnboarding')
        }
      } catch (error) {
        console.warn('🔐 Error loading profile:', error)
        setProfile(null)
        setStatus('needsOnboarding')
      }

      // live updates (so finishing onboarding flips state immediately)
      // Add a small delay to ensure auth state is fully established
      setTimeout(async () => {
        // Double-check user is still authenticated before creating listener
        if (!auth.currentUser || auth.currentUser.uid !== u.uid) {
          return
        }

        // Ensure the user's auth token is valid before creating the listener
        try {
          await u.getIdToken(true) // Force token refresh
        } catch (tokenError) {
          console.warn('Failed to refresh auth token:', tokenError)
          return
        }

        unsubDoc = onSnapshot(
          ref,
          (s) => {
            if (!s.exists()) {
              setProfile(null)
              setStatus('needsOnboarding')
              return
            }
            const p = s.data() as UserProfile
            setProfile(p)
            setStatus(isProfileComplete(p) ? 'ready' : 'needsOnboarding')
          },
          (error) => {
            // Handle permission errors gracefully (e.g., when user signs out)
            console.warn('Firestore listener error:', error)
            if (error.code === 'permission-denied') {
              // User likely signed out, clean up listener and set appropriate state
              if (unsubDoc) {
                unsubDoc()
                unsubDoc = null
              }
              setProfile(null)
              setStatus('signedOut')
            }
          }
        )
      }, 100) // Small delay to ensure auth state is stable
    })

    return () => {
      // Clean up both auth and document listeners
      unsubAuth()
      if (unsubDoc) {
        unsubDoc()
      }
    }
  }, [])

  const value = useMemo(() => ({ user, profile, status }), [user, profile, status])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  return useContext(SessionCtx)
}