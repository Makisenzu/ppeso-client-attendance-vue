import { computed, ref, useTemplateRef, watch, type Ref } from 'vue'
import { idCardService, type IdCardPerson } from '@/services/common/idCardService'
import {
  buildIdCardSheetHtml,
  buildIdCardSvg,
  ID_CARD_POSITION,
  ID_CARLITO_CSS,
  ID_FONT_FAMILY,
  ID_NICKNAME_MAX,
  type IdCardData,
  type MeasureText,
} from '@/helpers/common/idCardHelper'
import { usePrintDocument } from '@/composables/common/usePrintDocument'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useAvatarStore } from '@/stores/avatarStore'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES = 10 * 1024 * 1024

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('The photo could not be read.'))
    reader.readAsDataURL(file)
  })

/** Loads Carlito (for browsers without Calibri) so text is measured and drawn with the card's metrics */
async function loadIdFont(): Promise<void> {
  if (!document.querySelector(`link[href="${ID_CARLITO_CSS}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = ID_CARLITO_CSS
    document.head.appendChild(link)
    await new Promise<void>((resolve) => {
      link.onload = () => resolve()
      link.onerror = () => resolve()
      setTimeout(resolve, 3000)
    })
  }
  try {
    await document.fonts.load(`700 34px ${ID_FONT_FAMILY}`)
  } catch {
    // The system fallback is used
  }
}

let measureContext: CanvasRenderingContext2D | null = null
const measureText: MeasureText = (text, size) => {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) return 0
  measureContext.font = `700 ${size}px ${ID_FONT_FAMILY}`
  // The template sets these lines without kerning, and so does the SVG
  if ('fontKerning' in measureContext) measureContext.fontKerning = 'none'
  return measureContext.measureText(text).width
}

/**
 * Generate ID (GIP): the nickname and a photo — the profile picture by default, or one picked just for this ID
 * (kept in this browser tab, never saved) — then a preview of the card and a print sheet with two copies.
 * `profileId` is whose ID it is; RLS lets admins read anyone and beneficiaries only themselves.
 */
export function useIdCard(profileId: Ref<string | null>) {
  const toast = useToastAlert()
  const { isPrinting, printHtml } = usePrintDocument()
  const photoInput = useTemplateRef<HTMLInputElement>('photoInput')

  const person = ref<IdCardPerson | null>(null)
  const isLoadingPerson = ref(false)
  const loadError = ref('')

  const step = ref<'form' | 'preview'>('form')
  const nickname = ref('')
  const nicknameError = ref('')
  /** Picked just for this ID (data: URL, never uploaded) */
  const uploadedPhotoUrl = ref<string | null>(null)
  const photoSource = ref<'profile' | 'upload' | 'none'>('none')
  const avatarStore = useAvatarStore()
  /** Profile picture link from the shared avatar cache (same link My Account uses → no re-download) */
  const profilePhotoUrl = ref<string | null>(null)
  const photoUrl = computed(() =>
    photoSource.value === 'profile' ? profilePhotoUrl.value : photoSource.value === 'upload' ? uploadedPhotoUrl.value : null,
  )
  const photoError = ref('')
  const photoHint = computed(() => {
    if (photoSource.value === 'profile') return 'Using the profile picture.'
    if (photoSource.value === 'upload') return 'This photo is only used for this ID and is not saved.'
    return profilePhotoUrl.value ? 'No photo on this ID.' : 'No profile picture yet. Add one on My Account, or use another photo.'
  })
  const isGenerating = ref(false)
  const cardData = ref<IdCardData | null>(null)
  const previewSvg = ref('')

  /** Only GIP beneficiaries get this ID */
  const isGip = computed(() => person.value?.position === 'gip')

  const reset = () => {
    step.value = 'form'
    nickname.value = ''
    nicknameError.value = ''
    uploadedPhotoUrl.value = null
    photoSource.value = profilePhotoUrl.value ? 'profile' : 'none'
    photoError.value = ''
    cardData.value = null
    previewSvg.value = ''
  }

  async function loadPerson(id: string | null) {
    reset()
    person.value = null
    profilePhotoUrl.value = null
    loadError.value = ''
    if (!id) return
    isLoadingPerson.value = true
    try {
      const loaded = await idCardService.getPerson(id)
      profilePhotoUrl.value = await avatarStore.getUrl(loaded.avatarPath)
      person.value = loaded
      photoSource.value = profilePhotoUrl.value ? 'profile' : 'none'
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'This account could not be loaded.'
    } finally {
      isLoadingPerson.value = false
    }
  }

  watch(profileId, (id) => void loadPerson(id), { immediate: true })

  const choosePhoto = () => photoInput.value?.click()

  async function onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    photoError.value = ''
    if (!PHOTO_TYPES.includes(file.type)) {
      photoError.value = 'Use a JPG, PNG or WebP photo.'
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      photoError.value = 'The photo is over 10MB.'
      return
    }
    try {
      uploadedPhotoUrl.value = await readAsDataUrl(file)
      photoSource.value = 'upload'
    } catch {
      photoError.value = 'The photo could not be read.'
    }
  }

  const removePhoto = () => {
    photoSource.value = 'none'
    photoError.value = ''
  }
  const useProfilePhoto = () => {
    if (profilePhotoUrl.value) photoSource.value = 'profile'
    photoError.value = ''
  }

  const onNicknameInput = () => {
    nicknameError.value = ''
  }

  async function generate() {
    if (!person.value) return
    const name = nickname.value.replace(/\s+/g, ' ').trim()
    if (!name) {
      nicknameError.value = 'Enter the nickname.'
      return
    }
    if (name.length > ID_NICKNAME_MAX) {
      nicknameError.value = `Keep the nickname to ${ID_NICKNAME_MAX} characters.`
      return
    }
    isGenerating.value = true
    try {
      await loadIdFont()
      cardData.value = {
        nickname: name,
        fullName: person.value.fullName,
        position: ID_CARD_POSITION,
        office: person.value.office,
        photoUrl: photoUrl.value,
      }
      previewSvg.value = buildIdCardSvg(cardData.value, measureText, window.location.origin, 'gip-id-preview')
      step.value = 'preview'
    } finally {
      isGenerating.value = false
    }
  }

  const backToForm = () => {
    step.value = 'form'
  }

  function print() {
    if (!cardData.value || isPrinting.value) return
    try {
      printHtml(buildIdCardSheetHtml(cardData.value, measureText, window.location.origin))
    } catch {
      toast.show('The ID could not be printed.', 'error')
    }
  }

  return {
    person,
    isLoadingPerson,
    loadError,
    isGip,
    step,
    nickname,
    nicknameMax: ID_NICKNAME_MAX,
    nicknameError,
    onNicknameInput,
    photoUrl,
    photoSource,
    profilePhotoUrl,
    useProfilePhoto,
    photoHint,
    photoError,
    choosePhoto,
    onPhotoSelected,
    removePhoto,
    isGenerating,
    generate,
    previewSvg,
    backToForm,
    isPrinting,
    print,
    reset,
  }
}
