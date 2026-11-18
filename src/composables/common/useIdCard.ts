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
 * Generate ID (GIP): the nickname and an optional photo, then a preview of the card and a print sheet with two
 * copies. Nothing is saved — the photo stays in this browser tab (PRIVACY.md: no files are stored).
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
  const photoUrl = ref<string | null>(null)
  const photoError = ref('')
  const isGenerating = ref(false)
  const cardData = ref<IdCardData | null>(null)
  const previewSvg = ref('')

  /** Only GIP beneficiaries get this ID */
  const isGip = computed(() => person.value?.position === 'gip')

  const reset = () => {
    step.value = 'form'
    nickname.value = ''
    nicknameError.value = ''
    photoUrl.value = null
    photoError.value = ''
    cardData.value = null
    previewSvg.value = ''
  }

  async function loadPerson(id: string | null) {
    reset()
    person.value = null
    loadError.value = ''
    if (!id) return
    isLoadingPerson.value = true
    try {
      person.value = await idCardService.getPerson(id)
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
      photoUrl.value = await readAsDataUrl(file)
    } catch {
      photoError.value = 'The photo could not be read.'
    }
  }

  const removePhoto = () => {
    photoUrl.value = null
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
