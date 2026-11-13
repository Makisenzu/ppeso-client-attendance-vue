/** One option of SearchSelect.vue. */
export interface SearchSelectOption {
  value: string
  label: string
  /** Second line under the label (e.g. an office head). */
  description?: string
  disabled?: boolean
}
