import { supabase } from '@/services/supabase'
import type { DirectoryOption } from '@/types/peso/directory'

export const directoryService = {
  /**
   * Active directory entries for the Add / Edit Office picker, with the office
   * (if any) already created from each entry.
   */
  async getActiveDirectories(): Promise<DirectoryOption[]> {
    const [directoriesResult, linksResult] = await Promise.all([
      supabase
        .from('directories')
        .select('id, office_name, office_code, office_head')
        .eq('status', 'active')
        .order('office_name', { ascending: true }),
      supabase
        .from('offices')
        .select('id, directory_id')
        .not('directory_id', 'is', null),
    ])

    if (directoriesResult.error) {
      throw new Error(directoriesResult.error.message || 'Failed to load the office directory.')
    }
    if (linksResult.error) {
      throw new Error(linksResult.error.message || 'Failed to load the office directory.')
    }

    const officeByDirectory = new Map<string, string>()
    for (const link of linksResult.data ?? []) {
      if (link.directory_id) officeByDirectory.set(link.directory_id, link.id)
    }

    return (directoriesResult.data ?? []).map((d) => ({
      id: d.id,
      officeName: d.office_name,
      officeCode: d.office_code,
      officeHead: d.office_head,
      linkedOfficeId: officeByDirectory.get(d.id) ?? null,
    }))
  },
}
