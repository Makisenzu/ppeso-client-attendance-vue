import { supabase } from '@/services/supabase'

/**
 * Profile pictures in the PRIVATE `avatars` bucket (migration 20261118000200). Files live in the owner's folder
 * ("<user id>/<file>"); profiles.avatar_path stores the path, never a URL, and screens open it with a short-lived
 * signed URL. Storage RLS: owners manage their own folder; admins read and delete.
 */
const BUCKET = 'avatars'
const SIGNED_URL_SECONDS = 60 * 60

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export const avatarService = {
  /** A temporary link to the photo, or null when it can't be opened */
  async getSignedUrl(path: string | null | undefined): Promise<string | null> {
    if (!path) return null
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  },

  /** Uploads a new photo into the user's own folder; returns its path */
  async upload(userId: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}.${EXTENSIONS[file.type] ?? 'jpg'}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw new Error('Your photo could not be uploaded. Please try again.')
    return path
  },

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) throw new Error('The old photo could not be removed.')
  },

  /** Every photo in a user's folder (account deletion — admins only) */
  async removeAllFor(userId: string): Promise<void> {
    const { data, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 100 })
    if (error) throw new Error('The profile pictures could not be listed.')
    await this.remove((data ?? []).map((file) => `${userId}/${file.name}`))
  },
}
