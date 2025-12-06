import type { ExperienceListItem, Experience, Skill, Technology } from '@/types'

// ============================================================================
// Proficiency Calculation Utilities
// ============================================================================

export interface ItemWithProficiency {
  id: string
  name: string
  count: number
  totalMonths: number
}

/**
 * Calculate months between two dates
 */
export const calculateMonths = (startDate: string, endDate: string | null, isCurrent: boolean): number => {
  const start = new Date(startDate)
  const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date()
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()))
}

/**
 * Aggregate skills from experiences with proficiency data
 */
export const aggregateSkillsWithProficiency = (
  experiences: (ExperienceListItem | Experience)[]
): ItemWithProficiency[] => {
  const skillMap = new Map<string, ItemWithProficiency>()

  experiences.forEach(exp => {
    const months = calculateMonths(exp.start_date, exp.end_date, exp.is_current)
    const skills = (exp as ExperienceListItem).skills || []
    skills.forEach((skill: Skill) => {
      const existing = skillMap.get(skill.id)
      if (existing) {
        existing.count++
        existing.totalMonths += months
      } else {
        skillMap.set(skill.id, {
          id: skill.id,
          name: skill.name,
          count: 1,
          totalMonths: months,
        })
      }
    })
  })

  return Array.from(skillMap.values()).sort((a, b) => b.totalMonths - a.totalMonths || b.count - a.count)
}

/**
 * Aggregate technologies from experiences with proficiency data
 */
export const aggregateTechsWithProficiency = (
  experiences: (ExperienceListItem | Experience)[]
): ItemWithProficiency[] => {
  const techMap = new Map<string, ItemWithProficiency>()

  experiences.forEach(exp => {
    const months = calculateMonths(exp.start_date, exp.end_date, exp.is_current)
    const technologies = (exp as ExperienceListItem).technologies || []
    technologies.forEach((tech: Technology) => {
      const existing = techMap.get(tech.id)
      if (existing) {
        existing.count++
        existing.totalMonths += months
      } else {
        techMap.set(tech.id, {
          id: tech.id,
          name: tech.name,
          count: 1,
          totalMonths: months,
        })
      }
    })
  })

  return Array.from(techMap.values()).sort((a, b) => b.totalMonths - a.totalMonths || b.count - a.count)
}

/**
 * Get proficiency style based on total months of experience (gradient colors)
 *
 * Thresholds:
 * - < 12 months: Level 1 (beginner)
 * - 12-36 months: Level 2 (intermediate)
 * - 36-52 months: Level 3 (experienced)
 * - 52+ months: Level 4 (expert)
 */
export const getProficiencyStyle = (totalMonths: number, type: 'skill' | 'tech'): string => {
  const colors = {
    skill: {
      1: 'bg-purple-100 text-purple-700',
      2: 'bg-purple-200 text-purple-800',
      3: 'bg-purple-400 text-white',
      4: 'bg-purple-600 text-white',
    },
    tech: {
      1: 'bg-blue-100 text-blue-700',
      2: 'bg-blue-200 text-blue-800',
      3: 'bg-blue-400 text-white',
      4: 'bg-blue-600 text-white',
    },
  }

  let level: 1 | 2 | 3 | 4
  if (totalMonths < 24) {
    level = 1
  } else if (totalMonths < 48) {
    level = 2
  } else if (totalMonths <62) {
    level = 3
  } else {
    level = 4
  }

  return colors[type][level]
}

/**
 * Format total duration for tooltip
 */
export const formatTotalDuration = (months: number): string => {
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }
  return `${years}y ${remainingMonths}m`
}
