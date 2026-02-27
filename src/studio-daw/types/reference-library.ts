/** A reference track stored in the library */
export interface ReferenceTrack {
  id: string
  user_id: string
  created_at: string
  name: string
  description: string
  storage_path: string
  storage_url: string
  detected_bpm: number | null
  detected_key: string | null
  spectral_centroid: number | null
  rms_level: number | null
  is_percussive: boolean
  duration_seconds: number
  user_bpm: number | null
  user_key: string | null
  genre: string | null
  tags: string[]
}

/** Data for inserting a new reference track */
export interface ReferenceTrackInsert {
  user_id: string
  name: string
  description?: string
  storage_path: string
  storage_url: string
  detected_bpm?: number | null
  detected_key?: string | null
  spectral_centroid?: number | null
  rms_level?: number | null
  is_percussive?: boolean
  duration_seconds: number
  user_bpm?: number | null
  user_key?: string | null
  genre?: string | null
  tags?: string[]
}

/** Data for updating an existing reference track */
export interface ReferenceTrackUpdate {
  name?: string
  description?: string
  user_bpm?: number | null
  user_key?: string | null
  genre?: string | null
  tags?: string[]
}

/** Filters for browsing the reference library */
export interface ReferenceLibraryFilters {
  search?: string
  genre?: string
  bpmMin?: number
  bpmMax?: number
  key?: string
  tag?: string
}

/** Get the effective BPM (user override or detected) */
export function getEffectiveBPM(track: ReferenceTrack): number | null {
  return track.user_bpm ?? track.detected_bpm
}

/** Get the effective key (user override or detected) */
export function getEffectiveKey(track: ReferenceTrack): string | null {
  return track.user_key ?? track.detected_key
}
