import { ref } from 'vue'
import { defineStore } from 'pinia'
import { avatarService } from '@/services/common/avatarService'

type CachedAvatar = { url: string; expiresAt: number; isObjectUrl: boolean }

/** Signed URLs last an hour (avatarService); reuse one for a bit less so it never expires while shown */
const SIGNED_URL_REUSE_MS = 50 * 60 * 1000

/**
 * In-memory cache of profile-picture links, keyed by storage path. Reusing the same signed URL lets the browser
 * serve the image from its HTTP cache instead of downloading it on every visit. Memory only: a signed URL is a
 * bearer link, so it never goes to localStorage (SECURITY.md / AGENTS.md §4.9) and is gone on reload or sign-out.
 */
export const useAvatarStore = defineStore('avatar', () => {
  const cache = new Map<string, CachedAvatar>()
  const pending = new Map<string, Promise<string | null>>()

  const forget = (path: string) => {
    const entry = cache.get(path)
    if (entry?.isObjectUrl) URL.revokeObjectURL(entry.url)
    cache.delete(path)
  }

  /** A link to the photo at `path`, from the cache when still valid */
  const getUrl = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null
    const cached = cache.get(path)
    if (cached && Date.now() < cached.expiresAt) return cached.url
    if (cached) forget(path)

    const inFlight = pending.get(path)
    if (inFlight) return inFlight

    const request = avatarService
      .getSignedUrl(path)
      .then((url) => {
        if (url) cache.set(path, { url, expiresAt: Date.now() + SIGNED_URL_REUSE_MS, isObjectUrl: false })
        return url
      })
      .finally(() => pending.delete(path))
    pending.set(path, request)
    return request
  }

  /** Just uploaded: show the local file right away instead of downloading what we already have */
  const prime = (path: string, file: Blob) => {
    forget(path)
    cache.set(path, { url: URL.createObjectURL(file), expiresAt: Number.POSITIVE_INFINITY, isObjectUrl: true })
  }

  /** The signed-in user's own picture (sidebar footer); My Account updates it after an upload or removal */
  const myAvatarUrl = ref<string | null>(null)
  let myAvatarPath: string | null = null

  const setMyAvatarPath = async (path: string | null | undefined) => {
    myAvatarPath = path ?? null
    const url = await getUrl(path)
    if (myAvatarPath === (path ?? null)) myAvatarUrl.value = url // ignore a slower, outdated lookup
  }

  /** Sign-out: drop every cached link (and the blob URLs behind them) */
  const clear = () => {
    for (const path of [...cache.keys()]) forget(path)
    myAvatarPath = null
    myAvatarUrl.value = null
  }

  return { getUrl, prime, forget, clear, myAvatarUrl, setMyAvatarPath }
})
