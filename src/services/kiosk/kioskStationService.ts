import { supabase } from '@/services/supabase'
import type { KioskStation } from '@/types/kiosk/kioskStation'

/**
 * Office kiosk (role `kiosk`): the account's own label and office. RLS lets a kiosk read only its own profile and
 * the office list; punches go through core.record_punch() (kioskService).
 */
export const kioskStationService = {
  async getMyStation(): Promise<KioskStation> {
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) throw new Error('Not signed in.')

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('firstname, office_id')
      .eq('id', userId)
      .maybeSingle()
    if (error || !profile) throw new Error('Failed to load this kiosk.')

    if (!profile.office_id) return { label: profile.firstname, officeName: null, officeCode: null }

    const { data: office } = await supabase
      .from('offices')
      .select('name, code')
      .eq('id', profile.office_id)
      .maybeSingle()
    return { label: profile.firstname, officeName: office?.name ?? null, officeCode: office?.code ?? null }
  },
}
