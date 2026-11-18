import type { Database } from '@/types/database.types'

// Accomplishment reports (core.accomplishment_reports, migration 20261118000000): one report per date range a
// GIP / TUPAD beneficiary picks (reports don't overlap), on their funding's form:
//   DOLE — GIP Work Accomplishment Report: what was done on every weekday of the dates
//   PGAS — Accomplishment Report: Activities / Output / Remarks + Acknowledgement Receipt of Payment
// Written by the beneficiary, reviewed by admins and the supervisor of their office.

export type AccomplishmentReportRow = Database['core']['Tables']['accomplishment_reports']['Row']

export const REPORT_FUNDINGS = ['DOLE', 'PGAS'] as const
export type ReportFunding = (typeof REPORT_FUNDINGS)[number]

export const REPORT_STATUSES = ['Draft', 'Submitted', 'Reviewed', 'Returned'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_DAY_STATUSES = ['Worked', 'Holiday', 'Leave'] as const
export type ReportDayStatus = (typeof REPORT_DAY_STATUSES)[number]

/** Same limits as the database trigger */
export const REPORT_ENTRY_MAX = 1000
export const REPORT_ACTIVITY_MAX = 1000
export const REPORT_OUTPUT_MAX = 500
export const REPORT_ACTIVITY_REMARKS_MAX = 150
export const REPORT_ACTIVITIES_MAX = 50
export const REPORT_NAME_MAX = 150
export const REPORT_WORDS_MAX = 300
export const REPORT_REVIEW_REMARKS_MAX = 1000

/** What a PGAS activity row's Remarks says by default */
export const REPORT_DEFAULT_ACTIVITY_REMARKS = 'Accomplished'
/** PGAS "Designation" default */
export const REPORT_DEFAULT_DESIGNATION = 'GIP'

/** One weekday of a report (an element of `daily_entries`) */
export interface ReportDay {
  date: string // YYYY-MM-DD
  status: ReportDayStatus
  /** What was done, one accomplishment per line (printed as bullets); required when Worked */
  entry: string | null
}

/** One row of a PGAS report (an element of `activities`) */
export interface ReportActivity {
  activity: string
  output: string | null
  remarks: string | null
}

/** A report as the screens use it */
export interface AccomplishmentReport {
  id: string
  profileId: string
  funding: ReportFunding
  periodStart: string
  periodEnd: string
  dailyEntries: ReportDay[]
  activities: ReportActivity[]
  designation: string | null
  supervisorName: string | null
  approverName: string | null
  approverPosition: string | null
  amount: number | null
  amountInWords: string | null
  status: ReportStatus
  reviewRemarks: string | null
  reviewedAt: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

/** A report in the review list, with whose it is */
export interface ReviewReport extends AccomplishmentReport {
  fullName: string
  position: string | null
  officeName: string | null
  officeCode: string | null
}

/** Printed on the form; PGAS also carries the payment receipt */
export interface ReportDetails {
  designation: string
  supervisor_name: string
  approver_name: string
  approver_position: string
  /** As typed, e.g. "5300.00"; PGAS only */
  amount: string
  amount_in_words: string
}

export interface ReportSavePayload {
  /** The report being edited; null creates one */
  id: string | null
  periodStart: string
  periodEnd: string
  dailyEntries: ReportDay[]
  activities: ReportActivity[]
  details: ReportDetails
  /** Save as Draft (false) or submit for review (true) */
  submit: boolean
}

/** Who is writing: shown on the form and used to pre-fill the signatories */
export interface ReportAuthorContext {
  fullName: string
  funding: ReportFunding | null
  officeName: string
  officeHeadName: string
  officeHeadPosition: string
}

/** What the printed form shows besides the report itself */
export interface ReportPrintContext {
  name: string
  office: string
  /** The days the report covers */
  from: string
  to: string
}

/** What the form prints: a saved report or the editor's current values */
export interface ReportPrintData {
  funding: ReportFunding
  dailyEntries: ReportDay[]
  activities: ReportActivity[]
  designation: string | null
  supervisorName: string | null
  approverName: string | null
  approverPosition: string | null
  amount: number | string | null
  amountInWords: string | null
}
