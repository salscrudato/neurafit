// Advanced analytics engine for NeuraFit
// Provides comprehensive workout performance analysis and insights

import { type WorkoutSession } from './weightHistory'

export interface PerformanceMetrics {
  totalWorkouts: number
  totalSets: number
  totalVolume: number // Total weight lifted
  averageWorkoutDuration: number
  workoutFrequency: number // Workouts per week
  consistencyScore: number // 0-100 based on workout regularity
  progressionRate: number // Rate of improvement
  personalRecords: PersonalRecord[]
  weeklyStats: WeeklyStats[]
  exerciseStats: ExerciseStats[]
}

export interface PersonalRecord {
  exerciseName: string
  weight: number
  reps: number
  date: Date
  previousRecord?: {
    weight: number
    reps: number
    date: Date
  }
}

export interface WeeklyStats {
  weekStart: Date
  workouts: number
  totalSets: number
  totalVolume: number
  averageDuration: number
  topExercises: string[]
}

export interface ExerciseStats {
  name: string
  totalSets: number
  totalVolume: number
  averageWeight: number
  maxWeight: number
  progressionRate: number // % improvement over time
  lastPerformed: Date
  frequency: number // Times per week
  volumeTrend: 'increasing' | 'decreasing' | 'stable'
}

export interface ProgressionAnalysis {
  exercise: string
  timeframe: 'week' | 'month' | 'quarter'
  startWeight: number
  endWeight: number
  improvement: number
  improvementPercentage: number
  recommendation: string
}

export class AnalyticsEngine {
  private sessions: WorkoutSession[]

  constructor(sessions: WorkoutSession[]) {
    this.sessions = sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const totalWorkouts = this.sessions.length
    const totalSets = this.calculateTotalSets()
    const totalVolume = this.calculateTotalVolume()
    const averageWorkoutDuration = this.calculateAverageWorkoutDuration()
    const workoutFrequency = this.calculateWorkoutFrequency()
    const consistencyScore = this.calculateConsistencyScore()
    const progressionRate = this.calculateProgressionRate()
    const personalRecords = this.findPersonalRecords()
    const weeklyStats = this.generateWeeklyStats()
    const exerciseStats = this.generateExerciseStats()

    return {
      totalWorkouts,
      totalSets,
      totalVolume,
      averageWorkoutDuration,
      workoutFrequency,
      consistencyScore,
      progressionRate,
      personalRecords,
      weeklyStats,
      exerciseStats
    }
  }

  private calculateTotalSets(): number {
    return this.sessions.reduce((total, session) => {
      return total + session.exercises.reduce((sessionTotal, exercise) => {
        return sessionTotal + exercise.sets.filter(set => set.completed && set.weight !== null).length
      }, 0)
    }, 0)
  }

  private calculateTotalVolume(): number {
    return this.sessions.reduce((total, session) => {
      return total + session.exercises.reduce((sessionTotal, exercise) => {
        return sessionTotal + exercise.sets.reduce((exerciseTotal, set) => {
          return exerciseTotal + (set.completed && set.weight ? set.weight : 0)
        }, 0)
      }, 0)
    }, 0)
  }

  private calculateAverageWorkoutDuration(): number {
    if (this.sessions.length === 0) return 0
    
    const totalDuration = this.sessions.reduce((total, session) => {
      // Estimate duration based on number of exercises and sets (rough estimate)
      const estimatedDuration = session.exercises.length * 15 + // 15 min per exercise
        session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) * 2 // 2 min per set
      return total + estimatedDuration * 60000 // Convert to milliseconds
    }, 0)
    
    return totalDuration / this.sessions.length / (1000 * 60) // Convert to minutes
  }

  private calculateWorkoutFrequency(): number {
    if (this.sessions.length < 2) return 0
    
    const firstWorkout = new Date(this.sessions[0].date)
    const lastWorkout = new Date(this.sessions[this.sessions.length - 1].date)
    const daysDiff = (lastWorkout.getTime() - firstWorkout.getTime()) / (1000 * 60 * 60 * 24)
    const weeks = daysDiff / 7
    
    return weeks > 0 ? this.sessions.length / weeks : 0
  }

  private calculateConsistencyScore(): number {
    if (this.sessions.length < 2) return 0
    
    const last30Days = this.sessions.filter(session => {
      const sessionDate = new Date(session.date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return sessionDate >= thirtyDaysAgo
    })
    
    // Calculate consistency based on workout distribution
    const workoutDays = last30Days.map(session => new Date(session.date).getDay())
    const uniqueDays = new Set(workoutDays).size
    const frequency = last30Days.length
    
    // Score based on frequency and day distribution
    const frequencyScore = Math.min(frequency / 12, 1) * 70 // Up to 70 points for frequency
    const distributionScore = (uniqueDays / 7) * 30 // Up to 30 points for day distribution
    
    return Math.round(frequencyScore + distributionScore)
  }

  private calculateProgressionRate(): number {
    // Calculate overall progression rate based on weight increases
    const exerciseProgressions = this.getExerciseProgressions()
    if (exerciseProgressions.length === 0) return 0
    
    const averageProgression = exerciseProgressions.reduce((sum, prog) => sum + prog.improvementPercentage, 0) / exerciseProgressions.length
    return Math.round(averageProgression * 100) / 100
  }

  private findPersonalRecords(): PersonalRecord[] {
    const records: PersonalRecord[] = []
    const exerciseMaxes: Record<string, { weight: number; reps: number; date: Date; session: WorkoutSession }> = {}

    this.sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (!set.completed || !set.weight) return

          const key = exercise.name
          const currentMax = exerciseMaxes[key]

          if (!currentMax || set.weight > currentMax.weight) {
            const previousRecord = currentMax ? {
              weight: currentMax.weight,
              reps: currentMax.reps,
              date: currentMax.date
            } : undefined

            exerciseMaxes[key] = {
              weight: set.weight,
              reps: set.reps,
              date: new Date(session.date),
              session
            }

            // Only add to records if it's a new record (not the first entry)
            if (previousRecord) {
              records.push({
                exerciseName: exercise.name,
                weight: set.weight,
                reps: set.reps,
                date: new Date(session.date),
                previousRecord
              })
            }
          }
        })
      })
    })

    return records.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10) // Last 10 PRs
  }

  private generateWeeklyStats(): WeeklyStats[] {
    const weeklyData: Record<string, WeeklyStats> = {}
    
    this.sessions.forEach(session => {
      const sessionDate = new Date(session.date)
      const weekStart = new Date(sessionDate)
      weekStart.setDate(sessionDate.getDate() - sessionDate.getDay()) // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekKey = weekStart.toISOString()
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart,
          workouts: 0,
          totalSets: 0,
          totalVolume: 0,
          averageDuration: 0,
          topExercises: []
        }
      }
      
      const week = weeklyData[weekKey]
      week.workouts++
      
      // Calculate sets and volume for this session
      const sessionSets = session.exercises.reduce((total, exercise) => {
        return total + exercise.sets.filter(set => set.completed && set.weight !== null).length
      }, 0)

      const sessionVolume = session.exercises.reduce((total, exercise) => {
        return total + exercise.sets.reduce((sum, set) => sum + (set.completed && set.weight ? set.weight : 0), 0)
      }, 0)

      week.totalSets += sessionSets
      week.totalVolume += sessionVolume
      
      // Track exercise frequency
      const exerciseNames = (session.exercises || []).map(ex => ex.name)
      week.topExercises = [...new Set([...week.topExercises, ...exerciseNames])]
    })
    
    return Object.values(weeklyData)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
      .slice(0, 12) // Last 12 weeks
  }

  private generateExerciseStats(): ExerciseStats[] {
    const exerciseData: Record<string, {
      sets: number[]
      weights: number[]
      dates: Date[]
      totalVolume: number
    }> = {}
    
    this.sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const exerciseName = exercise.name

        if (!exerciseData[exerciseName]) {
          exerciseData[exerciseName] = {
            sets: [],
            weights: [],
            dates: [],
            totalVolume: 0
          }
        }

        const data = exerciseData[exerciseName]

        exercise.sets.forEach(set => {
          if (set.completed && set.weight !== null && set.weight !== undefined) {
            data.sets.push(1)
            data.weights.push(set.weight)
            data.dates.push(new Date(session.date))
            data.totalVolume += set.weight
          }
        })
      })
    })
    
    return Object.entries(exerciseData).map(([name, data]) => {
      const totalSets = data.sets.length
      const averageWeight = data.weights.length > 0 ? data.weights.reduce((sum, w) => sum + w, 0) / data.weights.length : 0
      const maxWeight = data.weights.length > 0 ? Math.max(...data.weights) : 0
      const lastPerformed = data.dates.length > 0 ? new Date(Math.max(...data.dates.map(d => d.getTime()))) : new Date()
      
      // Calculate progression rate
      const progressionRate = this.calculateExerciseProgression(data.weights, data.dates)
      
      // Calculate frequency (times per week)
      const uniqueWeeks = new Set(data.dates.map(date => {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().split('T')[0]
      })).size
      
      const frequency = uniqueWeeks > 0 ? totalSets / uniqueWeeks : 0
      
      // Determine volume trend
      const volumeTrend = this.calculateVolumeTrend(data.weights, data.dates)
      
      return {
        name,
        totalSets,
        totalVolume: data.totalVolume,
        averageWeight: Math.round(averageWeight * 100) / 100,
        maxWeight,
        progressionRate,
        lastPerformed,
        frequency: Math.round(frequency * 100) / 100,
        volumeTrend
      }
    }).sort((a, b) => b.totalVolume - a.totalVolume) // Sort by total volume
  }

  private calculateExerciseProgression(weights: number[], dates: Date[]): number {
    if (weights.length < 2) return 0
    
    // Simple linear regression to find progression rate
    const sortedData = weights.map((weight, index) => ({ weight, date: dates[index] }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    
    const firstWeight = sortedData[0].weight
    const lastWeight = sortedData[sortedData.length - 1].weight
    
    return firstWeight > 0 ? ((lastWeight - firstWeight) / firstWeight) * 100 : 0
  }

  private calculateVolumeTrend(weights: number[], _dates: Date[]): 'increasing' | 'decreasing' | 'stable' {
    if (weights.length < 3) return 'stable'
    
    const recentWeights = weights.slice(-5) // Last 5 workouts
    const trend = recentWeights.reduce((acc, weight, index) => {
      if (index === 0) return acc
      return acc + (weight > recentWeights[index - 1] ? 1 : weight < recentWeights[index - 1] ? -1 : 0)
    }, 0)
    
    if (trend > 1) return 'increasing'
    if (trend < -1) return 'decreasing'
    return 'stable'
  }

  public getExerciseProgressions(): ProgressionAnalysis[] {
    const exerciseStats = this.generateExerciseStats()
    
    return exerciseStats.map(stat => {
      const recommendation = this.generateRecommendation(stat)
      
      return {
        exercise: stat.name,
        timeframe: 'month' as const,
        startWeight: stat.averageWeight * 0.9, // Approximate start weight
        endWeight: stat.maxWeight,
        improvement: stat.maxWeight - (stat.averageWeight * 0.9),
        improvementPercentage: stat.progressionRate,
        recommendation
      }
    }).filter(prog => prog.improvementPercentage !== 0)
  }

  private generateRecommendation(stat: ExerciseStats): string {
    if (stat.progressionRate > 10) {
      return `Excellent progress! Consider increasing weight by 5-10% next session.`
    } else if (stat.progressionRate > 0) {
      return `Good steady progress. Continue current progression.`
    } else if (stat.progressionRate < -5) {
      return `Consider deload week or form check. Progress has declined recently.`
    } else {
      return `Progress has plateaued. Try varying rep ranges or adding volume.`
    }
  }
}

// Utility functions for analytics
export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k lbs`
  }
  return `${volume} lbs`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function getProgressColor(progressionRate: number): string {
  if (progressionRate > 5) return 'text-green-600'
  if (progressionRate > 0) return 'text-blue-600'
  if (progressionRate > -5) return 'text-yellow-600'
  return 'text-red-600'
}

export function getTrendIcon(trend: 'increasing' | 'decreasing' | 'stable'): string {
  switch (trend) {
    case 'increasing': return '📈'
    case 'decreasing': return '📉'
    case 'stable': return '➡️'
  }
}
