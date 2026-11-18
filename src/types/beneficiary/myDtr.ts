/** What My DTR prints for the signed-in user: their name and their office head as signatory. */
export interface MyDtrProfile {
  fullName: string
  /** Office head from the directory, in capitals; '' when there is none. */
  supervisorName: string
  /** "PGDH / <office code>"; '' when there is no office head. */
  supervisorTitle: string
}
