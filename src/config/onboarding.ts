/**
 * Centralized configuration for onboarding and profile data
 * This file contains all the constants used across onboarding and profile components
 * to ensure consistency and make updates easier.
 */

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Expert']

export const GOALS = [
  'Weight Loss',
  'Build Muscle',
  'Strength',
  'Stamina',
  'Tone',
  'General Health',
  'Increase Flexibility',
  'Sports Performance',
  'Mental Health',
  'Injury Prevention',
]

export const EQUIPMENT = [
  'Bodyweight',
  'Dumbbells',
  'Barbells',
  'Resistance Bands',
  'Kettlebells',
  'Medicine Balls',
  'Weight Machines',
  'Treadmill',
  'Stationary Bike',
  'Rowing Machine',
  'Pull-Up Bar',
  'Cable Machine',
]

export const SEX_OPTIONS = ['Male', 'Female', 'Other']

export const HEIGHT_RANGES = ["<5'0", "5'0–5'5", "5'6–5'9", "5'10–6'1", "6'2–6'5", ">6'5"]

export const WEIGHT_RANGES = ['<120lb', '120–149', '150–179', '180–209', '210–239', '240+lb']

export const INJURY_OPTIONS = ['None', 'Knee', 'Lower Back', 'Shoulder', 'Ankle', 'Wrist/Elbow', 'Neck', 'Other']

// Type exports for better TypeScript support
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Expert'
export type Goal = 'Weight Loss' | 'Build Muscle' | 'Strength' | 'Stamina' | 'Tone' | 'General Health' | 'Increase Flexibility' | 'Sports Performance' | 'Mental Health' | 'Injury Prevention'
export type Equipment = 'Bodyweight' | 'Dumbbells' | 'Barbells' | 'Resistance Bands' | 'Kettlebells' | 'Medicine Balls' | 'Weight Machines' | 'Treadmill' | 'Stationary Bike' | 'Rowing Machine' | 'Pull-Up Bar' | 'Cable Machine'
export type SexOption = 'Male' | 'Female' | 'Other'
export type HeightRange = "<5'0" | "5'0–5'5" | "5'6–5'9" | "5'10–6'1" | "6'2–6'5" | ">6'5"
export type WeightRange = '<120lb' | '120–149' | '150–179' | '180–209' | '210–239' | '240+lb'
export type InjuryOption = 'None' | 'Knee' | 'Lower Back' | 'Shoulder' | 'Ankle' | 'Wrist/Elbow' | 'Neck' | 'Other'
