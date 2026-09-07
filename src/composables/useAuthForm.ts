import { ref } from 'vue'

export function useAuthForm() {
  const loading = ref(false)
  const error = ref('')

  const setError = (message: string) => {
    error.value = message
  }

  const validateRequiredFields = (values: Array<string | undefined>, message = 'Please fill in all fields') => {
    const hasMissingValue = values.some((value) => !value?.trim())

    if (hasMissingValue) {
      setError(message)
      return false
    }

    return true
  }

  const runAuthAction = async (action: () => Promise<void>) => {
    error.value = ''
    loading.value = true

    try {
      await action()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    error,
    loading,
    runAuthAction,
    setError,
    validateRequiredFields,
  }
}