import type { Database } from '@/types/database.types'

export type GenderType = Database['core']['Enums']['gender_type']
export type ServiceRequired = Database['core']['Enums']['service_required']

export type WalkinAttendanceRow = Database['core']['Tables']['walkin_attendances']['Row']
export type WalkinAttendanceInsert = Database['core']['Tables']['walkin_attendances']['Insert']
export type WalkinAttendanceUpdate = Database['core']['Tables']['walkin_attendances']['Update']

export interface ClientRecordItem extends WalkinAttendanceRow {
  fullName: string
  initials: string
  formattedAddress: string
  formattedCheckIn: string
  formattedCheckOut: string | null
}

export interface ClientRecordStats {
  total: number
  today: number
  male: number
  female: number
  topPurpose: string
  purposeCounts: Record<ServiceRequired, number>
}

export type ClientRecordDateFilter = 'ALL' | 'today' | 'this_week' | 'this_month'
