import { supabase } from '@/services/supabase'
import type {
  EvaluationCategory,
  EvaluationQuestion,
  EvaluationStatus,
  GipEvaluation,
} from '@/types/common/evaluation'
import {
  buildAnswersPayload,
  getCurrentPeriodMonth,
  parseAnswers,
  toEvaluationErrorMessage,
} from '@/helpers/common/evaluationHelper'

/**
 * Supervisor Evaluation screen: the active questions and the month's evaluations of GIPs in the
 * supervisor's office. RLS limits reads and writes to their own office; core.check_gip_evaluation
 * fixes the month, the evaluator, the question text and the scores on the server.
 */

const EVALUATION_COLUMNS =
  'id, profile_id, period_month, answers, performance_score, attitude_score, overall_score, remarks, status, submitted_at, updated_at'

export interface SaveEvaluationInput {
  /** Existing draft to update; omit to create this month's evaluation */
  id?: string
  profileId: string
  ratings: Record<string, number>
  remarks: string
  status: EvaluationStatus
}

type EvaluationRowLike = {
  id: string
  profile_id: string
  period_month: string
  answers: Parameters<typeof parseAnswers>[0]
  performance_score: number | null
  attitude_score: number | null
  overall_score: number | null
  remarks: string | null
  status: string
  submitted_at: string | null
  updated_at: string
}

const toEvaluation = (row: EvaluationRowLike): GipEvaluation => ({
  id: row.id,
  profileId: row.profile_id,
  periodMonth: row.period_month,
  answers: parseAnswers(row.answers),
  scores: { performance: row.performance_score, attitude: row.attitude_score, overall: row.overall_score },
  remarks: row.remarks ?? '',
  status: row.status === 'Submitted' ? 'Submitted' : 'Draft',
  submittedAt: row.submitted_at,
  updatedAt: row.updated_at,
})

export const supervisorEvaluationService = {
  /** Active questions (RLS shows supervisors only the active ones) */
  async getActiveQuestions(): Promise<EvaluationQuestion[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('evaluation_questions')
      .select('id, category, question, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error('Failed to load the evaluation questions.')
    return (data ?? []).map((row) => ({
      id: row.id,
      category: row.category as EvaluationCategory,
      question: row.question,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    }))
  },

  /** The office's evaluations for one month (yyyy-mm-01) */
  async getMonthEvaluations(periodMonth: string): Promise<GipEvaluation[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('gip_evaluations')
      .select(EVALUATION_COLUMNS)
      .eq('period_month', periodMonth)
    if (error) throw new Error('Failed to load this month’s evaluations.')
    return (data ?? []).map(toEvaluation)
  },

  /** One GIP's evaluation for one month (yyyy-mm-01), or null when not started */
  async getEvaluation(profileId: string, periodMonth: string): Promise<GipEvaluation | null> {
    const { data, error } = await supabase
      .schema('core')
      .from('gip_evaluations')
      .select(EVALUATION_COLUMNS)
      .eq('profile_id', profileId)
      .eq('period_month', periodMonth)
      .maybeSingle()
    if (error) throw new Error('Failed to load the evaluation.')
    return data ? toEvaluation(data) : null
  },

  /** Creates or updates this month's evaluation as a draft or submits it */
  async saveEvaluation(input: SaveEvaluationInput): Promise<GipEvaluation> {
    const payload = {
      answers: buildAnswersPayload(input.ratings),
      remarks: input.remarks.trim() || null,
      status: input.status,
    }

    if (input.id) {
      const { data, error } = await supabase
        .schema('core')
        .from('gip_evaluations')
        .update(payload)
        .eq('id', input.id)
        .select(EVALUATION_COLUMNS)
      if (error) throw new Error(toEvaluationErrorMessage(error, 'Failed to save the evaluation.'))
      const row = data?.[0]
      if (!row) throw new Error('This evaluation can no longer be changed.')
      return toEvaluation(row)
    }

    const { data, error } = await supabase
      .schema('core')
      .from('gip_evaluations')
      // The database sets period_month to the current month (PHT) whatever is sent
      .insert({ ...payload, profile_id: input.profileId, period_month: getCurrentPeriodMonth() })
      .select(EVALUATION_COLUMNS)
      .single()
    if (error) throw new Error(toEvaluationErrorMessage(error, 'Failed to save the evaluation.'))
    return toEvaluation(data)
  },

  /** Discards a draft. Returns false when nothing was deleted (already submitted or gone). */
  async deleteDraft(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .schema('core')
      .from('gip_evaluations')
      .delete()
      .eq('id', id)
      .eq('status', 'Draft')
      .select('id')
    if (error) throw new Error('Failed to discard the draft.')
    return (data?.length ?? 0) > 0
  },
}
