import { supabase } from '@/services/supabase'
import type {
  OfficeRecord,
  OfficeFormData,
  OfficeBeneficiary,
} from '@/types/peso/office'

/** Turns unique-constraint violations into a message the admin can act on. */
function toOfficeErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    if (error.message.includes('directory_id')) {
      return 'An office has already been added for this directory entry.'
    }
    if (error.message.includes('code')) {
      return 'Another office already uses this office code.'
    }
  }
  return error.message
}

export const officeService = {
  async getOffices(): Promise<OfficeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select(`
          id,
          name,
          code,
          directory_id,
          is_active,
          created_at,
          updated_at,
          directory:directories (
            office_head
          ),
          profiles:profiles (
            id,
            firstname,
            middlename,
            lastname,
            position,
            role,
            status
          )
        `)
        .order('name', { ascending: true })

      if (error) {
        console.warn('Error fetching offices with profiles, falling back to basic query:', error.message)
        // Fallback to basic office select if joined select has permission or relation issues
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('offices')
          .select('*')
          .order('name', { ascending: true })

        if (fallbackError) {
          console.error('Failed to fetch offices fallback:', fallbackError.message)
          return []
        }

        return (fallbackData || []).map((o) => ({
          id: o.id,
          name: o.name,
          code: o.code,
          directoryId: o.directory_id,
          officeHead: null,
          isActive: o.is_active !== false,
          totalBeneficiaries: 0,
          beneficiaries: [],
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }))
      }

      if (!data) return []

      return data.map((o: any) => {
        const rawProfiles = Array.isArray(o.profiles) ? o.profiles : []
        const beneficiaryProfiles = rawProfiles.filter(
          (p: any) => p.role?.toLowerCase() === 'beneficiary',
        )
        const beneficiaries: OfficeBeneficiary[] = beneficiaryProfiles.map((p: any) => {
          const fullName = `${p.firstname || ''} ${p.middlename ? p.middlename + ' ' : ''}${p.lastname || ''}`.trim()
          return {
            id: p.id,
            fullName: fullName || 'Unknown',
            position: p.position,
            role: p.role,
            status: p.status,
          }
        })

        const directory = Array.isArray(o.directory) ? o.directory[0] : o.directory

        return {
          id: o.id,
          name: o.name,
          code: o.code,
          directoryId: o.directory_id ?? null,
          officeHead: directory?.office_head ?? null,
          isActive: o.is_active !== false,
          totalBeneficiaries: beneficiaries.length,
          beneficiaries,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }
      })
    } catch (err) {
      console.error('Failed to fetch offices:', err)
      return []
    }
  },

  async createOffice(formData: OfficeFormData): Promise<{ success: boolean; data?: OfficeRecord; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('offices')
        .insert({
          directory_id: formData.directoryId,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase() || null,
          is_active: formData.isActive,
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: toOfficeErrorMessage(error) }
      }

      const newRecord: OfficeRecord = {
        id: data.id,
        name: data.name,
        code: data.code,
        directoryId: data.directory_id,
        officeHead: null,
        isActive: data.is_active !== false,
        totalBeneficiaries: 0,
        beneficiaries: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      return { success: true, data: newRecord }
    } catch (err) {
      console.error('Failed to create office:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },

  async updateOffice(id: string, formData: OfficeFormData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('offices')
        .update({
          directory_id: formData.directoryId,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase() || null,
          is_active: formData.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        return { success: false, error: toOfficeErrorMessage(error) }
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to update office:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },

  async deleteOffice(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify whether any profiles are assigned to this office
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('office_id', id)

      if (countError) {
        console.warn('Could not check profiles count prior to deletion:', countError.message)
      }

      if (count && count > 0) {
        return {
          success: false,
          error: `Cannot delete this office because ${count} user(s)/beneficiary(ies) are currently assigned to it. Please reassign them first.`,
        }
      }

      const { error } = await supabase
        .from('offices')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to delete office:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },

  async toggleOfficeStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('offices')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      console.error('Failed to toggle office status:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }
    }
  },

  async getActiveOffices(): Promise<OfficeRecord[]> {
    try {
      const allOffices = await this.getOffices()
      return allOffices.filter((o) => o.isActive)
    } catch (err) {
      console.error('Failed to fetch active offices:', err)
      return []
    }
  },
}

