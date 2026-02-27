import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/studio-daw/integrations/supabase/client";
import { Track, TrackType, VolumeFollowMode } from './use-audio-engine';
import { TrackEffect } from '@/studio-daw/audio/effect-chain';
import { showSuccess, showError } from '@/studio-daw/utils/toast';
import type { MidiClipData } from '@/studio-daw/audio/midi-engine';
import type { SynthClipData } from '@/studio-daw/audio/synth-engine';
import type { ContourAnalysis } from '@/studio-daw/audio/contour-analysis';
import type { VideoContourAnalysis } from '@/studio-daw/audio/video-contour-analysis';
import toWav from 'audiobuffer-to-wav';

/** Serialized reference track metadata */
interface SerializedReferenceData {
  contour: ContourAnalysis;
  volumeFollowEnabled: boolean;
  volumeFollowMode: VolumeFollowMode;
  influenceStrength: number;
  linkedTrackIds: string[];
}

/** Serialized clip (no buffer) */
interface SerializedClip {
  id: string;
  url: string;
  name: string;
  startTime: number;
  duration: number;
  offset: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  midiData?: MidiClipData;
  synthData?: SynthClipData;
  referenceData?: SerializedReferenceData;
}

/** Serialized track for storage */
interface SerializedTrack {
  id: string;
  name: string;
  type?: TrackType;
  clips: SerializedClip[];
  volume: number;
  pan: number;
  muted: boolean;
  soloed?: boolean;
  color: string;
  effects: TrackEffect[];
  // Legacy field for backward compatibility
  url?: string;
}

/** Serialized video preview data */
export interface SerializedVideoData {
  youtubeUrl?: string;
  videoContour?: VideoContourAnalysis;
}

/** Top-level project data structure (new format wraps tracks + metadata) */
interface SerializedProjectData {
  tracks: SerializedTrack[];
  videoData?: SerializedVideoData;
  bpm?: number;
  masterEffects?: TrackEffect[];
}

interface Project {
  id: string;
  name: string;
  tracks: SerializedTrack[] | SerializedProjectData;
  updatedAt: string;
}

/** Result from loading project tracks */
export interface LoadedProjectResult {
  tracks: Track[];
  videoData?: SerializedVideoData;
  bpm?: number;
  masterEffects?: TrackEffect[];
}

const MAX_CONTOUR_POINTS = 5000;

/**
 * Downsample contour points if there are too many to keep JSON payload reasonable.
 */
function downsampleContour(contour: ContourAnalysis): ContourAnalysis {
  if (contour.points.length <= MAX_CONTOUR_POINTS) return contour;
  const step = Math.ceil(contour.points.length / MAX_CONTOUR_POINTS);
  return {
    ...contour,
    points: contour.points.filter((_, i) => i % step === 0),
  };
}

/**
 * Strip large imageData from video contour keyframes for storage.
 */
function stripKeyframeImages(contour: VideoContourAnalysis): VideoContourAnalysis {
  return {
    ...contour,
    keyframes: contour.keyframes.map(kf => ({
      ...kf,
      imageData: '', // Strip base64 image data to save space
    })),
  };
}

/**
 * Upload an AudioBuffer as WAV to Supabase Storage.
 * Returns the public URL or null on failure.
 */
async function uploadReferenceAudio(
  buffer: AudioBuffer,
  userId: string,
  clipId: string,
): Promise<string | null> {
  try {
    const wavData = toWav(buffer);
    const wavBlob = new Blob([new DataView(wavData)], { type: 'audio/wav' });
    const path = `${userId}/${Date.now()}_${clipId}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('reference-audio')
      .upload(path, wavBlob, { contentType: 'audio/wav' });

    if (uploadError) {
      console.error('[Projects] Failed to upload reference audio:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('reference-audio')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('[Projects] Error uploading reference audio:', err);
    return null;
  }
}

/** Check if a clip URL is already persisted (remote URL or inlined data URL). */
function isPersistedUrl(url: string): boolean {
  return /^https?:\/\//.test(url) || url.startsWith('data:');
}

/**
 * Upload an AudioBuffer as WAV to the audio-clips bucket.
 * Returns the public URL or null on failure.
 */
async function uploadClipAudio(
  buffer: AudioBuffer,
  userId: string,
  clipId: string,
): Promise<string | null> {
  try {
    const wavData = toWav(buffer);
    const wavBlob = new Blob([new DataView(wavData)], { type: 'audio/wav' });
    const path = `${userId}/${Date.now()}_${clipId}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('audio-clips')
      .upload(path, wavBlob, { contentType: 'audio/wav' });

    if (uploadError) {
      console.error('[Projects] Failed to upload clip audio:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('audio-clips')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('[Projects] Error uploading clip audio:', err);
    return null;
  }
}

export const useProjects = () => {
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
    } else {
      setSavedProjects(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        tracks: p.tracks,
        updatedAt: p.updated_at
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const saveProject = useCallback(async (
    name: string,
    tracks: Track[],
    videoData?: { youtubeUrl?: string; videoContour?: VideoContourAnalysis },
    bpm?: number,
    masterEffects?: TrackEffect[],
    existingId?: string | null,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to save projects");
      return;
    }

    // Upload reference track audio to Supabase Storage and build serialized tracks
    const projectTracks: SerializedTrack[] = [];

    for (const track of tracks) {
      const serializedClips: SerializedClip[] = [];

      for (const clip of track.clips) {
        let clipUrl = clip.url;

        // For reference tracks with buffer but no persistent URL, upload to Storage
        if (track.type === 'reference' && clip.buffer && (!clip.url || clip.url.startsWith('blob:'))) {
          console.log(`[Projects] Uploading reference clip "${clip.name}" to reference-audio bucket...`);
          const uploadedUrl = await uploadReferenceAudio(clip.buffer, user.id, clip.id);
          if (uploadedUrl) {
            clipUrl = uploadedUrl;
            console.log(`[Projects] Reference clip uploaded: ${uploadedUrl}`);
          } else {
            console.warn(`[Projects] Reference clip upload failed for "${clip.name}"`);
          }
        }

        // For any audio clip with a buffer that isn't already on Supabase, persist to audio-clips bucket
        if (clip.buffer && !clip.midiData && !clip.synthData && !isPersistedUrl(clipUrl)) {
          console.log(`[Projects] Uploading clip "${clip.name}" to audio-clips bucket...`);
          const uploadedUrl = await uploadClipAudio(clip.buffer, user.id, clip.id);
          if (uploadedUrl) {
            clipUrl = uploadedUrl;
            console.log(`[Projects] Clip uploaded: ${uploadedUrl}`);
          } else {
            console.warn(`[Projects] Clip upload failed for "${clip.name}"`);
          }
        }

        serializedClips.push({
          id: clip.id,
          url: clipUrl,
          name: clip.name,
          startTime: clip.startTime,
          duration: clip.duration,
          offset: clip.offset,
          fadeInDuration: clip.fadeInDuration,
          fadeOutDuration: clip.fadeOutDuration,
          ...(clip.midiData ? { midiData: clip.midiData } : {}),
          ...(clip.synthData ? { synthData: clip.synthData } : {}),
          ...(clip.referenceData ? {
            referenceData: {
              contour: downsampleContour(clip.referenceData.contour),
              volumeFollowEnabled: clip.referenceData.volumeFollowEnabled,
              volumeFollowMode: clip.referenceData.volumeFollowMode,
              influenceStrength: clip.referenceData.influenceStrength,
              linkedTrackIds: clip.referenceData.linkedTrackIds,
            },
          } : {}),
        });
      }

      projectTracks.push({
        id: track.id,
        name: track.name,
        type: track.type || 'audio',
        clips: serializedClips,
        volume: track.volume,
        pan: track.pan,
        muted: track.muted,
        soloed: track.soloed,
        color: track.color,
        effects: track.effects.map(e => ({
          id: e.id,
          type: e.type,
          enabled: e.enabled,
          params: { ...e.params },
        })),
      });
    }

    // Build the project data with video and BPM metadata
    const serializedVideoData: SerializedVideoData | undefined = videoData ? {
      youtubeUrl: videoData.youtubeUrl,
      videoContour: videoData.videoContour
        ? stripKeyframeImages(videoData.videoContour)
        : undefined,
    } : undefined;

    const projectData: SerializedProjectData = {
      tracks: projectTracks,
      videoData: serializedVideoData,
      bpm,
      masterEffects: masterEffects?.length ? masterEffects.map(e => ({
        id: e.id,
        type: e.type,
        enabled: e.enabled,
        params: { ...e.params },
      })) : undefined,
    };

    let data, error;

    if (existingId) {
      // Update existing project
      const result = await supabase
        .from('projects')
        .update({
          name,
          tracks: projectData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new project
      const result = await supabase
        .from('projects')
        .insert([{
          user_id: user.id,
          name,
          tracks: projectData,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      showError("Failed to save project to cloud");
      console.error(error);
    } else {
      showSuccess(existingId ? "Project updated" : "Project saved to your account");
      fetchProjects();
      return data;
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    // Clean up reference audio files from Supabase Storage
    const project = savedProjects.find(p => p.id === id);
    if (project) {
      try {
        const tracksData = Array.isArray(project.tracks)
          ? project.tracks
          : (project.tracks as SerializedProjectData).tracks;

        const filesToDelete: string[] = [];
        for (const track of (tracksData || [])) {
          if (track.type === 'reference') {
            for (const clip of track.clips) {
              if (clip.url && clip.url.includes('reference-audio')) {
                // Extract storage path from the public URL
                const match = clip.url.match(/reference-audio\/(.+)$/);
                if (match) {
                  filesToDelete.push(match[1]);
                }
              }
            }
          }
        }

        if (filesToDelete.length > 0) {
          await supabase.storage.from('reference-audio').remove(filesToDelete);
        }
      } catch (err) {
        console.error('[Projects] Error cleaning up storage files:', err);
      }
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      showError("Failed to delete project");
    } else {
      showSuccess("Project deleted");
      fetchProjects();
    }
  }, [fetchProjects, savedProjects]);

  return { savedProjects, saveProject, deleteProject, loading };
};

/**
 * Load a saved project back into live Track objects by fetching and decoding
 * audio buffers from clip URLs. Supports both new clip-based and legacy
 * single-url-per-track formats, and the new project data wrapper format.
 */
export async function loadProjectTracks(
  project: Project,
  loadBuffer: (url: string) => Promise<AudioBuffer>,
): Promise<LoadedProjectResult> {
  // Detect format: array = legacy tracks only, object = new format with metadata
  let serializedTracks: SerializedTrack[];
  let videoData: SerializedVideoData | undefined;
  let bpm: number | undefined;
  let masterEffects: TrackEffect[] | undefined;

  if (Array.isArray(project.tracks)) {
    // Legacy format: raw array of tracks
    serializedTracks = project.tracks;
  } else {
    // New format: { tracks, videoData, bpm, masterEffects }
    const data = project.tracks as SerializedProjectData;
    serializedTracks = data.tracks;
    videoData = data.videoData;
    bpm = data.bpm;
    masterEffects = data.masterEffects;
  }

  // Cache buffers by URL so split clips sharing the same URL decode only once
  const bufferCache = new Map<string, AudioBuffer>();

  const loadCached = async (url: string): Promise<AudioBuffer> => {
    if (bufferCache.has(url)) return bufferCache.get(url)!;
    const buffer = await loadBuffer(url);
    bufferCache.set(url, buffer);
    return buffer;
  };

  const { renderMidiToAudioBuffer } = await import('@/studio-daw/audio/midi-engine');

  const loadedTracks: Track[] = [];

  for (const savedTrack of serializedTracks) {
    const track: Track = {
      id: savedTrack.id,
      name: savedTrack.name,
      type: savedTrack.type || 'audio',
      clips: [],
      volume: savedTrack.volume ?? 1.0,
      pan: savedTrack.pan ?? 0,
      muted: savedTrack.muted ?? false,
      soloed: savedTrack.soloed ?? false,
      color: savedTrack.color ?? '#5B8DEF',
      effects: savedTrack.effects ?? [],
    };

    if (savedTrack.clips && savedTrack.clips.length > 0) {
      for (const savedClip of savedTrack.clips) {
        try {
          if (savedClip.synthData) {
            // Synth clip: render from synth data
            const { renderSynthToAudioBuffer } = await import('@/studio-daw/audio/synth-engine');
            const buffer = await renderSynthToAudioBuffer(
              savedClip.synthData.preset,
              savedClip.synthData.notes,
              savedClip.synthData.totalDuration,
            );
            track.clips.push({
              id: savedClip.id,
              buffer,
              url: '',
              name: savedClip.name,
              startTime: savedClip.startTime,
              duration: savedClip.duration,
              offset: savedClip.offset,
              fadeInDuration: savedClip.fadeInDuration ?? 0,
              fadeOutDuration: savedClip.fadeOutDuration ?? 0,
              synthData: savedClip.synthData,
            });
          } else if (savedClip.midiData) {
            // MIDI clip: render from MIDI data
            const buffer = await renderMidiToAudioBuffer(savedClip.midiData);
            track.clips.push({
              id: savedClip.id,
              buffer,
              url: '',
              name: savedClip.name,
              startTime: savedClip.startTime,
              duration: savedClip.duration,
              offset: savedClip.offset,
              fadeInDuration: savedClip.fadeInDuration ?? 0,
              fadeOutDuration: savedClip.fadeOutDuration ?? 0,
              midiData: savedClip.midiData,
            });
          } else {
            // Audio or reference clip: load from URL (or create placeholder if no URL)
            let buffer: AudioBuffer | undefined;
            if (savedClip.url) {
              try {
                buffer = await loadCached(savedClip.url);
              } catch (loadErr) {
                console.warn(`[Projects] Could not load audio for clip "${savedClip.name}" (URL may have expired) — adding as placeholder`);
              }
            } else {
              console.warn(`[Projects] Clip "${savedClip.name}" has no URL — adding as placeholder`);
            }
            track.clips.push({
              id: savedClip.id,
              buffer,
              url: savedClip.url || '',
              name: savedClip.name,
              startTime: savedClip.startTime,
              duration: savedClip.duration,
              offset: savedClip.offset,
              fadeInDuration: savedClip.fadeInDuration ?? 0,
              fadeOutDuration: savedClip.fadeOutDuration ?? 0,
              // Restore reference data if present
              ...(savedClip.referenceData ? {
                referenceData: {
                  contour: savedClip.referenceData.contour,
                  volumeFollowEnabled: savedClip.referenceData.volumeFollowEnabled,
                  volumeFollowMode: savedClip.referenceData.volumeFollowMode,
                  influenceStrength: savedClip.referenceData.influenceStrength,
                  linkedTrackIds: savedClip.referenceData.linkedTrackIds,
                },
              } : {}),
            });
          }
        } catch (err) {
          console.error(`[Projects] Failed to load clip ${savedClip.name}:`, err);
        }
      }
    } else if (savedTrack.url) {
      // Legacy single-url format: create one clip at position 0
      let buffer: AudioBuffer | undefined;
      try {
        buffer = await loadCached(savedTrack.url);
      } catch (err) {
        console.warn(`[Projects] Could not load audio for legacy track "${savedTrack.name}" (URL may have expired) — adding as placeholder`);
      }
      track.clips.push({
        id: savedTrack.id + '_clip',
        buffer,
        url: savedTrack.url,
        name: savedTrack.name,
        startTime: 0,
        duration: buffer?.duration ?? 30,
        offset: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
      });
    }

    loadedTracks.push(track);
  }

  return { tracks: loadedTracks, videoData, bpm, masterEffects };
}
