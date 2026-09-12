import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'

export type UserProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'firstname' | 'middlename' | 'lastname' | 'position' | 'role' | 'status'
>

export const authService = {
  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.warn('Error fetching current user:', error.message)
      return null
    }
    return data.user
  },

  /**
   * Fetch a user profile from the database
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, position, role, status')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Error fetching profile:', error.message)
      return null
    }

    return data
  },

  /**
   * Sign out the currently authenticated user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
      throw error
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
