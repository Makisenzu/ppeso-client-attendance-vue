import type { Database } from '@/types/database.types'

/** GIP evaluations: questions written by admins, monthly evaluations written by supervisors. */

export type EvaluationQuestionRow = Database['core']['Tables']['evaluation_questions']['Row']
export type GipEvaluationRow = Database['core']['Tables']['gip_evaluations']['Row']

export type EvaluationCategory = 'performance' | 'attitude'
export type EvaluationStatus = 'Draft' | 'Submitted'

/** A question on the admin Evaluations page and on the supervisor's evaluation form. */
export interface EvaluationQuestion {
  id: string
  category: EvaluationCategory
  question: string
  sortOrder: number
  isActive: boolean
}

export interface EvaluationQuestionFormData {
  category: EvaluationCategory
  question: string
  sortOrder: number
  isActive: boolean
}

/** One rated question, as stored on the evaluation (a copy of the question text). */
export interface EvaluationAnswer {
  questionId: string
  category: EvaluationCategory
  question: string
  rating: number
}

/** The scores the database computes from the answers (averages of 1–5 ratings). */
export interface EvaluationScores {
  performance: number | null
  attitude: number | null
  overall: number | null
}

/** A GIP evaluation (one per GIP per month). */
export interface GipEvaluation {
  id: string
  profileId: string
  /** ISO date of the month's first day, yyyy-mm-01 */
  periodMonth: string
  answers: EvaluationAnswer[]
  scores: EvaluationScores
  remarks: string
  status: EvaluationStatus
  submittedAt: string | null
  updatedAt: string
}

/** A submitted evaluation on the admin list, with the names it shows. */
export interface EvaluationRecord extends GipEvaluation {
  gipName: string
  /** The GIP's current office (null when they have none) */
  officeId: string | null
  officeName: string
  officeCode: string | null
  evaluatorName: string
}
