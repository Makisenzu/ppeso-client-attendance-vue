import { supabase } from '@/services/supabase'
import type {
  ClientRecordItem,
  WalkinAttendanceInsert,
  WalkinAttendanceRow,
  WalkinAttendanceUpdate,
} from '@/types/peso/clientRecord'

function mapToClientRecordItem(row: WalkinAttendanceRow): ClientRecordItem {
  const middleInitial = row.middlename ? `${row.middlename.trim().charAt(0).toUpperCase()}.` : ''
  const fullName = [row.firstname?.trim(), middleInitial, row.lastname?.trim()]
    .filter(Boolean)
    .join(' ')

  const firstInitial = row.firstname ? row.firstname.trim().charAt(0).toUpperCase() : ''
  const lastInitial = row.lastname ? row.lastname.trim().charAt(0).toUpperCase() : ''
  const initials = `${firstInitial}${lastInitial}` || 'C'

  const addressParts = [row.purok, row.barangay, row.geographic, row.province].filter(Boolean)
  const formattedAddress = addressParts.join(', ')

  let formattedCheckIn = ''
  if (row.check_in) {
    const d = new Date(row.check_in)
    if (!isNaN(d.getTime())) {
      formattedCheckIn = d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  let formattedCheckOut: string | null = null
  if (row.check_out) {
    const d = new Date(row.check_out)
    if (!isNaN(d.getTime())) {
      formattedCheckOut = d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  return {
    ...row,
    fullName,
    initials,
    formattedAddress,
    formattedCheckIn,
    formattedCheckOut,
  }
}

export const clientRecordService = {
  async getWalkinAttendances(): Promise<ClientRecordItem[]> {
    try {
      let records: WalkinAttendanceRow[] | null = null

      const { data: coreData, error: coreError } = await supabase
        .schema('core')
        .from('walkin_attendances')
        .select('*')
        .order('check_in', { ascending: false })

      if (coreError && (coreError.message?.includes('Invalid schema') || coreError.code === 'PGRST106')) {
        const { data: pubData, error: pubError } = await (supabase as any)
          .from('walkin_attendances')
          .select('*')
          .order('check_in', { ascending: false })

        if (pubError) {
          console.warn('Notice: Failed to fetch from walkin_attendances in public schema:', pubError.message)
          return []
        }
        records = pubData
      } else if (coreError) {
        console.warn('Notice: Query to core.walkin_attendances returned:', coreError.message)
        return []
      } else {
        records = coreData
      }

      if (!records) return []

      return records.map(mapToClientRecordItem)
    } catch (err) {
      console.error('Error in getWalkinAttendances:', err)
      return []
    }
  },

  async createWalkinAttendance(payload: WalkinAttendanceInsert): Promise<ClientRecordItem | null> {
    try {
      let inserted: WalkinAttendanceRow | null = null

      const { data: coreData, error: coreError } = await supabase
        .schema('core')
        .from('walkin_attendances')
        .insert([payload as any])
        .select('*')
        .single()

      if (coreError && (coreError.message?.includes('Invalid schema') || coreError.code === 'PGRST106')) {
        const { data: pubData, error: pubError } = await (supabase as any)
          .from('walkin_attendances')
          .insert([payload])
          .select('*')
          .single()

        if (pubError) {
          console.error('Error inserting into walkin_attendances:', pubError)
          throw pubError
        }
        inserted = pubData
      } else if (coreError) {
        console.error('Error inserting into core.walkin_attendances:', coreError)
        throw coreError
      } else {
        inserted = coreData
      }

      return inserted ? mapToClientRecordItem(inserted) : null
    } catch (err) {
      console.error('Error creating walkin attendance record:', err)
      throw err
    }
  },

  async updateWalkinAttendance(id: string, updates: WalkinAttendanceUpdate): Promise<ClientRecordItem | null> {
    try {
      let updated: WalkinAttendanceRow | null = null

      const { data: coreData, error: coreError } = await supabase
        .schema('core')
        .from('walkin_attendances')
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single()

      if (coreError && (coreError.message?.includes('Invalid schema') || coreError.code === 'PGRST106')) {
        const { data: pubData, error: pubError } = await (supabase as any)
          .from('walkin_attendances')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single()

        if (pubError) throw pubError
        updated = pubData
      } else if (coreError) {
        throw coreError
      } else {
        updated = coreData
      }

      return updated ? mapToClientRecordItem(updated) : null
    } catch (err) {
      console.error('Error updating walkin attendance record:', err)
      throw err
    }
  },

  async deleteWalkinAttendance(id: string): Promise<boolean> {
    try {
      const { error: coreError } = await supabase
        .schema('core')
        .from('walkin_attendances')
        .delete()
        .eq('id', id)

      if (coreError && (coreError.message?.includes('Invalid schema') || coreError.code === 'PGRST106')) {
        const { error: pubError } = await (supabase as any)
          .from('walkin_attendances')
          .delete()
          .eq('id', id)

        if (pubError) {
          console.error('Error deleting walkin attendance in public schema:', pubError)
          throw pubError
        }
      } else if (coreError) {
        console.error('Error deleting walkin attendance in core schema:', coreError)
        throw coreError
      }

      return true
    } catch (err) {
      console.error('Error in deleteWalkinAttendance:', err)
      throw err
    }
  },
}
