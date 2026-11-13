/** Name split into the profile's fields. */
export interface PersonNameParts {
  firstname: string
  middlename: string
  lastname: string
}

/** Titles dropped from the front of a name (directory heads are often listed with them). */
const PREFIXES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'engr', 'atty', 'hon', 'prof', 'arch', 'gov', 'vice-gov'])

/** Endings kept with the last name ("Dela Cruz Jr."). */
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

/** Particles that belong to the last name ("dela Cruz", "de los Santos", "San Juan"). */
const SURNAME_PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'de los', 'la', 'las', 'los', 'san', 'santa', 'sta', 'sto', 'van', 'von', 'da', 'di', 'du', 'mac', 'mc'])

const bare = (word: string) => word.toLowerCase().replace(/[.,]/g, '')

/** "C." / "C" — a middle initial. */
const isInitial = (word: string) => /^[A-Za-z]\.?$/.test(word)

/** Domain of staff accounts created by admins. */
export const PESO_EMAIL_DOMAIN = 'peso.ph'

/** Lowercase letters and digits only, accents removed ("Ñiño Dela Cruz" → "ninodelacruz"). */
function toEmailPart(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => !SUFFIXES.has(bare(word)))
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Staff email in the form lastname.firstname@peso.ph
 * ("Juan", "Dela Cruz Jr." → "delacruz.juan@peso.ph"). Empty until both names are given.
 */
export function buildPesoEmail(firstname: string, lastname: string): string {
  const last = toEmailPart(lastname)
  const first = toEmailPart(firstname)
  if (!last || !first) return ''
  return `${last}.${first}@${PESO_EMAIL_DOMAIN}`
}

/**
 * Best-effort split of a full name such as "Margieluna C. Juanite", "Engr. Juan Dela Cruz Jr."
 * or "Maria Clara S. de los Santos" into first / middle / last name. Professional suffixes after a
 * comma ("…, MPA") are dropped. The result is meant to pre-fill a form the admin can still edit.
 */
export function splitPersonName(fullName: string | null | undefined): PersonNameParts {
  const empty = { firstname: '', middlename: '', lastname: '' }
  if (!fullName) return empty

  // Drop credentials after a comma ("Juan Cruz, CPA, MPA") but keep "Jr." style suffixes.
  const [main, ...afterComma] = fullName.split(',')
  const keptSuffix = afterComma.map((s) => s.trim()).find((s) => SUFFIXES.has(bare(s)))
  const words = `${main} ${keptSuffix ?? ''}`.trim().split(/\s+/).filter(Boolean)

  while (words.length > 1 && PREFIXES.has(bare(words[0]))) words.shift()
  if (words.length === 0) return empty
  if (words.length === 1) return { ...empty, firstname: words[0] }

  // Last name: the final word, plus a suffix and any surname particles before it.
  const last: string[] = [words.pop()!]
  if (SUFFIXES.has(bare(last[0])) && words.length > 1) last.unshift(words.pop()!)
  while (words.length > 1) {
    const previous = words[words.length - 1]
    const twoWords = words.length > 2 ? `${bare(words[words.length - 2])} ${bare(previous)}` : ''
    if (SURNAME_PARTICLES.has(twoWords)) {
      last.unshift(words.pop()!)
      last.unshift(words.pop()!)
    } else if (SURNAME_PARTICLES.has(bare(previous))) {
      last.unshift(words.pop()!)
    } else {
      break
    }
  }

  // Middle name: a trailing initial ("C.") left before the last name.
  let middle = ''
  if (words.length > 1 && isInitial(words[words.length - 1])) {
    middle = words.pop()!
  }

  return { firstname: words.join(' '), middlename: middle, lastname: last.join(' ') }
}
