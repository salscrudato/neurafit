import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Adaptive personalization state for workout difficulty tuning
 */
export type AdaptiveState = {
  difficultyScalar: number; // 0.6-1.4, where 1.0 is baseline
  lastFeedback: 'easy' | 'right' | 'hard' | null;
  lastUpdatedAt: Timestamp;
  recentCompletionRate?: number; // 0-1 over last N workouts
};

/**
 * Workout completion data for calculating recent performance
 */
type WorkoutData = {
  exercises: Array<{
    sets: number;
    weights?: Record<number, number | null>; // setNumber -> weight (null = skipped)
  }>;
  timestamp: Timestamp;
};

/**
 * Get the current adaptive state for a user, creating default if none exists
 */
export async function getAdaptiveState(uid: string): Promise<AdaptiveState> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(uid).collection('personalization').doc('adaptive');

  try {
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data() as AdaptiveState;
      return {
        difficultyScalar: data.difficultyScalar || 1.0,
        lastFeedback: data.lastFeedback || null,
        lastUpdatedAt: data.lastUpdatedAt || Timestamp.now(),
        recentCompletionRate: data.recentCompletionRate,
      };
    } else {
      // Create default state
      const defaultState: AdaptiveState = {
        difficultyScalar: 1.0,
        lastFeedback: null,
        lastUpdatedAt: Timestamp.now(),
        recentCompletionRate: undefined,
      };

      await docRef.set(defaultState);
      return defaultState;
    }
  } catch (error) {
    console.error('Error getting adaptive state:', error);
    // Return safe default on error
    return {
      difficultyScalar: 1.0,
      lastFeedback: null,
      lastUpdatedAt: Timestamp.now(),
      recentCompletionRate: undefined,
    };
  }
}

/**
 * Update adaptive state based on user feedback and recent completion rate
 */
export async function updateAdaptiveState(
  uid: string,
  signal: 'easy' | 'right' | 'hard',
  recentCompletion: number
): Promise<AdaptiveState> {
  const db = getFirestore();
  const docRef = db.collection('users').doc(uid).collection('personalization').doc('adaptive');

  try {
    // Get current state
    const currentState = await getAdaptiveState(uid);

    // Compute new scalar
    const newScalar = computeNextScalar(currentState.difficultyScalar, signal, recentCompletion);

    const updatedState: AdaptiveState = {
      difficultyScalar: newScalar,
      lastFeedback: signal,
      lastUpdatedAt: Timestamp.now(),
      recentCompletionRate: recentCompletion,
    };

    await docRef.set(updatedState, { merge: true });

    console.log(`Updated adaptive state for ${uid}:`, {
      signal,
      recentCompletion,
      oldScalar: currentState.difficultyScalar,
      newScalar,
    });

    // Log telemetry event (server-side logging)
    console.log('TELEMETRY: adaptive_state_updated', {
      uid: uid.substring(0, 8) + '...', // Partial UID for privacy
      oldScalar: Math.round(currentState.difficultyScalar * 100) / 100,
      newScalar: Math.round(newScalar * 100) / 100,
      scalarChange: Math.round((newScalar - currentState.difficultyScalar) * 100) / 100,
      signal,
      recentCompletion: Math.round(recentCompletion * 100) / 100,
    });

    return updatedState;
  } catch (error) {
    console.error('Error updating adaptive state:', error);
    throw error;
  }
}

/**
 * Compute the next difficulty scalar based on feedback and completion rate
 */
export function computeNextScalar(
  prevScalar: number,
  signal: 'easy' | 'right' | 'hard',
  recentCompletion?: number
): number {
  let newScalar = prevScalar;

  // Apply feedback adjustment
  switch (signal) {
  case 'easy':
    newScalar += 0.1; // Increase difficulty
    break;
  case 'hard':
    newScalar -= 0.1; // Decrease difficulty
    break;
  case 'right':
    newScalar += 0.02; // Progressive overload
    break;
  }

  // Apply completion rate bias if available
  if (recentCompletion !== undefined) {
    if (recentCompletion < 0.6) {
      newScalar -= 0.05; // Bias downward for low completion
    } else if (recentCompletion > 0.9) {
      newScalar += 0.05; // Bias upward for high completion
    }
  }

  // Clamp to safe bounds
  return Math.max(0.6, Math.min(1.4, newScalar));
}

/**
 * Calculate recent completion rate from user's workout history
 */
export async function calculateRecentCompletionRate(uid: string, lookbackCount = 5): Promise<number> {
  const db = getFirestore();

  try {
    const workoutsRef = db.collection('users').doc(uid).collection('workouts');
    const query = workoutsRef.orderBy('timestamp', 'desc').limit(lookbackCount);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return 0.8; // Default completion rate for new users
    }

    let totalSets = 0;
    let completedSets = 0;

    snapshot.docs.forEach((doc) => {
      const workout = doc.data() as WorkoutData;

      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach((exercise) => {
          if (exercise.weights && typeof exercise.weights === 'object') {
            const setCount = exercise.sets || Object.keys(exercise.weights).length;
            totalSets += setCount;

            // Count completed sets (non-null weights)
            Object.values(exercise.weights).forEach((weight) => {
              if (weight !== null && weight !== undefined) {
                completedSets++;
              }
            });
          } else {
            // Fallback: assume all sets completed if no weight data
            totalSets += exercise.sets || 0;
            completedSets += exercise.sets || 0;
          }
        });
      }
    });

    if (totalSets === 0) {
      return 0.8; // Default if no set data available
    }

    const completionRate = completedSets / totalSets;
    console.log(`Calculated completion rate for ${uid}:`, {
      completedSets,
      totalSets,
      completionRate,
      workoutCount: snapshot.size,
    });

    return Math.max(0, Math.min(1, completionRate));
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return 0.8; // Safe default on error
  }
}

/**
 * Generate progression note for AI prompt based on adaptive state
 */
export function generateProgressionNote(
  prevScalar: number,
  newScalar: number,
  feedback: 'easy' | 'right' | 'hard' | null
): string {
  const intensityChange = ((newScalar - 1.0) - (prevScalar - 1.0)) * 100;

  if (!feedback) {
    return newScalar > 1.0
      ? `Increase difficulty ~${Math.round((newScalar - 1.0) * 100)}% safely`
      : newScalar < 1.0
        ? `Decrease difficulty ~${Math.round((1.0 - newScalar) * 100)}% safely`
        : 'Maintain baseline difficulty';
  }

  const feedbackText = {
    easy: 'user rated last workout too easy',
    hard: 'user rated last workout too hard',
    right: 'user rated last workout just right',
  }[feedback];

  if (Math.abs(intensityChange) < 1) {
    return `${feedbackText}; maintain current difficulty level`;
  }

  return intensityChange > 0
    ? `${feedbackText}; increase difficulty ~${Math.round(Math.abs(intensityChange))}% safely`
    : `${feedbackText}; decrease difficulty ~${Math.round(Math.abs(intensityChange))}% safely`;
}