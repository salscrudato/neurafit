import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { logger } from './logger'
import { sanitizeInput } from './security'

/**
 * Ensures a user document exists in Firestore
 * Creates it with basic info if it doesn't exist
 */
export async function ensureUserDocument(user: User): Promise<void> {
  try {
    logger.debug('Ensuring user document', { uid: user.uid })

    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      logger.info('Creating user document', { uid: user.uid })

      // Sanitize user inputs
      const displayName = user.displayName ? sanitizeInput(user.displayName) : null
      const email = user.email ? user.email.toLowerCase().trim() : null

      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email,
          displayName,
          photoURL: user.photoURL || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
      logger.info('User document created successfully', { uid: user.uid })
    } else {
      // Update updated_at if document exists
      await setDoc(
        userDocRef,
        {
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
    }
  } catch (error) {
    logger.error('Error ensuring user document', error as Error, { uid: user.uid })
    throw new Error('Failed to ensure user document exists')
  }
}

/**
 * Creates a default subscription for a user if it doesn't exist
 */
export async function createDefaultSubscription(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      logger.error('User document does not exist', new Error('User not found'), { uid })
      throw new Error('User document does not exist')
    }

    const userData = userDoc.data()
    if (!userData?.['subscription']) {
      await setDoc(
        userDocRef,
        {
          subscription: {
            customerId: '',
            status: 'incomplete',
            workoutCount: 0,
            freeWorkoutsUsed: 0,
            freeWorkoutLimit: 50,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        { merge: true }
      )
      logger.info('Default subscription created', { uid })
    }
  } catch (error) {
    logger.error('Error creating default subscription', error as Error, { uid })
    throw new Error('Failed to create default subscription')
  }
}