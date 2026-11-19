import { supabase } from '@/services/supabase'
import { userManagementService } from '@/services/peso/userManagementService'
import type { OfficeKiosk, OfficeKioskFormData } from '@/types/peso/officeKiosk'

/**
 * Office kiosk accounts (admins). A kiosk is a profile with role `kiosk` and an office: it signs in on that office's
 * PACD computer and can only record attendance for that office (core.record_punch, migration 20261119000400).
 * core.list_kiosk_accounts() adds the sign-in email (auth.users) and the latest punch; admins only.
 */
export const officeKioskService = {
  async getKiosks(): Promise<OfficeKiosk[]> {
    const { data, error } = await supabase.schema('core').rpc('list_kiosk_accounts')
    if (error) throw new Error('Failed to load the office kiosks.')
    const rows = data ?? []

    const officeIds = [...new Set(rows.map((r) => r.office_id).filter((id): id is string => !!id))]
    const offices = new Map<string, { name: string; code: string | null }>()
    if (officeIds.length > 0) {
      const { data: officeRows, error: officeError } = await supabase.from('offices').select('id, name, code').in('id', officeIds)
      if (officeError) throw new Error('Failed to load the office kiosks.')
      for (const o of officeRows ?? []) offices.set(o.id, { name: o.name, code: o.code })
    }

    return rows.map((row) => {
      const office = row.office_id ? offices.get(row.office_id) : undefined
      return {
        id: row.id,
        label: row.label,
        email: row.email ?? '—',
        officeId: row.office_id,
        officeName: office?.name ?? 'No office',
        officeCode: office?.code ?? null,
        isActive: row.status === 'active',
        createdAt: row.created_at,
      }
    })
  },

  /** A new sign-in account for the office's PACD computer (same flow as Add User, with role `kiosk`) */
  async createKiosk(form: OfficeKioskFormData): Promise<void> {
    const result = await userManagementService.createUser({
      email: form.email.trim(),
      password: form.password,
      firstname: form.label.trim(),
      middlename: '',
      lastname: 'Kiosk',
      // Kiosks are not people: "employee" keeps them off the GIP / TUPAD lists and the DTR generator
      position: 'employee',
      officeId: form.officeId,
      role: 'kiosk',
    })
    if (!result.success) throw new Error(result.error || 'The kiosk account could not be created.')
  },

  /** Disabling signs the kiosk out of recording: core.record_punch() needs an active account */
  async setActive(id: string, active: boolean): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: active ? 'active' : 'inactive' })
      .eq('id', id)
      .eq('role', 'kiosk')
      .select('id')
    if (error) throw new Error('Failed to update the kiosk.')
    if (!data || data.length === 0) throw new Error('This kiosk could not be updated. It may have been deleted.')
  },

  /** Deletes the kiosk accounts one by one; returns the IDs actually deleted */
  async deleteKiosks(ids: string[]): Promise<string[]> {
    const deleted: string[] = []
    for (const id of ids) {
      const result = await userManagementService.deleteUser(id)
      if (result.success) deleted.push(id)
    }
    return deleted
  },
}
