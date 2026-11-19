import { supabase } from '@/services/supabase'
import type { PacdFile, PacdFileCategory, PacdFileFormData, PacdFileRow } from '@/types/peso/pacdFile'
import { buildPacdFilePath } from '@/helpers/peso/pacdFileHelper'

/**
 * Files page (admins): the PACD file container. Rows in core.pacd_files, files in the PRIVATE `pacd-files`
 * bucket (migration 20261119000100). RLS and storage policies allow admins only. Files open with short-lived
 * signed URLs; the database stores paths, never URLs.
 */
const BUCKET = 'pacd-files'
const SIGNED_URL_SECONDS = 60 * 10
const CHUNK_SIZE = 100

const COLUMNS =
  'id, title, category, description, file_path, file_name, mime_type, size_bytes, created_at, updated_at'

type ListRow = Pick<
  PacdFileRow,
  | 'id'
  | 'title'
  | 'category'
  | 'description'
  | 'file_path'
  | 'file_name'
  | 'mime_type'
  | 'size_bytes'
  | 'created_at'
  | 'updated_at'
>

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) out.push(items.slice(i, i + CHUNK_SIZE))
  return out
}

const toPacdFile = (row: ListRow): PacdFile => ({
  id: row.id,
  title: row.title,
  category: row.category as PacdFileCategory,
  description: row.description ?? '',
  filePath: row.file_path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const pacdFileService = {
  /** Every file, newest first */
  async getFiles(): Promise<PacdFile[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('pacd_files')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw new Error('Failed to load the files.')
    return (data ?? []).map(toPacdFile)
  },

  /** Stores the file, then its row; removes the stored file again if the row can't be saved */
  async uploadFile(file: File, mimeType: string, form: PacdFileFormData): Promise<void> {
    const path = buildPacdFilePath(form.category, mimeType)
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw new Error('The file could not be uploaded. Please try again.')

    const { error } = await supabase
      .schema('core')
      .from('pacd_files')
      .insert({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        file_path: path,
        file_name: file.name.slice(0, 255),
        mime_type: mimeType,
        size_bytes: file.size,
      })
      .select('id')
      .single()
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      throw new Error('The file could not be saved. Please try again.')
    }
  },

  /** Title, category and description only (the stored file never changes) */
  async updateFile(id: string, form: PacdFileFormData): Promise<void> {
    const { data, error } = await supabase
      .schema('core')
      .from('pacd_files')
      .update({ title: form.title.trim(), category: form.category, description: form.description.trim() || null })
      .eq('id', id)
      .select('id')
    if (error) throw new Error('Failed to save the file details.')
    if (!data || data.length === 0) throw new Error('This file could not be updated. It may have been deleted.')
  },

  /** Deletes the rows (in chunks of 100), then their stored files. Returns the IDs actually deleted. */
  async deleteFiles(files: Pick<PacdFile, 'id' | 'filePath'>[]): Promise<string[]> {
    const pathById = new Map(files.map((f) => [f.id, f.filePath]))
    const deletedIds: string[] = []
    for (const chunk of chunks(files.map((f) => f.id))) {
      const { data, error } = await supabase
        .schema('core')
        .from('pacd_files')
        .delete()
        .in('id', chunk)
        .select('id')
      if (error) throw new Error('Failed to delete the files.')
      deletedIds.push(...(data ?? []).map((row) => row.id))
    }
    const paths = deletedIds.map((id) => pathById.get(id)).filter((p): p is string => !!p)
    for (const batch of chunks(paths)) {
      // A leftover object is harmless (private, unlisted); the rows are already gone
      await supabase.storage.from(BUCKET).remove(batch)
    }
    return deletedIds
  },

  /** The file's contents (printing loads it into the page, which a storage link can't be) */
  async getFileBlob(file: Pick<PacdFile, 'filePath'>): Promise<Blob> {
    const { data, error } = await supabase.storage.from(BUCKET).download(file.filePath)
    if (error || !data) throw new Error('This file could not be loaded for printing.')
    return data
  },

  /** A temporary link: opens in the browser, or downloads under the original name */
  async getFileUrl(file: Pick<PacdFile, 'filePath' | 'fileName'>, download: boolean): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.filePath, SIGNED_URL_SECONDS, download ? { download: file.fileName } : undefined)
    if (error || !data?.signedUrl) throw new Error('This file could not be opened.')
    return data.signedUrl
  },
}
