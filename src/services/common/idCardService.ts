import { supabase } from '@/services/supabase'
import { formatIdFullName } from '@/helpers/common/idCardHelper'

/** What the GIP ID prints about a person */
export interface IdCardPerson {
  fullName: string
  position: string
  /** Office code (offices.code, else the directory's), else its name; '' when unassigned */
  office: string
}

/**
 * The person on a GIP ID. RLS decides whose: an admin may read anyone, a beneficiary only themselves.
 * Only the columns the card prints are selected.
 */
export const idCardService = {
  async getPerson(profileId: string): Promise<IdCardPerson> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, position, office_id')
      .eq('id', profileId)
      .maybeSingle()
    if (error || !profile) throw new Error('This account could not be loaded.')

    const person: IdCardPerson = {
      fullName: formatIdFullName(profile.firstname, profile.middlename, profile.lastname),
      position: profile.position,
      office: '',
    }
    if (!profile.office_id) return person

    const { data: office } = await supabase
      .from('offices')
      .select('name, code, directory_id')
      .eq('id', profile.office_id)
      .maybeSingle()
    if (!office) return person

    let directoryCode = ''
    if (!office.code?.trim() && office.directory_id) {
      const { data: directory } = await supabase
        .from('directories')
        .select('office_code')
        .eq('id', office.directory_id)
        .maybeSingle()
      directoryCode = directory?.office_code?.trim() ?? ''
    }
    person.office = office.code?.trim() || directoryCode || office.name.trim()
    return person
  },
}
