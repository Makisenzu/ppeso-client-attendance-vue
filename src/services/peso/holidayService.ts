import { supabase } from '@/services/supabase'
import type { HolidayFormData, HolidayRecord } from '@/types/peso/holiday'

const DELETE_CHUNK_SIZE = 100

type HolidayRow = { id: string; holiday_date: string; name: string }

const toRecord = (row: HolidayRow): HolidayRecord => ({
  id: row.id,
  date: row.holiday_date,
  name: row.name,
})

/** Turns constraint violations into messages the admin can act on. */
function toHolidayErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'A holiday is already set on this date.'
  return error.message
}

export const holidayService = {
  /** Every holiday, oldest first (a few dozen rows per year). */
  async getHolidays(): Promise<HolidayRecord[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('id, holiday_date, name')
      .order('holiday_date', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load holidays.')
    return (data ?? []).map(toRecord)
  },

  /** Holidays between two ISO dates (inclusive), e.g. for one DTR period. */
  async getHolidaysInRange(startDate: string, endDate: string): Promise<HolidayRecord[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('id, holiday_date, name')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load holidays.')
    return (data ?? []).map(toRecord)
  },

  async createHoliday(formData: HolidayFormData): Promise<void> {
    const { error } = await supabase
      .from('holidays')
      .insert({ holiday_date: formData.date, name: formData.name.trim() })
      .select('id')
      .single()

    if (error) throw new Error(toHolidayErrorMessage(error))
  },

  async updateHoliday(id: string, formData: HolidayFormData): Promise<void> {
    const { data, error } = await supabase
      .from('holidays')
      .update({ holiday_date: formData.date, name: formData.name.trim() })
      .eq('id', id)
      .select('id')

    if (error) throw new Error(toHolidayErrorMessage(error))
    if (!data || data.length === 0) {
      throw new Error('This holiday could not be updated. It may have been deleted.')
    }
  },

  /** Deletes holidays in chunks of 100 IDs. Returns the IDs actually deleted. */
  async deleteHolidays(ids: string[]): Promise<string[]> {
    const deletedIds: string[] = []
    for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE)
      const { data, error } = await supabase.from('holidays').delete().in('id', chunk).select('id')
      if (error) throw new Error(error.message || 'Failed to delete holidays.')
      deletedIds.push(...(data ?? []).map((row) => row.id))
    }
    return deletedIds
  },
}
