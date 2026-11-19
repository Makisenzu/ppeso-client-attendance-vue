/** One office on the admin Accomplishment Reports list, summarising its people's reports. */
export interface OfficeReportRow {
  /** Office id, or 'none' for people without an office */
  key: string
  officeName: string
  officeCode: string | null
  /** People who have reports */
  people: number
  total: number
  toReview: number
  latestSubmittedAt: string | null
}

