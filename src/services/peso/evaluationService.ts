import { supabase } from '@/services/supabase'
import type {
  EvaluationCategory,
  EvaluationQuestion,
  EvaluationQuestionFormData,
  EvaluationQuestionRow,
  EvaluationRecord,
  GipEvaluationRow,
} from '@/types/common/evaluation'
import { parseAnswers } from '@/helpers/common/evaluationHelper'
import { formatNameWithMiddleInitial } from '@/helpers/common/nameHelper'

/**
 * Admin Evaluations page: the evaluation questions (CRUD) and every submitted GIP evaluation.
 * RLS (core.evaluation_questions / core.gip_evaluations) limits all writes here to active admins.
 */

const CHUNK_SIZE = 100

const QUESTION_COLUMNS = 'id, category, question, sort_order, is_active'
const EVALUATION_COLUMNS =
  'id, profile_id, evaluator_id, period_month, answers, performance_score, attitude_score, overall_score, remarks, status, submitted_at, updated_at'

type QuestionRow = Pick<EvaluationQuestionRow, 'id' | 'category' | 'question' | 'sort_order' | 'is_active'>
type EvaluationListRow = Pick<
  GipEvaluationRow,
  | 'id'
  | 'profile_id'
  | 'evaluator_id'
  | 'period_month'
  | 'answers'
  | 'performance_score'
  | 'attitude_score'
  | 'overall_score'
  | 'remarks'
  | 'status'
  | 'submitted_at'
  | 'updated_at'
>

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) out.push(items.slice(i, i + CHUNK_SIZE))
  return out
}

const toQuestion = (row: QuestionRow): EvaluationQuestion => ({
  id: row.id,
  category: row.category as EvaluationCategory,
  question: row.question,
  sortOrder: row.sort_order,
  isActive: row.is_active,
})

const toQuestionPayload = (form: EvaluationQuestionFormData) => ({
  category: form.category,
  question: form.question.trim(),
  sort_order: Math.round(form.sortOrder) || 0,
  is_active: form.isActive,
})

export const evaluationService = {
  // ─── Questions ───

  async getQuestions(): Promise<EvaluationQuestion[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('evaluation_questions')
      .select(QUESTION_COLUMNS)
      .order('sort_order', { ascending: true })
    if (error) throw new Error('Failed to load the evaluation questions.')
    return (data ?? []).map(toQuestion)
  },

  async createQuestion(form: EvaluationQuestionFormData): Promise<void> {
    const { error } = await supabase
      .schema('core')
      .from('evaluation_questions')
      .insert(toQuestionPayload(form))
      .select('id')
      .single()
    if (error) throw new Error('Failed to add the question.')
  },

  async updateQuestion(id: string, form: EvaluationQuestionFormData): Promise<void> {
    const { data, error } = await supabase
      .schema('core')
      .from('evaluation_questions')
      .update(toQuestionPayload(form))
      .eq('id', id)
      .select('id')
    if (error) throw new Error('Failed to save the question.')
    if (!data || data.length === 0) throw new Error('This question could not be updated. It may have been deleted.')
  },

  /** Deletes questions in chunks of 100 IDs. Returns the IDs actually deleted. Submitted evaluations keep their copy. */
  async deleteQuestions(ids: string[]): Promise<string[]> {
    const deletedIds: string[] = []
    for (const chunk of chunks(ids)) {
      const { data, error } = await supabase
        .schema('core')
        .from('evaluation_questions')
        .delete()
        .in('id', chunk)
        .select('id')
      if (error) throw new Error('Failed to delete the questions.')
      deletedIds.push(...(data ?? []).map((row) => row.id))
    }
    return deletedIds
  },

  // ─── Submitted evaluations ───

  /** Every submitted evaluation, newest first, with the GIP's name and office and the supervisor's name. */
  async getSubmittedEvaluations(): Promise<EvaluationRecord[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('gip_evaluations')
      .select(EVALUATION_COLUMNS)
      .eq('status', 'Submitted')
      .order('submitted_at', { ascending: false })
    if (error) throw new Error('Failed to load the evaluations.')
    const rows: EvaluationListRow[] = data ?? []
    if (rows.length === 0) return []

    // Names of the GIPs and supervisors, and the GIPs' offices — one request per 100 people
    const personIds = [...new Set(rows.flatMap((r) => [r.profile_id, r.evaluator_id]).filter((id): id is string => !!id))]
    const people = new Map<string, { name: string; officeId: string | null }>()
    for (const ids of chunks(personIds)) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, firstname, middlename, lastname, office_id')
        .in('id', ids)
      if (profileError) throw new Error('Failed to load the evaluations.')
      for (const p of profiles ?? []) {
        people.set(p.id, {
          name: formatNameWithMiddleInitial(p.firstname, p.middlename, p.lastname),
          officeId: p.office_id,
        })
      }
    }

    const officeIds = [...new Set([...people.values()].map((p) => p.officeId).filter((id): id is string => !!id))]
    const offices = new Map<string, string>()
    for (const ids of chunks(officeIds)) {
      const { data: officeRows, error: officeError } = await supabase.from('offices').select('id, name').in('id', ids)
      if (officeError) throw new Error('Failed to load the evaluations.')
      for (const o of officeRows ?? []) offices.set(o.id, o.name)
    }

    return rows.map((row) => {
      const gip = people.get(row.profile_id)
      return {
        id: row.id,
        profileId: row.profile_id,
        periodMonth: row.period_month,
        answers: parseAnswers(row.answers),
        scores: { performance: row.performance_score, attitude: row.attitude_score, overall: row.overall_score },
        remarks: row.remarks ?? '',
        status: 'Submitted',
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at,
        gipName: gip?.name ?? 'Deleted account',
        officeId: gip?.officeId ?? null,
        officeName: (gip?.officeId && offices.get(gip.officeId)) || '—',
        evaluatorName: (row.evaluator_id && people.get(row.evaluator_id)?.name) || '—',
      }
    })
  },

  /** Deletes evaluations in chunks of 100 IDs. Returns the IDs actually deleted. */
  async deleteEvaluations(ids: string[]): Promise<string[]> {
    const deletedIds: string[] = []
    for (const chunk of chunks(ids)) {
      const { data, error } = await supabase
        .schema('core')
        .from('gip_evaluations')
        .delete()
        .in('id', chunk)
        .select('id')
      if (error) throw new Error('Failed to delete the evaluations.')
      deletedIds.push(...(data ?? []).map((row) => row.id))
    }
    return deletedIds
  },
}
