import { supabase } from '@/services/supabase'
import type { SpecialDay, SpecialDayType } from '@/types/common/specialDay'

/**
 * Special days (core.special_days, migration 20261123000300). Reads follow RLS (own / own office, supervisor own
 * office, admin all); writes are admin-only RPCs that also clear the date's 'absent' statuses.
 */
export const specialDayService = {
  /** A person's special days in a range, their own first; `profileId` null = the signed-in user */
  async getForProfile(profileId: string | null, startDate: string, endDate: string): Promise<SpecialDay[]> {
    let id = profileId
    if (!id) {
      const { data } = await supabase.auth.getUser()
      id = data.user?.id ?? null
      if (!id) return []
    }
    const { data, error } = await supabase
      .schema('core')
      .rpc('get_special_days', { p_profile_id: id, p_start: startDate, p_end: endDate })
    if (error) throw new Error('Failed to load the special days.')
    return (data ?? []).map((row) => ({
      id: row.id,
      date: row.attendance_date,
      dayType: row.day_type,
      note: row.note,
      isOffice: row.is_office,
    }))
  },

  /** Sets (or replaces) a special day for one beneficiary or one office (admins only) */
  async set(params: {
    date: string
    dayType: SpecialDayType
    note: string | null
    profileId?: string | null
    officeId?: string | null
  }): Promise<void> {
    const { error } = await supabase.schema('core').rpc('admin_set_special_day', {
      p_date: params.date,
      p_day_type: params.dayType,
      p_note: params.note ?? undefined,
      p_profile_id: params.profileId ?? undefined,
      p_office_id: params.officeId ?? undefined,
    })
    if (error) throw new Error(error.message)
  },

  /** Removes a special day (admins only) */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.schema('core').rpc('admin_delete_special_day', { p_id: id })
    if (error) throw new Error(error.message)
  },
}
