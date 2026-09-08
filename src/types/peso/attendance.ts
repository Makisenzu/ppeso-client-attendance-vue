import type { Database } from '../database.types'

export type AttendanceType = 'registered' | 'walkin'

export type AttendanceStatus = 'active' | 'completed'

export type ProfilePosition = Database['public']['Enums']['profile_position']
export type WalkinPurpose = Database['core']['Enums']['service_required']

export interface AttendanceRecord {
  id: string
  attendanceType: AttendanceType
  profileId?: string | null
  
  // Personal Info
  fullName: string
  firstName: string
  lastName: string
  middleName?: string | null
  gender?: string | null
  contactNumber?: string | null
  email?: string | null
  
  // Classification
  position?: ProfilePosition | string | null
  purpose?: WalkinPurpose | string | null
  
  // Address info (especially for walk-in clients)
  address?: {
    province?: string
    geographic?: string
    barangay?: string
    purok?: string
    fullAddress?: string
  }

  // Attendance timestamps
  checkIn: string
  checkOut?: string | null
  status: AttendanceStatus
  durationMinutes?: number | null
  createdAt: string
}

export interface AttendanceStatsSummary {
  total: number
  active: number
  completed: number
  walkinCount: number
  registeredCount: number
  todayCount: number
}

export interface AttendanceFilterState {
  searchQuery: string
  typeFilter: 'ALL' | 'registered' | 'walkin'
  statusFilter: 'ALL' | 'active' | 'completed'
  dateFilter: 'ALL' | 'today' | 'this_week' | 'this_month'
  categoryFilter: string
}
