export type UserProfile = {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: { sex?: string; height?: string; weight?: string }
  injuries?: { list?: string[]; notes?: string }
}

/**
 * Adjust this rule to your business criteria.
 * Minimal, stable rule: experience + at least one goal + height + weight.
 */
export function isProfileComplete(p?: UserProfile | null): boolean {
  if (!p) return false
  if (!p.experience) return false
  if (!p.goals || p.goals.length === 0) return false
  if (!p.personal?.height || !p.personal?.weight) return false
  return true
}