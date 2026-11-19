import type { SearchSelectOption } from '@/types/common/searchSelect'
import type {
  EvaluationAnswer,
  EvaluationCategory,
  EvaluationQuestion,
  EvaluationStatus,
  GipEvaluation,
} from '@/types/common/evaluation'
import type { Json } from '@/types/database.types'

/** GIP evaluations: ratings, categories, months and scores (shared by the admin and supervisor screens). */

export const EVALUATION_CATEGORIES: { value: EvaluationCategory; label: string; hint: string }[] = [
  { value: 'performance', label: 'Performance', hint: 'Quality and output of work' },
  { value: 'attitude', label: 'Attitude', hint: 'Conduct and work habits' },
]

export const EVALUATION_CATEGORY_OPTIONS: SearchSelectOption[] = EVALUATION_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}))

/** 1–5 rating scale, worded like Civil Service performance ratings. */
export const RATING_SCALE: { value: number; label: string }[] = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Unsatisfactory' },
  { value: 3, label: 'Satisfactory' },
  { value: 4, label: 'Very Satisfactory' },
  { value: 5, label: 'Outstanding' },
]

export const REMARKS_MAX_LENGTH = 1000
export const QUESTION_MAX_LENGTH = 500

export function formatCategoryLabel(category: EvaluationCategory): string {
  return category === 'performance' ? 'Performance' : 'Attitude'
}

export function formatRatingLabel(rating: number | null | undefined): string {
  return RATING_SCALE.find((r) => r.value === rating)?.label ?? '—'
}

/** "4.25" — or "—" when there's no score. */
export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? '—' : score.toFixed(2)
}

/** Adjectival rating of an average score (4.50 → Outstanding), rounding to the nearest scale step. */
export function formatScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—'
  return formatRatingLabel(Math.min(5, Math.max(1, Math.round(score))))
}

/** First day of the current month in Philippine time, yyyy-mm-01 (matches the database). */
export function getCurrentPeriodMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
    .formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value ?? String(now.getFullYear())
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}-01`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-11-01" → "November 2026" */
export function formatPeriodMonth(periodMonth: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(periodMonth)
  if (!match) return '—'
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`
}

/** Month filter for the admin list: "All months" + every month that has an evaluation, newest first. */
export function buildMonthOptions(periodMonths: string[]): SearchSelectOption[] {
  const unique = [...new Set(periodMonths)].sort((a, b) => b.localeCompare(a))
  return [{ value: 'ALL', label: 'All Months' }, ...unique.map((m) => ({ value: m, label: formatPeriodMonth(m) }))]
}

export function groupQuestionsByCategory<T extends { category: EvaluationCategory }>(
  items: T[],
): { category: EvaluationCategory; label: string; items: T[] }[] {
  return EVALUATION_CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    items: items.filter((item) => item.category === c.value),
  })).filter((group) => group.items.length > 0)
}

export function sortQuestions(questions: EvaluationQuestion[]): EvaluationQuestion[] {
  const order: Record<EvaluationCategory, number> = { performance: 0, attitude: 1 }
  return [...questions].sort(
    (a, b) => order[a.category] - order[b.category] || a.sortOrder - b.sortOrder || a.question.localeCompare(b.question),
  )
}

/** Reads the stored answers JSON (anything malformed is skipped). */
export function parseAnswers(value: Json): EvaluationAnswer[] {
  if (!Array.isArray(value)) return []
  const answers: EvaluationAnswer[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const { question_id, category, question, rating } = item as Record<string, Json | undefined>
    if (typeof question_id !== 'string' || typeof question !== 'string' || typeof rating !== 'number') continue
    if (category !== 'performance' && category !== 'attitude') continue
    answers.push({ questionId: question_id, category, question, rating })
  }
  return answers
}

/** Payload of ratings sent to the database; the trigger fills in the question text and category. */
export function buildAnswersPayload(ratings: Record<string, number>): Json {
  return Object.entries(ratings).map(([question_id, rating]) => ({ question_id, rating }))
}

export function countUnanswered(questions: EvaluationQuestion[], ratings: Record<string, number>): number {
  return questions.filter((q) => !ratings[q.id]).length
}

export function formatEvaluationStatusLabel(status: EvaluationStatus | null): string {
  if (status === 'Submitted') return 'Submitted'
  if (status === 'Draft') return 'Draft'
  return 'Not Started'
}

/** Status badge classes (status colors live in helpers — DESIGN.md §2 rule 5). */
export function getEvaluationStatusBadgeClass(status: EvaluationStatus | null): string {
  if (status === 'Submitted') return 'bg-success/10 text-success border-success/30'
  if (status === 'Draft') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
  return 'bg-muted text-muted-foreground border-border'
}

/** Ratings by question id, from a saved evaluation (to continue a draft). */
export function ratingsFromEvaluation(evaluation: GipEvaluation | null): Record<string, number> {
  const ratings: Record<string, number> = {}
  for (const answer of evaluation?.answers ?? []) ratings[answer.questionId] = answer.rating
  return ratings
}

/** Turns messages raised on purpose in SQL into short ones; anything else gets the fallback. */
export function toEvaluationErrorMessage(error: { code?: string; message?: string }, fallback: string): string {
  if (error.code === '23505') return 'This GIP already has an evaluation for this month.'
  // Messages raised on purpose by core.check_gip_evaluation; RLS errors (also 42501) name the table — hide them
  const raisedOnPurpose = error.message && !/row-level security|relation|policy/i.test(error.message)
  if ((error.code === '42501' || error.code === '22023') && raisedOnPurpose) return error.message as string
  return fallback
}
