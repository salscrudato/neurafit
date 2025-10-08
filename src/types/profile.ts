/**
 * User Profile Types
 * Strongly typed interfaces for user profile data
 */

export interface PersonalInfo {
  sex: string
  height: string
  weight: string
  age?: string
}

export interface InjuryInfo {
  list: string[]
  notes?: string
}

export interface UserProfile {
  experience: string
  goals: string[]
  equipment: string[]
  personal: PersonalInfo
  injuries?: InjuryInfo
  createdAt?: number
  updatedAt?: number
}

export interface WorkoutPreferences {
  preferredDuration: number
  preferredTypes: string[]
  restTime: number
}

/**
 * Type guard to check if profile is complete
 */
export function isCompleteProfile(profile: Partial<UserProfile>): profile is UserProfile {
  return !!(
    profile.experience &&
    profile.goals?.length &&
    profile.equipment?.length &&
    profile.personal?.height &&
    profile.personal?.weight &&
    profile.personal?.sex
  )
}

