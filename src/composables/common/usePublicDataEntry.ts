import { onMounted, ref } from 'vue'
import { useAnnexDForm } from '@/composables/common/useAnnexDForm'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { LOGIN_LOGOS } from '@/composables/common/useLogin'
import { publicDataEntryService } from '@/services/common/publicDataEntryService'
import { formatEntryName } from '@/helpers/common/dataEntryHelper'
import dataEntryBackground from '@/assets/bg.png'
import type { AnnexDEntryInsert } from '@/types/common/dataEntry'

/**
 * Public Data Entry form (/data-entry): PESO staff encode ANNEX D TUPAD beneficiaries without signing in, several
 * at the same time. Submit only — the page never reads entries back. After each save the form clears but keeps the
 * location and type of beneficiary, since a batch is usually one barangay.
 */
export function usePublicDataEntry() {
  const toast = useToastAlert()

  const isSubmitting = ref(false)
  const errorMessage = ref('')
  /** Names saved from this browser in this visit (newest first) — so the encoder can see their progress. */
  const savedThisSession = ref<string[]>([])

  const submit = async (payload: AnnexDEntryInsert) => {
    if (isSubmitting.value) return
    isSubmitting.value = true
    errorMessage.value = ''
    try {
      await publicDataEntryService.submit(payload)
      const name = formatEntryName({
        lastname: payload.lastname,
        firstname: payload.firstname,
        middlename: payload.middlename ?? null,
        extension_name: payload.extension_name ?? null,
      })
      savedThisSession.value = [name, ...savedThisSession.value].slice(0, 50)
      toast.success(`Saved ${name}.`)
      formState.reset(true)
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Could not save the entry. Please try again.'
    } finally {
      isSubmitting.value = false
    }
  }

  const formState = useAnnexDForm({ onSubmit: (payload) => void submit(payload) })

  /** Clears everything, including the location (a new barangay). */
  const clearAll = () => {
    errorMessage.value = ''
    formState.reset(false)
  }

  onMounted(() => formState.reset(false))

  return {
    formState,
    errors: formState.errors,
    handleSubmit: formState.handleSubmit,
    isSubmitting,
    errorMessage,
    savedThisSession,
    clearAll,
    logos: LOGIN_LOGOS,
    backgroundImage: dataEntryBackground,
  }
}
