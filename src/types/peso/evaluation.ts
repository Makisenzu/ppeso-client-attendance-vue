/** One office on the admin Submitted Evaluations list, summarising its GIPs' submitted evaluations. */
export interface OfficeEvaluationRow {
  /** Office id, or 'none' for GIPs without an office */
  key: string
  officeName: string
  officeCode: string | null
  gips: number
  /** Newest evaluated month (yyyy-mm-01) and newest submission */
  latestMonth: string
  latestSubmittedAt: string | null
}
