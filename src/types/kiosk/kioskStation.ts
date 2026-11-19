/** The signed-in office kiosk (role `kiosk`): which office's PACD computer this is. */
export interface KioskStation {
  /** The account's label, e.g. "PACD PC 1" */
  label: string
  officeName: string | null
  officeCode: string | null
}
