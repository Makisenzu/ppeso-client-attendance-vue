import { supabase } from '@/services/supabase'
import type { MyAccount, MyNameFormData } from '@/types/common/account'

/** The signed-in user's own account (Account page, every role). RLS limits every query to their own row. */
export const accountService = {
  async getMyAccount(): Promise<MyAccount> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user) throw new Error('Your session has ended. Please sign in again.')

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, firstname, middlename, lastname, position, role, status, passcode, created_at, updated_at, office:offices ( name, code )',
      )
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load your account.')
    if (!data) throw new Error('Your profile could not be found. Please contact an administrator.')

    const office = Array.isArray(data.office) ? data.office[0] : data.office
    return {
      id: data.id,
      email: user.email ?? '',
      emailVerified: Boolean(user.email_confirmed_at),
      firstname: data.firstname,
      middlename: data.middlename,
      lastname: data.lastname,
      position: data.position,
      role: data.role,
      status: data.status,
      passcode: data.passcode,
      officeName: office?.name ?? null,
      officeCode: office?.code ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  /**
   * Updates the user's own name. Also copies it to the auth metadata, which fires USER_UPDATED
   * so the sidebar picks up the new name.
   */
  async updateMyName(userId: string, formData: MyNameFormData): Promise<void> {
    const names = {
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim() || null,
      lastname: formData.lastname.trim(),
    }

    const { data, error } = await supabase.from('profiles').update(names).eq('id', userId).select('id')
    if (error) throw new Error(error.message || 'Failed to save your name.')
    if (!data || data.length === 0) throw new Error('Your profile could not be updated.')

    const { error: metaError } = await supabase.auth.updateUser({ data: names })
    if (metaError) console.warn('Profile saved, but the session metadata was not updated.')
  },

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message || 'Failed to change your password.')
  },
}
