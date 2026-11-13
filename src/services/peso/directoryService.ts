import { supabase } from '@/services/supabase'
import type {
  DirectoryFormData,
  DirectoryOption,
  DirectoryRecord,
  DirectoryStatus,
} from '@/types/peso/directory'

const DELETE_CHUNK_SIZE = 100

/** Map of directory id → the office created from it. */
async function fetchOfficeLinks(): Promise<Map<string, { id: string; name: string }>> {
  const { data, error } = await supabase
    .from('offices')
    .select('id, name, directory_id')
    .not('directory_id', 'is', null)

  if (error) throw new Error(error.message || 'Failed to load the office directory.')

  const links = new Map<string, { id: string; name: string }>()
  for (const office of data ?? []) {
    if (office.directory_id) links.set(office.directory_id, { id: office.id, name: office.name })
  }
  return links
}

function toPayload(formData: DirectoryFormData) {
  const trim = (value: string) => value.trim()
  return {
    office_name: trim(formData.officeName),
    office_code: trim(formData.officeCode).toUpperCase() || null,
    office_head: trim(formData.officeHead) || null,
    status: formData.status,
  }
}

/** Turns constraint violations into messages the admin can act on. */
function toDirectoryErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === '23505' && error.message.includes('office_code')) {
    return 'Another directory entry already uses this office code.'
  }
  return error.message
}

export const directoryService = {
  /**
   * Active directory entries for the Add / Edit Office picker, with the office
   * (if any) already created from each entry.
   */
  async getActiveDirectories(): Promise<DirectoryOption[]> {
    const [directoriesResult, links] = await Promise.all([
      supabase
        .from('directories')
        .select('id, office_name, office_code, office_head')
        .eq('status', 'active')
        .order('office_name', { ascending: true }),
      fetchOfficeLinks(),
    ])

    if (directoriesResult.error) {
      throw new Error(directoriesResult.error.message || 'Failed to load the office directory.')
    }

    return (directoriesResult.data ?? []).map((d) => ({
      id: d.id,
      officeName: d.office_name,
      officeCode: d.office_code,
      officeHead: d.office_head,
      linkedOfficeId: links.get(d.id)?.id ?? null,
    }))
  },

  /** Every directory entry for the Directory tab. */
  async getDirectories(): Promise<DirectoryRecord[]> {
    const [directoriesResult, links] = await Promise.all([
      supabase
        .from('directories')
        .select('id, office_name, office_code, office_head, status, created_at')
        .order('office_name', { ascending: true }),
      fetchOfficeLinks(),
    ])

    if (directoriesResult.error) {
      throw new Error(directoriesResult.error.message || 'Failed to load the office directory.')
    }

    return (directoriesResult.data ?? []).map((d) => ({
      id: d.id,
      officeName: d.office_name,
      officeCode: d.office_code,
      officeHead: d.office_head,
      status: (d.status === 'inactive' ? 'inactive' : 'active') as DirectoryStatus,
      createdAt: d.created_at,
      linkedOfficeName: links.get(d.id)?.name ?? null,
    }))
  },

  async createDirectory(formData: DirectoryFormData): Promise<void> {
    const { error } = await supabase.from('directories').insert(toPayload(formData)).select('id').single()
    if (error) throw new Error(toDirectoryErrorMessage(error))
  },

  async updateDirectory(id: string, formData: DirectoryFormData): Promise<void> {
    const { data, error } = await supabase
      .from('directories')
      .update(toPayload(formData))
      .eq('id', id)
      .select('id')

    if (error) throw new Error(toDirectoryErrorMessage(error))
    if (!data || data.length === 0) {
      throw new Error('This directory entry could not be updated. It may have been deleted.')
    }
  },

  /**
   * Deletes directory entries in chunks of 100 IDs. Returns the IDs actually deleted
   * (RLS skips rows silently). Offices created from them stay, unlinked.
   */
  async deleteDirectories(ids: string[]): Promise<string[]> {
    const deletedIds: string[] = []

    for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE)
      const { data, error } = await supabase.from('directories').delete().in('id', chunk).select('id')

      if (error) throw new Error(error.message || 'Failed to delete directory entries.')
      deletedIds.push(...(data ?? []).map((row) => row.id))
    }

    return deletedIds
  },
}
