import { computed, ref } from 'vue'

/** Show / hide state for PasswordInput.vue. */
export function usePasswordVisibility() {
  const isVisible = ref(false)
  const inputType = computed(() => (isVisible.value ? 'text' : 'password'))
  const toggleLabel = computed(() => (isVisible.value ? 'Hide password' : 'Show password'))

  const toggleVisibility = () => {
    isVisible.value = !isVisible.value
  }

  return { isVisible, inputType, toggleLabel, toggleVisibility }
}
