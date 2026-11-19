import type { SearchSelectOption } from '@/types/common/searchSelect'
import type { EvaluationCategory, GipEvaluation } from '@/types/common/evaluation'
import type { TeamMember } from '@/types/supervisor/team'
import type {
  EvaluationCategoryProgress,
  EvaluationFormGroup,
  TeamEvaluationRow,
  TeamEvaluationStatusFilter,
} from '@/types/supervisor/teamEvaluation'
import { EVALUATION_CATEGORIES } from '@/helpers/common/evaluationHelper'

/** Supervisor Evaluation screen: active GIPs of the office and this month's evaluations. */

const STATUS_ORDER = { not_started: 0, Draft: 1, Submitted: 2 } as const

/** Active GIPs only (inactive ones can't be evaluated); not started first, then drafts, then submitted. */
export function buildEvaluationRows(members: TeamMember[], evaluations: GipEvaluation[]): TeamEvaluationRow[] {
  const byMember = new Map(evaluations.map((e) => [e.profileId, e]))
  return members
    .filter((m) => m.position === 'gip' && (m.status ?? 'active') === 'active')
    .map((member) => ({ member, evaluation: byMember.get(member.id) ?? null }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.evaluation?.status ?? 'not_started'] - STATUS_ORDER[b.evaluation?.status ?? 'not_started'] ||
        a.member.fullName.localeCompare(b.member.fullName),
    )
}

export function evaluationRowMatches(row: TeamEvaluationRow, query: string, status: TeamEvaluationStatusFilter): boolean {
  if (status !== 'ALL' && (row.evaluation?.status ?? 'not_started') !== status) return false
  const q = query.trim().toLowerCase()
  return !q || row.member.fullName.toLowerCase().includes(q)
}

export const EVALUATION_STATUS_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
]

export function summarizeEvaluationRows(rows: TeamEvaluationRow[]) {
  return {
    gips: rows.length,
    submitted: rows.filter((r) => r.evaluation?.status === 'Submitted').length,
    drafts: rows.filter((r) => r.evaluation?.status === 'Draft').length,
    notStarted: rows.filter((r) => !r.evaluation).length,
  }
}

/** Groups items into Performance / Attitude, keeping their order and numbering them across the form. */
export function buildFormGroups(
  items: { id: string; question: string; category: EvaluationCategory }[],
): EvaluationFormGroup[] {
  let number = 0
  return EVALUATION_CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    hint: c.hint,
    items: items
      .filter((i) => i.category === c.value)
      .map((i) => ({ id: i.id, question: i.question, number: ++number })),
  })).filter((g) => g.items.length > 0)
}

/** Average of 1–5 ratings to two decimals, or null when nothing is rated. */
export function averageRatings(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
}

/** Rated count and running average of each category on the form. */
export function buildCategoryProgress(
  groups: EvaluationFormGroup[],
  ratings: Record<string, number>,
): EvaluationCategoryProgress[] {
  return groups.map((group) => {
    const values = group.items.map((item) => ratings[item.id]).filter((v): v is number => !!v)
    return {
      category: group.category,
      label: group.label,
      rated: values.length,
      total: group.items.length,
      average: averageRatings(values),
    }
  })
}

/** Anchor id of a category section (summary links jump to it). */
export function getSectionId(category: EvaluationCategory): string {
  return `evaluation-section-${category}`
}

export function getEvaluateActionLabel(row: TeamEvaluationRow): string {
  if (row.evaluation?.status === 'Submitted') return 'View'
  if (row.evaluation?.status === 'Draft') return 'Continue'
  return 'Evaluate'
}
