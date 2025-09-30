// AI-powered personalization engine for NeuraFit
// Provides contextual workout suggestions and adaptive difficulty

import { type WorkoutSession } from './weightHistory'
import { AnalyticsEngine } from './analytics'

export interface PersonalizationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  dayOfWeek: number // 0-6, Sunday = 0
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'hot' | 'cold'
  mood?: 'energetic' | 'tired' | 'motivated' | 'stressed' | 'neutral'
  availableTime: number // minutes
  lastWorkoutDays: number // days since last workout
  recentPerformance: 'improving' | 'declining' | 'stable'
  injuryHistory: string[]
  preferredExercises: string[]
  equipment: string[]
}

export interface PersonalizedRecommendation {
  type: 'workout_type' | 'intensity' | 'duration' | 'rest_period' | 'exercise_selection' | 'motivation'
  title: string
  description: string
  reasoning: string
  confidence: number // 0-1
  priority: 'high' | 'medium' | 'low'
  action?: {
    type: 'adjust_weight' | 'change_exercise' | 'modify_rest' | 'extend_warmup'
    value: string | number
  }
}

export interface AdaptiveDifficulty {
  baseIntensity: number // 0-1
  volumeMultiplier: number // 0.5-2.0
  restMultiplier: number // 0.5-2.0
  exerciseComplexity: 'beginner' | 'intermediate' | 'advanced'
  progressionRate: number // 0-1, how aggressively to progress
}

export class PersonalizationEngine {
  private sessions: WorkoutSession[]
  private analytics: AnalyticsEngine
  private userProfile: Record<string, unknown>

  constructor(sessions: WorkoutSession[], userProfile: Record<string, unknown> = {}) {
    this.sessions = sessions
    this.analytics = new AnalyticsEngine(sessions)
    this.userProfile = userProfile
  }

  public generateRecommendations(context: PersonalizationContext): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []

    // Time-based recommendations
    recommendations.push(...this.getTimeBasedRecommendations(context))
    
    // Performance-based recommendations
    recommendations.push(...this.getPerformanceRecommendations(context))
    
    // Recovery-based recommendations
    recommendations.push(...this.getRecoveryRecommendations(context))
    
    // Motivation recommendations
    recommendations.push(...this.getMotivationRecommendations(context))

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const scoreA = priorityWeight[a.priority] * a.confidence
      const scoreB = priorityWeight[b.priority] * b.confidence
      return scoreB - scoreA
    })
  }

  private getTimeBasedRecommendations(context: PersonalizationContext): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []

    // Morning workout recommendations
    if (context.timeOfDay === 'morning') {
      recommendations.push({
        type: 'workout_type',
        title: 'Morning Energy Boost',
        description: 'Start with dynamic movements and compound exercises',
        reasoning: 'Morning workouts benefit from exercises that activate multiple muscle groups and boost energy',
        confidence: 0.8,
        priority: 'medium',
        action: {
          type: 'extend_warmup',
          value: 5 // extra 5 minutes
        }
      })
    }

    // Evening workout recommendations
    if (context.timeOfDay === 'evening') {
      recommendations.push({
        type: 'intensity',
        title: 'Evening Wind-Down',
        description: 'Consider moderate intensity to avoid disrupting sleep',
        reasoning: 'High-intensity evening workouts can interfere with sleep quality',
        confidence: 0.7,
        priority: 'medium',
        action: {
          type: 'adjust_weight',
          value: 0.9 // 10% reduction
        }
      })
    }

    // Weekend vs weekday
    if (context.dayOfWeek === 0 || context.dayOfWeek === 6) {
      recommendations.push({
        type: 'duration',
        title: 'Weekend Extended Session',
        description: 'Take advantage of extra time for a longer, more comprehensive workout',
        reasoning: 'Weekends typically allow for longer workout sessions',
        confidence: 0.6,
        priority: 'low'
      })
    }

    return recommendations
  }

  private getPerformanceRecommendations(context: PersonalizationContext): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []
    const metrics = this.analytics.getPerformanceMetrics()

    // Consistency recommendations
    if (metrics.consistencyScore < 60) {
      recommendations.push({
        type: 'motivation',
        title: 'Consistency Boost Needed',
        description: 'Focus on shorter, more frequent workouts to build habit',
        reasoning: `Your consistency score is ${metrics.consistencyScore}%. Shorter sessions can help build routine`,
        confidence: 0.9,
        priority: 'high',
        action: {
          type: 'modify_rest',
          value: 0.8 // Shorter rest periods for quicker sessions
        }
      })
    }

    // Progression recommendations
    if (metrics.progressionRate < 2) {
      recommendations.push({
        type: 'intensity',
        title: 'Progressive Overload Needed',
        description: 'Time to increase weights or reps to continue progressing',
        reasoning: `Your progression rate is ${metrics.progressionRate.toFixed(1)}%. Consider increasing intensity`,
        confidence: 0.85,
        priority: 'high',
        action: {
          type: 'adjust_weight',
          value: 1.05 // 5% increase
        }
      })
    }

    // Volume recommendations
    if (context.lastWorkoutDays > 3) {
      recommendations.push({
        type: 'workout_type',
        title: 'Gradual Return',
        description: 'Start with moderate intensity after time off',
        reasoning: `It's been ${context.lastWorkoutDays} days since your last workout. Ease back in`,
        confidence: 0.8,
        priority: 'high',
        action: {
          type: 'adjust_weight',
          value: 0.85 // 15% reduction
        }
      })
    }

    return recommendations
  }

  private getRecoveryRecommendations(context: PersonalizationContext): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []

    // Mood-based adjustments
    if (context.mood === 'tired') {
      recommendations.push({
        type: 'intensity',
        title: 'Active Recovery Focus',
        description: 'Light movement and mobility work when feeling tired',
        reasoning: 'When tired, active recovery can be more beneficial than intense training',
        confidence: 0.8,
        priority: 'high',
        action: {
          type: 'adjust_weight',
          value: 0.7 // 30% reduction
        }
      })
    }

    if (context.mood === 'stressed') {
      recommendations.push({
        type: 'rest_period',
        title: 'Extended Rest Periods',
        description: 'Take longer breaks between sets to manage stress',
        reasoning: 'Stress can impact recovery. Longer rest periods help maintain form and reduce cortisol',
        confidence: 0.75,
        priority: 'medium',
        action: {
          type: 'modify_rest',
          value: 1.3 // 30% longer rest
        }
      })
    }

    // Injury considerations
    if (context.injuryHistory.length > 0) {
      recommendations.push({
        type: 'exercise_selection',
        title: 'Injury-Aware Exercise Selection',
        description: 'Modified exercises to accommodate injury history',
        reasoning: `Considering your history with ${context.injuryHistory.join(', ')}`,
        confidence: 0.9,
        priority: 'high',
        action: {
          type: 'change_exercise',
          value: context.injuryHistory.join(', ')
        }
      })
    }

    return recommendations
  }

  private getMotivationRecommendations(context: PersonalizationContext): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []

    // Weather-based motivation
    if (context.weather === 'rainy') {
      recommendations.push({
        type: 'motivation',
        title: 'Indoor Energy Boost',
        description: 'Beat the rainy day blues with an energizing workout',
        reasoning: 'Rainy weather can affect mood. Exercise helps counteract this',
        confidence: 0.6,
        priority: 'low'
      })
    }

    // Preferred exercise integration
    if (context.preferredExercises.length > 0) {
      recommendations.push({
        type: 'exercise_selection',
        title: 'Favorite Exercise Integration',
        description: `Include your preferred exercises: ${context.preferredExercises.slice(0, 2).join(', ')}`,
        reasoning: 'Including preferred exercises increases workout enjoyment and adherence',
        confidence: 0.7,
        priority: 'medium'
      })
    }

    return recommendations
  }

  public calculateAdaptiveDifficulty(context: PersonalizationContext): AdaptiveDifficulty {
    const metrics = this.analytics.getPerformanceMetrics()
    
    // Base intensity calculation
    let baseIntensity = 0.7 // Default moderate intensity
    
    // Adjust based on recent performance
    if (context.recentPerformance === 'improving') {
      baseIntensity += 0.1
    } else if (context.recentPerformance === 'declining') {
      baseIntensity -= 0.15
    }
    
    // Adjust based on time since last workout
    if (context.lastWorkoutDays > 7) {
      baseIntensity -= 0.2
    } else if (context.lastWorkoutDays < 2) {
      baseIntensity -= 0.1 // Prevent overtraining
    }
    
    // Mood adjustments
    if (context.mood === 'tired') {
      baseIntensity -= 0.2
    } else if (context.mood === 'energetic') {
      baseIntensity += 0.1
    }
    
    // Volume multiplier
    let volumeMultiplier = 1.0
    if (context.availableTime < 30) {
      volumeMultiplier = 0.7 // Reduce volume for short sessions
    } else if (context.availableTime > 60) {
      volumeMultiplier = 1.3 // Increase volume for longer sessions
    }
    
    // Rest multiplier
    let restMultiplier = 1.0
    if (context.mood === 'stressed' || context.lastWorkoutDays > 5) {
      restMultiplier = 1.3 // Longer rest for recovery
    } else if (context.availableTime < 30) {
      restMultiplier = 0.8 // Shorter rest for time-constrained sessions
    }
    
    // Exercise complexity
    let exerciseComplexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
    if (metrics.totalWorkouts < 10) {
      exerciseComplexity = 'beginner'
    } else if (metrics.totalWorkouts > 50 && metrics.progressionRate > 5) {
      exerciseComplexity = 'advanced'
    }
    
    // Progression rate
    let progressionRate = 0.5
    if (context.recentPerformance === 'improving' && context.mood === 'motivated') {
      progressionRate = 0.8
    } else if (context.recentPerformance === 'declining') {
      progressionRate = 0.2
    }
    
    return {
      baseIntensity: Math.max(0.3, Math.min(1.0, baseIntensity)),
      volumeMultiplier: Math.max(0.5, Math.min(2.0, volumeMultiplier)),
      restMultiplier: Math.max(0.5, Math.min(2.0, restMultiplier)),
      exerciseComplexity,
      progressionRate: Math.max(0.1, Math.min(1.0, progressionRate))
    }
  }

  public generateContextualMotivation(context: PersonalizationContext): string[] {
    const motivations: string[] = []
    const metrics = this.analytics.getPerformanceMetrics()
    const totalSessions = this.sessions.length

    // Performance-based motivation
    if (metrics.progressionRate > 5) {
      motivations.push("You're on fire! Your progress rate is amazing - keep pushing!")
    } else if (metrics.consistencyScore > 80) {
      motivations.push("Your consistency is paying off! Every workout counts.")
    }

    // Time-based motivation
    if (context.timeOfDay === 'morning') {
      motivations.push("Great way to start the day! Morning workouts set a positive tone.")
    } else if (context.timeOfDay === 'evening') {
      motivations.push("Perfect way to unwind! Evening workouts help release daily stress.")
    }

    // Mood-based motivation
    if (context.mood === 'tired') {
      motivations.push("Even a light workout is better than none. You've got this!")
    } else if (context.mood === 'motivated') {
      motivations.push("Channel that motivation! This is your moment to shine.")
    }

    // Weather-based motivation
    if (context.weather === 'rainy') {
      motivations.push("While it's raining outside, you're making it rain gains inside!")
    } else if (context.weather === 'sunny') {
      motivations.push("Beautiful day for a beautiful workout! Let's make it count.")
    }

    // Default motivations if none match
    if (motivations.length === 0) {
      const baseMotivations = [
        "Every rep brings you closer to your goals!",
        "Focus on form, the results will follow.",
        "You're stronger than you think!"
      ]

      // Add session-specific motivation if we have data
      if (totalSessions > 0) {
        baseMotivations.push(`You've completed ${totalSessions} sessions - keep the momentum!`)
      }

      // Add user profile specific motivation if available
      if (this.userProfile?.goals && Array.isArray(this.userProfile.goals) && this.userProfile.goals.length > 0) {
        baseMotivations.push(`Remember your goal: ${this.userProfile.goals[0]}`)
      }

      motivations.push(...baseMotivations)
    }

    return motivations.slice(0, 2) // Return top 2 motivations
  }

  public predictOptimalRestPeriod(exerciseName: string, setNumber: number, context: PersonalizationContext): number {
    // Base rest periods by exercise type
    const baseRestPeriods: Record<string, number> = {
      'Squat': 180,
      'Deadlift': 180,
      'Bench Press': 150,
      'Pull-up': 120,
      'Push-up': 90,
      'Plank': 60
    }

    let baseRest = baseRestPeriods[exerciseName] || 120 // Default 2 minutes

    // Adjust based on set number (later sets need more rest)
    baseRest += (setNumber - 1) * 15

    // Apply context multipliers
    const difficulty = this.calculateAdaptiveDifficulty(context)
    baseRest *= difficulty.restMultiplier

    // Round to nearest 15 seconds
    return Math.round(baseRest / 15) * 15
  }
}

// Utility functions
export function getCurrentContext(): PersonalizationContext {
  const now = new Date()
  const hour = now.getHours()
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening'
  if (hour < 12) timeOfDay = 'morning'
  else if (hour < 17) timeOfDay = 'afternoon'
  else timeOfDay = 'evening'

  // Get last workout from storage
  const lastWorkoutStr = localStorage.getItem('nf_last_workout_date')
  const lastWorkoutDate = lastWorkoutStr ? new Date(lastWorkoutStr) : new Date(0)
  const lastWorkoutDays = Math.floor((now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    timeOfDay,
    dayOfWeek: now.getDay(),
    availableTime: 45, // Default 45 minutes
    lastWorkoutDays,
    recentPerformance: 'stable', // Would be calculated from actual data
    injuryHistory: [],
    preferredExercises: [],
    equipment: ['dumbbells', 'barbell', 'bodyweight'],
    mood: 'neutral'
  }
}

export function saveWorkoutContext() {
  localStorage.setItem('nf_last_workout_date', new Date().toISOString())
}
