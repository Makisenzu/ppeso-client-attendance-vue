import { supabase } from '@/services/supabase'
import type { MyDashboardProfile } from '@/types/beneficiary/myDashboard'

export const myDashboardService = {
  /** The signed-in user's first name and office name (only what the dashboard header shows) */
  async getMyProfile(): Promise<MyDashboardProfile> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user) throw new Error('Your session has ended. Please sign in again.')

    const { data, error } = await supabase
      .from('profiles')
      .select('firstname, offices(name)')
      .eq('id', user.id)
      .single()
    if (error || !data) throw new Error('Failed to load your profile.')

    return { firstName: data.firstname?.trim() || '', officeName: data.offices?.name ?? null }
  },
}
