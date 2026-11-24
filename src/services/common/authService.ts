import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'

export type UserProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'firstname' | 'middlename' | 'lastname' | 'position' | 'role' | 'status' | 'avatar_path'
>

/** Thrown by `signIn` when Supabase rejects the email / password pair. */
export class InvalidCredentialsError extends Error {}

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
      .select('firstname, middlename, lastname, position, role, status, avatar_path')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Error fetching profile:', error.message)
      return null
    }

    return data
  },

  /**
   * Sign in with email and password. Throws with the Supabase message on failure.
   */
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error?.code === 'invalid_credentials') throw new InvalidCredentialsError(error.message)
    if (error) throw new Error(error.message)
  },

  /**
   * After a failed sign-in: does an account use this email? (`login_email_exists`, boolean only.)
   * Lets the login page mark only the wrong field. `null` when the check itself fails.
   */
  async emailExists(email: string): Promise<boolean | null> {
    const { data, error } = await supabase.rpc('login_email_exists', { p_email: email.trim() })
    if (error) return null
    return data === true
  },

  /**
   * Self-registration. The profile row (with a unique passcode) is created by the
   * on_auth_user_created database trigger from this metadata; role is never taken from it.
   */
  async signUp(payload: {
    email: string
    password: string
    firstname: string
    middlename: string | null
    lastname: string
    position: Database['public']['Enums']['profile_position']
  }): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          firstname: payload.firstname,
          middlename: payload.middlename,
          lastname: payload.lastname,
          position: payload.position,
        },
      },
    })

    if (error) {
      const authError = error as typeof error & { hint?: string; details?: string }
      const errorDetails = [
        authError.message,
        authError.status ? `Status: ${authError.status}` : '',
        authError.code ? `Code: ${authError.code}` : '',
        authError.hint ? `Hint: ${authError.hint}` : '',
        authError.details ? `Details: ${authError.details}` : '',
      ]
        .filter(Boolean)
        .join(' • ')
      throw new Error(errorDetails)
    }

    if (!data.user) {
      throw new Error('Failed to create user account')
    }
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
