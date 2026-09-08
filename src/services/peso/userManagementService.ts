import { supabase } from '@/services/supabase'
import type { ProfileRecord, UserFormData } from '@/types/peso/userManagement'

export const userManagementService = {
  async getProfiles(): Promise<ProfileRecord[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching profiles:', error.message)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      return data.map((p) => {
        const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()

        return {
          id: p.id,
          firstname: p.firstname,
          middlename: p.middlename,
          lastname: p.lastname,
          fullName: fullName || 'Unknown',
          position: p.position,
          status: p.status,
          passcode: p.passcode,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }
      })
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
      return []
    }
  },

  async createUser(formData: UserFormData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Save the current admin session before signUp
      const { data: sessionData } = await supabase.auth.getSession()
      const adminSession = sessionData.session

      // 2. Create auth user via supabase.auth.signUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            firstname: formData.firstname,
            middlename: formData.middlename || null,
            lastname: formData.lastname,
            position: formData.position,
          },
        },
      })

      if (signUpError) {
        return { success: false, error: signUpError.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      // 3. Generate a 6-digit passcode
      const passcode = Math.floor(100000 + Math.random() * 900000).toString()

      // 4. Upsert into public.profiles (matching Signup.vue pattern)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            firstname: formData.firstname,
            middlename: formData.middlename || null,
            lastname: formData.lastname,
            position: formData.position,
            passcode: passcode,
            status: 'active',
          },
          { onConflict: 'id' },
        )

      if (profileError) {
        return { success: false, error: `Profile creation failed: ${profileError.message}` }
      }

      // 5. Restore the admin session so the admin stays logged in
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to create user:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },
}
