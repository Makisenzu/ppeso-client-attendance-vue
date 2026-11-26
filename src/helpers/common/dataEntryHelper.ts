import { contactDigits, isValidContactNumber } from '@/helpers/common/contactNumberHelper'
import type {
  AnnexDAgeFilter,
  AnnexDEntry,
  AnnexDEntryInsert,
  AnnexDFormData,
  AnnexDFormErrors,
  AnnexDLocation,
  AnnexDSex,
  BeneficiaryType,
  CivilStatus,
} from '@/types/common/dataEntry'

/**
 * Option lists for the Data Entry page (ANNEX D — Profile of TUPAD Beneficiaries).
 * Each list covers every value the `core.annex_d_entries` CHECK constraints allow.
 * `exportLabel` is what the ANNEX D sheet prints.
 */
export const BENEFICIARY_TYPE_OPTIONS: { value: BeneficiaryType; label: string; exportLabel: string }[] = [
  { value: 'underemployed_self_employed', label: 'Underemployed / Self-employed', exportLabel: 'SELF-EMPLOYED/UNDER EMPLOYED' },
  { value: 'displaced', label: 'Displaced worker (minimum wage or below)', exportLabel: 'DISPLACED WORKER' },
  { value: 'pwd', label: 'Person with Disability (PWD)', exportLabel: 'PWD' },
  { value: 'indigenous_people', label: 'Indigenous People', exportLabel: 'INDIGENOUS PEOPLE' },
  { value: 'former_rebel', label: 'Former rebel', exportLabel: 'FORMER REBEL' },
  { value: 'former_violent_extremist', label: 'Former violent extremist group member', exportLabel: 'FORMER VIOLENT EXTREMIST' },
  { value: 'parent_malnourished_child', label: 'Parent of a malnourished child', exportLabel: 'PARENT OF MALNOURISHED CHILD' },
  { value: 'senior_citizen', label: 'Senior citizen', exportLabel: 'SENIOR CITIZEN' },
]

export const SEX_OPTIONS: { value: AnnexDSex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

/** ANNEX D notes: "S for Single, M for Married, D for Divorced, SP for Separated, W for Widowed". */
export const CIVIL_STATUS_OPTIONS: { value: CivilStatus; label: string; code: string }[] = [
  { value: 'single', label: 'Single', code: 'S' },
  { value: 'married', label: 'Married', code: 'M' },
  { value: 'divorced', label: 'Divorced', code: 'D' },
  { value: 'separated', label: 'Separated', code: 'SP' },
  { value: 'widowed', label: 'Widowed', code: 'W' },
]

export const DISTRICT_OPTIONS = [
  { value: 'District I', label: 'District I' },
  { value: 'District II', label: 'District II' },
]

/** Legislative districts of Agusan del Sur, by city / municipality. */
const AGUSAN_DEL_SUR_DISTRICTS: Record<string, 'District I' | 'District II'> = {
  bayugan: 'District I',
  esperanza: 'District I',
  prosperidad: 'District I',
  'san luis': 'District I',
  sibagat: 'District I',
  talacogon: 'District I',
  bunawan: 'District II',
  'la paz': 'District II',
  loreto: 'District II',
  rosario: 'District II',
  'san francisco': 'District II',
  'santa josefa': 'District II',
  trento: 'District II',
  veruela: 'District II',
}

/** `City of Bayugan` / `Bayugan City` → `bayugan`; `Sta. Josefa` → `santa josefa`. */
function normalizePlaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/^city of\s+/, '')
    .replace(/\s+city$/, '')
    .replace(/^sta\.?\s+/, 'santa ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The district of an Agusan del Sur city / municipality, or null when it isn't one. */
export function districtForMunicipality(province: string | null | undefined, municipality: string | null | undefined): string | null {
  if (!province || !municipality || normalizePlaceName(province) !== 'agusan del sur') return null
  return AGUSAN_DEL_SUR_DISTRICTS[normalizePlaceName(municipality)] ?? null
}

export const INTERESTED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

/** Suggestions from the ANNEX D notes (the inputs still accept anything). */
export const OCCUPATION_SUGGESTIONS = [
  'Transport worker', 'Vendor', 'Crop grower', 'Home-based worker', 'Fisherfolk',
  'Livestock/Poultry raiser', 'Small transport driver', 'Laborer',
]
export const SKILLS_TRAINING_SUGGESTIONS = [
  'Agriculture crops production', 'Aquaculture', 'Automotive', 'Construction', 'Welding',
  'Information and Communication Technology', 'Electrical and electronics', 'Furniture making',
  'Garments and textiles', 'Food processing', 'Cooking', 'Housekeeping', 'Tourism', 'Customer services',
]
export const ID_TYPE_SUGGESTIONS = [
  'PhilSys National ID', "Voter's ID", "Driver's License", 'Postal ID', 'Senior Citizen ID', 'PWD ID',
  'Barangay ID', 'UMID', 'PhilHealth ID',
]

/** SearchSelect value of the "Others (please specify)" choice; the typed text is what gets saved. */
export const OTHER_CHOICE = '__other__'

/** SearchSelect options for a free-text field: the listed values, then "Others (please specify)". */
export function toChoiceOptions(values: string[]): { value: string; label: string }[] {
  return [...values.map((v) => ({ value: v, label: v })), { value: OTHER_CHOICE, label: 'Others (please specify)' }]
}

export const ID_TYPE_OPTIONS = toChoiceOptions(ID_TYPE_SUGGESTIONS)
export const OCCUPATION_OPTIONS = toChoiceOptions(OCCUPATION_SUGGESTIONS)
export const SKILLS_TRAINING_OPTIONS = toChoiceOptions(SKILLS_TRAINING_SUGGESTIONS)

/** Splits a saved value into the select's choice and the "Others" text. */
export function splitChoice(value: string, values: string[]): { choice: string; other: string } {
  if (!value) return { choice: '', other: '' }
  const match = values.find((v) => v.toLowerCase() === value.trim().toLowerCase())
  return match ? { choice: match, other: '' } : { choice: OTHER_CHOICE, other: value }
}

/** The value to save for a choice field. */
export function joinChoice(choice: string, other: string): string {
  return choice === OTHER_CHOICE ? other.trim() : choice
}

export function beneficiaryTypeLabel(value: string): string {
  return BENEFICIARY_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function beneficiaryTypeExportLabel(value: string): string {
  return BENEFICIARY_TYPE_OPTIONS.find((o) => o.value === value)?.exportLabel ?? value.toUpperCase()
}

export function civilStatusCode(value: string | null): string {
  if (!value) return ''
  return CIVIL_STATUS_OPTIONS.find((o) => o.value === value)?.code ?? value
}

export function sexLabel(value: string): string {
  return SEX_OPTIONS.find((o) => o.value === value)?.label ?? value
}

/** `Dela Cruz, Juan Santos Jr.` */
export function formatEntryName(entry: Pick<AnnexDEntry, 'lastname' | 'firstname' | 'middlename' | 'extension_name'>): string {
  const given = [entry.firstname, entry.middlename, entry.extension_name].filter(Boolean).join(' ')
  return `${entry.lastname}, ${given}`
}

/** Age in whole years on `today`, from a `yyyy-mm-dd` birthdate (null if it can't be read). */
export function computeAge(birthdate: string | null, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate ?? '')
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--
  return age >= 0 ? age : null
}

/** Today as `yyyy-mm-dd` in local time — the max for the birthdate picker. */
export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Age filter of the admin list: everyone, or beneficiaries above 60 (61 and older). */
export const SENIOR_MIN_AGE = 61
export const AGE_FILTER_OPTIONS: { value: AnnexDAgeFilter; label: string }[] = [
  { value: 'ALL', label: 'All ages' },
  { value: 'ABOVE_60', label: 'Above 60 (61 and older)' },
]

/**
 * Latest birthdate (`yyyy-mm-dd`) of someone at least `age` years old today — `birthdate <= cutoff` matches
 * `computeAge(birthdate) >= age`.
 */
export function birthdateCutoffForAge(age: number, today: Date = new Date()): string {
  return `${today.getFullYear() - age}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

/** `₱12,500.00` */
export function formatIncome(value: number | null): string {
  if (value === null || value === undefined) return ''
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function emptyAnnexDForm(): AnnexDFormData {
  return {
    lastname: '',
    firstname: '',
    middlename: '',
    extensionName: '',
    birthdate: '',
    district: '',
    idType: '',
    idNumber: '',
    contactNumber: '',
    epaymentAccount: '',
    beneficiaryType: '',
    occupation: '',
    sex: '',
    civilStatus: '',
    averageMonthlyIncome: '',
    dependent: '',
    interested: '',
    skillsTrainingNeeded: '',
  }
}

export function entryToForm(entry: AnnexDEntry): AnnexDFormData {
  return {
    lastname: entry.lastname,
    firstname: entry.firstname,
    middlename: entry.middlename ?? '',
    extensionName: entry.extension_name ?? '',
    birthdate: entry.birthdate,
    district: entry.district ?? '',
    idType: entry.id_type ?? '',
    idNumber: entry.id_number ?? '',
    contactNumber: entry.contact_number ?? '',
    epaymentAccount: entry.epayment_account ?? '',
    beneficiaryType: (entry.beneficiary_type as BeneficiaryType) ?? '',
    occupation: entry.occupation ?? '',
    sex: (entry.sex as AnnexDSex) ?? '',
    civilStatus: (entry.civil_status as CivilStatus | null) ?? '',
    averageMonthlyIncome: entry.average_monthly_income === null ? '' : String(entry.average_monthly_income),
    dependent: entry.dependent ?? '',
    interested: entry.interested_in_employment === null ? '' : entry.interested_in_employment ? 'yes' : 'no',
    skillsTrainingNeeded: entry.skills_training_needed ?? '',
  }
}

const INCOME_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

/** Field errors for the Add / Edit form (same limits as the table's CHECK constraints). */
export function validateAnnexDForm(form: AnnexDFormData, location: AnnexDLocation | null): AnnexDFormErrors {
  const errors: AnnexDFormErrors = {}
  const tooLong = (value: string, max: number) => value.trim().length > max

  if (!form.lastname.trim()) errors.lastname = 'Last name is required.'
  else if (tooLong(form.lastname, 100)) errors.lastname = 'Last name is too long.'
  if (!form.firstname.trim()) errors.firstname = 'First name is required.'
  else if (tooLong(form.firstname, 100)) errors.firstname = 'First name is too long.'
  if (tooLong(form.middlename, 100)) errors.middlename = 'Middle name is too long.'
  if (tooLong(form.extensionName, 10)) errors.extensionName = 'Use a short extension, like Jr. or III.'

  if (!form.birthdate) errors.birthdate = 'Birthdate is required.'
  else if (form.birthdate > todayIso()) errors.birthdate = 'Birthdate cannot be in the future.'
  else if (form.birthdate < '1900-01-01') errors.birthdate = 'Check the birth year.'

  if (!location?.province || !location.municipality || !location.barangay) {
    errors.location = 'Select the province, city/municipality and barangay.'
  }

  if (!form.sex) errors.sex = 'Select the sex.'
  if (!form.beneficiaryType) errors.beneficiaryType = 'Select the type of beneficiary.'

  if (form.contactNumber && !isValidContactNumber(form.contactNumber)) {
    errors.contactNumber = 'Contact number must be 11 digits, like 0912-345-6789.'
  }
  if (tooLong(form.idType, 100)) errors.idType = 'ID type is too long.'
  if (tooLong(form.idNumber, 50)) errors.idNumber = 'ID number is too long.'
  if (tooLong(form.epaymentAccount, 50)) errors.epaymentAccount = 'Account number is too long.'
  if (tooLong(form.occupation, 150)) errors.occupation = 'Occupation is too long.'
  if (tooLong(form.dependent, 150)) errors.dependent = 'Dependent name is too long.'
  if (tooLong(form.skillsTrainingNeeded, 200)) errors.skillsTrainingNeeded = 'Skills training is too long.'

  const income = form.averageMonthlyIncome.replace(/,/g, '').trim()
  if (income && !INCOME_PATTERN.test(income)) errors.averageMonthlyIncome = 'Enter an amount, like 5000 or 5000.50.'

  return errors
}

/**
 * Insert / update payload. Call only after `validateAnnexDForm` passed. Every typed value and the location are
 * saved in capital letters, as ANNEX D is filled. The district keeps its option value (`District I`).
 */
export function formToPayload(form: AnnexDFormData, location: AnnexDLocation): AnnexDEntryInsert {
  const upper = (value: string) => value.trim().toUpperCase()
  const text = (value: string) => upper(value) || null
  const income = form.averageMonthlyIncome.replace(/,/g, '').trim()
  return {
    lastname: upper(form.lastname),
    firstname: upper(form.firstname),
    middlename: text(form.middlename),
    extension_name: text(form.extensionName),
    birthdate: form.birthdate,
    barangay: upper(location.barangay),
    municipality: upper(location.municipality),
    province: upper(location.province),
    district: form.district.trim() || null,
    id_type: text(form.idType),
    id_number: text(form.idNumber),
    contact_number: contactDigits(form.contactNumber) || null,
    epayment_account: text(form.epaymentAccount),
    beneficiary_type: form.beneficiaryType,
    occupation: text(form.occupation),
    sex: form.sex,
    civil_status: form.civilStatus || null,
    average_monthly_income: income ? Number(income) : null,
    dependent: text(form.dependent),
    interested_in_employment: form.interested === '' ? null : form.interested === 'yes',
    skills_training_needed: text(form.skillsTrainingNeeded),
  }
}

/**
 * Search text safe to put inside a PostgREST `or=(…ilike…)` filter: drops the characters that would break the
 * filter syntax or act as wildcards.
 */
export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%*\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}
