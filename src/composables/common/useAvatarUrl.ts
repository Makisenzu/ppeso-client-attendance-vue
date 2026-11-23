import { ref, watch, type Ref } from 'vue'
import { useAvatarStore } from '@/stores/avatarStore'

/**
 * A signed link to a profile picture (profiles.avatar_path), or null while loading / when there is none or it
 * can't be opened (storage RLS: owner, admins, and supervisors of the owner's office). Links come from the
 * in-memory avatarStore cache, so a table of many rows signs each photo once.
 */
export function useAvatarUrl(path: Ref<string | null | undefined>) {
  const avatarStore = useAvatarStore()
  const url = ref<string | null>(null)

  watch(
    path,
    async (current) => {
      url.value = null
      if (!current) return
      const signed = await avatarStore.getUrl(current)
      if (path.value === current) url.value = signed // ignore a slower lookup for an older path
    },
    { immediate: true },
  )

  return { url }
}
