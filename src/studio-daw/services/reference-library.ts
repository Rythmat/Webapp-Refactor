import { supabase } from '@/studio-daw/integrations/supabase/client'
import type {
  ReferenceTrack,
  ReferenceTrackInsert,
  ReferenceTrackUpdate,
  ReferenceLibraryFilters,
} from '@/studio-daw/types/reference-library'

/**
 * Upload a reference audio file to Supabase Storage.
 * Files are stored under the user's folder in the reference-audio bucket.
 */
export async function uploadReferenceFile(
  file: Blob,
  userId: string,
  filename: string
): Promise<{ path: string; url: string } | null> {
  const ext = filename.split('.').pop() || 'wav'
  const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`

  const { error } = await supabase.storage
    .from('reference-audio')
    .upload(storagePath, file, { contentType: file.type || 'audio/wav' })

  if (error) {
    console.error('[reference-library] Upload failed:', error.message)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('reference-audio')
    .getPublicUrl(storagePath)

  return { path: storagePath, url: urlData.publicUrl }
}

/**
 * Save a reference track record to the database.
 */
export async function saveReferenceTrack(
  data: ReferenceTrackInsert
): Promise<ReferenceTrack | null> {
  const { data: row, error } = await supabase
    .from('reference_tracks' as any)
    .insert(data as any)
    .select()
    .single()

  if (error) {
    console.error('[reference-library] Save failed:', error.message)
    return null
  }

  return row as unknown as ReferenceTrack
}

/**
 * Fetch the user's reference library with optional filters.
 */
export async function fetchReferenceLibrary(
  filters?: ReferenceLibraryFilters
): Promise<ReferenceTrack[]> {
  let query = supabase
    .from('reference_tracks' as any)
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.genre) {
    query = query.eq('genre', filters.genre)
  }
  if (filters?.key) {
    query = query.or(`detected_key.eq.${filters.key},user_key.eq.${filters.key}`)
  }
  if (filters?.bpmMin != null) {
    query = query.or(
      `detected_bpm.gte.${filters.bpmMin},user_bpm.gte.${filters.bpmMin}`
    )
  }
  if (filters?.bpmMax != null) {
    query = query.or(
      `detected_bpm.lte.${filters.bpmMax},user_bpm.lte.${filters.bpmMax}`
    )
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag])
  }

  const { data, error } = await query

  if (error) {
    console.error('[reference-library] Fetch failed:', error.message)
    return []
  }

  let results = (data || []) as unknown as ReferenceTrack[]

  // Client-side text search (name, description, genre, tags)
  if (filters?.search) {
    const term = filters.search.toLowerCase()
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        (t.genre && t.genre.toLowerCase().includes(term)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(term))
    )
  }

  return results
}

/**
 * Update a reference track's metadata.
 */
export async function updateReferenceTrack(
  id: string,
  updates: ReferenceTrackUpdate
): Promise<ReferenceTrack | null> {
  const { data, error } = await supabase
    .from('reference_tracks' as any)
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[reference-library] Update failed:', error.message)
    return null
  }

  return data as unknown as ReferenceTrack
}

/**
 * Delete a reference track from both database and storage.
 */
export async function deleteReferenceTrack(
  id: string,
  storagePath: string
): Promise<boolean> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('reference-audio')
    .remove([storagePath])

  if (storageError) {
    console.warn('[reference-library] Storage delete failed:', storageError.message)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('reference_tracks' as any)
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('[reference-library] DB delete failed:', dbError.message)
    return false
  }

  return true
}
