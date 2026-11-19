import type { Database } from '@/types/database.types'

/** Files page: the PACD file container (core.pacd_files + the private `pacd-files` bucket). Admins only. */

export type PacdFileRow = Database['core']['Tables']['pacd_files']['Row']

export type PacdFileCategory = 'forms' | 'templates' | 'guidelines' | 'others'

export interface PacdFile {
  id: string
  title: string
  category: PacdFileCategory
  description: string
  filePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

/** Upload and edit dialog fields (the file itself is only picked on upload). */
export interface PacdFileFormData {
  title: string
  category: PacdFileCategory
  description: string
}

export interface PacdFileFormErrors {
  file?: string
  title?: string
  description?: string
  submit?: string
}
