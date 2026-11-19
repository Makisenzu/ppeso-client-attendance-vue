import type { ReviewReport } from '@/types/common/accomplishment'
import type { OfficeReportRow } from '@/types/peso/accomplishment'

/** Key of the "no office" group (people without an office). */
export const NO_OFFICE_KEY = 'none'

export function getReportOfficeKey(report: Pick<ReviewReport, 'officeId'>): string {
  return report.officeId ?? NO_OFFICE_KEY
}

type CountedReport = Pick<ReviewReport, 'profileId' | 'status' | 'submittedAt'>

function newestSubmission(reports: CountedReport[]): string | null {
  return reports.reduce<string | null>(
    (max, r) => (r.submittedAt && (!max || r.submittedAt > max) ? r.submittedAt : max),
    null,
  )
}

/** Groups reports by the writer's office: offices with reports to review first, then A–Z ("No office" last). */
export function buildOfficeReportRows(reports: ReviewReport[]): OfficeReportRow[] {
  const groups = new Map<string, ReviewReport[]>()
  for (const report of reports) {
    const key = getReportOfficeKey(report)
    const list = groups.get(key) ?? []
    list.push(report)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      officeName: key === NO_OFFICE_KEY ? 'No office' : (list[0]?.officeName ?? '—'),
      officeCode: list[0]?.officeCode ?? null,
      people: new Set(list.map((r) => r.profileId)).size,
      total: list.length,
      toReview: list.filter((r) => r.status === 'Submitted').length,
      latestSubmittedAt: newestSubmission(list),
    }))
    .sort((a, b) => {
      if (a.key === NO_OFFICE_KEY) return 1
      if (b.key === NO_OFFICE_KEY) return -1
      return b.toReview - a.toReview || a.officeName.localeCompare(b.officeName)
    })
}

