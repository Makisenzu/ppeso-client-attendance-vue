import type { TeamMember } from '@/types/supervisor/team'
import type { EvaluationCategory, GipEvaluation } from '@/types/common/evaluation'

/** One active GIP on the supervisor's Evaluation list, with this month's evaluation (if started). */
export interface TeamEvaluationRow {
  member: TeamMember
  evaluation: GipEvaluation | null
}

export type TeamEvaluationStatusFilter = 'ALL' | 'not_started' | 'Draft' | 'Submitted'

/** A question group on the evaluation form (questions to rate, or the saved answers when read-only). */
export interface EvaluationFormGroup {
  category: EvaluationCategory
  label: string
  hint: string
  /** `number` counts across all groups (1, 2, 3 … on the whole form) */
  items: { id: string; question: string; number: number }[]
}

/** How far a category is rated on the evaluation form, with its running average. */
export interface EvaluationCategoryProgress {
  category: EvaluationCategory
  label: string
  rated: number
  total: number
  average: number | null
}
