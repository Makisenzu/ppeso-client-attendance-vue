import { supabase } from '@/services/supabase'
import type { EditUserFormData, ProfileRecord, UserFormData } from '@/types/peso/userManagement'
import { getDefaultRoleForPosition } from '@/helpers/peso/userManagementHelper'
import { avatarService } from '@/services/common/avatarService'

export const userManagementService = {
  async getProfiles(): Promise<ProfileRecord[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          offices:offices (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching profiles with offices, falling back to basic query:', error.message)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (fallbackError || !fallbackData) {
          console.error('Failed to fetch profiles fallback:', fallbackError?.message)
          return []
        }

        // Fetch office details for non-empty office_ids
        const officeMap = new Map<string, { id: string; name: string; code: string | null }>()
        const officeIds = Array.from(
          new Set(
            fallbackData
              .map((p) => p.office_id)
              .filter((id): id is string => Boolean(id)),
          ),
        )

        if (officeIds.length > 0) {
          const { data: officesData } = await supabase
            .from('offices')
            .select('id, name, code')
            .in('id', officeIds)

          if (officesData) {
            officesData.forEach((o) => officeMap.set(o.id, o))
          }
        }

        return fallbackData.map((p) => {
          const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
          const office = p.office_id ? officeMap.get(p.office_id) : null

          return {
            id: p.id,
            firstname: p.firstname,
            middlename: p.middlename,
            lastname: p.lastname,
            fullName: fullName || 'Unknown',
            avatarPath: p.avatar_path ?? null,
            position: p.position,
            role: p.role ?? null,
            status: p.status,
            passcode: p.passcode,
            officeId: p.office_id || null,
            funding: (p.funding as ProfileRecord['funding']) ?? null,
            officeName: office?.name || null,
            officeCode: office?.code || null,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }
        })
      }

      if (!data || data.length === 0) {
        return []
      }

      return data.map((p: any) => {
        const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
        const office = p.offices
          ? Array.isArray(p.offices)
            ? p.offices[0]
            : p.offices
          : null

        return {
          id: p.id,
          firstname: p.firstname,
          middlename: p.middlename,
          lastname: p.lastname,
          fullName: fullName || 'Unknown',
          avatarPath: p.avatar_path ?? null,
          position: p.position,
          role: p.role ?? null,
          status: p.status,
          passcode: p.passcode,
          officeId: p.office_id || null,
          funding: p.funding ?? null,
          officeName: office?.name || null,
          officeCode: office?.code || null,
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
      const officeId = formData.officeId?.trim() || null

      // Role: an explicit one (e.g. Add Supervisor), else the position's default —
      // only the Admin position gets admin access.
      const role = formData.role !== undefined ? formData.role : getDefaultRoleForPosition(formData.position)

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
            office_id: officeId,
            role,
          },
        },
      })

      if (signUpError) {
        return { success: false, error: signUpError.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      // 3. Restore the admin session first. signUp may have switched the client
      //    to the new user, and RLS only lets an admin set role/office/status.
      if (adminSession) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })

        if (restoreError) {
          return { success: false, error: `Failed to restore admin session: ${restoreError.message}` }
        }
      }

      // 4. The on_auth_user_created trigger already inserted the profile row
      //    (with a unique passcode). Apply the admin-controlled fields as admin.
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          firstname: formData.firstname,
          middlename: formData.middlename || null,
          lastname: formData.lastname,
          position: formData.position,
          status: 'active',
          office_id: officeId,
          role,
          funding: formData.funding || null,
        })
        .eq('id', data.user.id)
        .select('id')
        .maybeSingle()

      if (profileError) {
        return { success: false, error: `Profile creation failed: ${profileError.message}` }
      }

      if (!updatedProfile) {
        return { success: false, error: 'Profile creation failed: profile row not found or not permitted.' }
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

  /**
   * Updates a profile as the signed-in admin. RLS + trg_guard_profile_update only let admins
   * change role, status, office and position. Email / password live in Supabase Auth.
   */
  async updateUser(id: string, formData: EditUserFormData): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          firstname: formData.firstname.trim(),
          middlename: formData.middlename.trim() || null,
          lastname: formData.lastname.trim(),
          position: formData.position,
          role: formData.role || null,
          status: formData.status,
          office_id: formData.officeId || null,
          funding: formData.funding || null,
        })
        .eq('id', id)
        .select('id')

      if (error) {
        return { success: false, error: error.message }
      }
      if (!data || data.length === 0) {
        return { success: false, error: 'This user could not be updated. It may have been deleted.' }
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to update user:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },

  /**
   * Deletes the whole account: the login (auth.users) via the admin-only `admin_delete_user`
   * function; the profile and the person's attendance records follow by cascade.
   */
  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id })

      if (error) {
        // Messages raised on purpose by the function are written for the admin; pass them through.
        return { success: false, error: error.message || 'Failed to delete the account.' }
      }

      // The profile picture goes with the account (storage files can't be removed from SQL)
      try {
        await avatarService.removeAllFor(id)
      } catch {
        console.error('The account was deleted, but its profile picture could not be removed.')
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to delete user:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },
}
