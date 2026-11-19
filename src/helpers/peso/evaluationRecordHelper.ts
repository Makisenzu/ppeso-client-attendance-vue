import type { EvaluationRecord } from '@/types/common/evaluation'
import type { OfficeEvaluationRow } from '@/types/peso/evaluation'

/** Key of the "no office" group (GIPs without an office). */
export const NO_OFFICE_KEY = 'none'

export function getOfficeKey(record: Pick<EvaluationRecord, 'officeId'>): string {
  return record.officeId ?? NO_OFFICE_KEY
}

/** Groups submitted evaluations by the GIP's office, offices A–Z ("No office" last). */
export function buildOfficeEvaluationRows(records: EvaluationRecord[]): OfficeEvaluationRow[] {
  const groups = new Map<string, EvaluationRecord[]>()
  for (const record of records) {
    const key = getOfficeKey(record)
    const list = groups.get(key) ?? []
    list.push(record)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .map(([key, list]) => {
      const scores = list.map((r) => r.scores.overall).filter((s): s is number => s !== null)
      const latestMonth = list.reduce((max, r) => (r.periodMonth > max ? r.periodMonth : max), '')
      const latestSubmittedAt = list.reduce<string | null>(
        (max, r) => (r.submittedAt && (!max || r.submittedAt > max) ? r.submittedAt : max),
        null,
      )
      return {
        key,
        officeName: key === NO_OFFICE_KEY ? 'No office' : (list[0]?.officeName ?? '—'),
        evaluations: list.length,
        gips: new Set(list.map((r) => r.profileId)).size,
        averageOverall: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null,
        latestMonth,
        latestSubmittedAt,
      }
    })
    .sort((a, b) =>
      a.key === NO_OFFICE_KEY ? 1 : b.key === NO_OFFICE_KEY ? -1 : a.officeName.localeCompare(b.officeName),
    )
}
