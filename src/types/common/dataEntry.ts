import type { Database } from '@/types/database.types'

/** One ANNEX D (Profile of TUPAD Beneficiaries) row — `core.annex_d_entries`. */
export type AnnexDEntryRow = Database['core']['Tables']['annex_d_entries']['Row']
export type AnnexDEntryInsert = Database['core']['Tables']['annex_d_entries']['Insert']

/** Columns the Data Entry page and the ANNEX D export use (everything but the audit stamps). */
export type AnnexDEntry = Omit<AnnexDEntryRow, 'created_by' | 'updated_at'>

/** The values the database CHECK constraints allow (migration 20261126000000). */
export type BeneficiaryType =
  | 'underemployed_self_employed'
  | 'displaced'
  | 'pwd'
  | 'indigenous_people'
  | 'former_rebel'
  | 'former_violent_extremist'
  | 'parent_malnourished_child'
  | 'senior_citizen'

export type AnnexDSex = 'male' | 'female'
export type CivilStatus = 'single' | 'married' | 'divorced' | 'separated' | 'widowed'

/** Add / Edit form. Strings for every input; `''` means "not given". */
export interface AnnexDFormData {
  lastname: string
  firstname: string
  middlename: string
  extensionName: string
  birthdate: string
  district: string
  idType: string
  idNumber: string
  /** Digits only; the input shows them grouped 4-3-4. */
  contactNumber: string
  epaymentAccount: string
  beneficiaryType: BeneficiaryType | ''
  occupation: string
  sex: AnnexDSex | ''
  civilStatus: CivilStatus | ''
  averageMonthlyIncome: string
  dependent: string
  /** `'yes'` / `'no'` / `''` (not answered). */
  interested: 'yes' | 'no' | ''
  skillsTrainingNeeded: string
}

export type AnnexDFormErrors = Partial<Record<keyof AnnexDFormData | 'location' | 'submit', string>>

/** Filters the list and the export share. */
/** `ABOVE_60`: 61 years old and older today. */
export type AnnexDAgeFilter = 'ALL' | 'ABOVE_60'

export interface AnnexDFilters {
  search: string
  beneficiaryType: BeneficiaryType | 'ALL'
  municipality: string
  age: AnnexDAgeFilter
}

/** The location picked in the form (names as PSGC gives them). */
export interface AnnexDLocation {
  province: string
  municipality: string
  barangay: string
}

/** A selected entry: enough to name it in the delete confirmation. */
export type AnnexDSelection = Pick<AnnexDEntry, 'id' | 'lastname' | 'firstname' | 'middlename' | 'extension_name'>
