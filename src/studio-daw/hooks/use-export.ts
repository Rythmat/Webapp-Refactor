import { useCallback } from 'react';
import JSZip from 'jszip';
import toWav from 'audiobuffer-to-wav';
import { Track } from './use-audio-engine';
import { buildEffectChain, type TrackEffect } from '@/studio-daw/audio/effect-chain';
import { midiClipToMidiFile } from '@/studio-daw/audio/midi-engine';
import { supabase } from '@/studio-daw/integrations/supabase/client';

export const useExport = () => {
  /**
   * Render a set of tracks into an OfflineAudioContext with correct clip positions,
   * effects, pan, and volume. Returns the rendered AudioBuffer.
   */
  const renderOffline = useCallback(async (
    tracks: Track[],
    options?: { soloTrackId?: string; masterEffects?: TrackEffect[] }
  ): Promise<AudioBuffer | null> => {
    const activeTracks = options?.soloTrackId
      ? tracks.filter(t => t.id === options.soloTrackId)
      : tracks;

    // Find the total duration across all clips
    const maxDuration = Math.max(
      1,
      ...activeTracks.flatMap(t => t.clips.map(c => c.startTime + c.duration))
    );

    // Determine sample rate from the first available buffer
    let sampleRate = 44100;
    for (const track of activeTracks) {
      for (const clip of track.clips) {
        if (clip.buffer) {
          sampleRate = clip.buffer.sampleRate;
          break;
        }
      }
      if (sampleRate !== 44100) break;
    }

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * maxDuration), sampleRate);

    // Build master effects chain: tracks -> masterFx -> destination
    const masterFx = options?.masterEffects?.length
      ? buildEffectChain(offlineCtx, options.masterEffects)
      : null;

    const masterTarget = masterFx ? masterFx.inputNode : offlineCtx.destination;
    if (masterFx) {
      masterFx.outputNode.connect(offlineCtx.destination);
    }

    const soloedTracks = activeTracks.filter(t => t.soloed);
    const isSoloActive = soloedTracks.length > 0;

    for (const track of activeTracks) {
      const shouldBeSilent = track.muted || (isSoloActive && !track.soloed);

      // Build per-track signal chain: clips -> effects -> trackGain -> pan -> masterTarget
      const { inputNode, outputNode } = buildEffectChain(offlineCtx, track.effects);

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = shouldBeSilent ? 0 : track.volume;

      const panNode = offlineCtx.createStereoPanner();
      panNode.pan.value = track.pan;

      outputNode.connect(trackGain);
      trackGain.connect(panNode);
      panNode.connect(masterTarget);

      // Schedule each clip at its timeline position with fade envelopes
      for (const clip of track.clips) {
        if (!clip.buffer) continue;

        const source = offlineCtx.createBufferSource();
        const clipGain = offlineCtx.createGain();
        source.buffer = clip.buffer;
        source.loop = false;
        source.connect(clipGain);
        clipGain.connect(inputNode);

        const fadeIn = clip.fadeInDuration || 0;
        const fadeOut = clip.fadeOutDuration || 0;
        const endTime = clip.startTime + clip.duration;

        if (fadeIn > 0) {
          clipGain.gain.setValueAtTime(0, clip.startTime);
          clipGain.gain.linearRampToValueAtTime(1.0, clip.startTime + fadeIn);
        } else {
          clipGain.gain.setValueAtTime(1.0, clip.startTime);
        }

        if (fadeOut > 0) {
          clipGain.gain.setValueAtTime(1.0, endTime - fadeOut);
          clipGain.gain.linearRampToValueAtTime(0, endTime);
        }

        source.start(clip.startTime, clip.offset, clip.duration);
      }
    }

    return await offlineCtx.startRendering();
  }, []);

  const exportAsWav = useCallback(async (tracks: Track[], projectName: string, masterEffects?: TrackEffect[]) => {
    if (tracks.length === 0) return;

    const hasClips = tracks.some(t => t.clips.some(c => c.buffer));
    if (!hasClips) return;

    const renderedBuffer = await renderOffline(tracks, { masterEffects });
    if (!renderedBuffer) return;

    const wav = toWav(renderedBuffer);
    const blob = new Blob([new DataView(wav)], { type: 'audio/wav' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.wav`;
    link.click();
    URL.revokeObjectURL(url);
  }, [renderOffline]);

  const exportAsZip = useCallback(async (tracks: Track[], projectName: string, bpm: number = 120, masterEffects?: TrackEffect[]) => {
    if (tracks.length === 0) return;

    const zip = new JSZip();
    const midiFolder = zip.folder('midi');

    for (const track of tracks) {
      const hasClips = track.clips.some(c => c.buffer);
      if (!hasClips) continue;

      const trackFileName = track.name.toLowerCase().replace(/\s+/g, '_');

      // Render each track individually as a stem (with its effects and pan)
      const stemBuffer = await renderOffline(tracks, { soloTrackId: track.id, masterEffects });
      if (!stemBuffer) continue;

      const wav = toWav(stemBuffer);
      const blob = new Blob([new DataView(wav)], { type: 'audio/wav' });
      zip.file(`${trackFileName}.wav`, blob);

      // For MIDI tracks, also export the MIDI file
      if (track.type === 'midi') {
        const midiClip = track.clips.find(c => c.midiData);
        if (midiClip?.midiData && midiFolder) {
          const midiFile = midiClipToMidiFile(midiClip.midiData, bpm);
          midiFolder.file(`${trackFileName}.mid`, midiFile);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_stems.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }, [renderOffline]);

  const shareMix = useCallback(async (
    tracks: Track[],
    projectName: string,
    masterEffects?: TrackEffect[],
  ): Promise<string | null> => {
    if (tracks.length === 0) return null;
    const hasClips = tracks.some(t => t.clips.some(c => c.buffer));
    if (!hasClips) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const renderedBuffer = await renderOffline(tracks, { masterEffects });
    if (!renderedBuffer) return null;

    const wav = toWav(renderedBuffer);
    const blob = new Blob([new DataView(wav)], { type: 'audio/wav' });
    const safeName = projectName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    const path = `${user.id}/${Date.now()}_${safeName}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('shared-mixes')
      .upload(path, blob, { contentType: 'audio/wav' });

    if (uploadError) {
      console.error('[Share] Upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('shared-mixes')
      .getPublicUrl(path);

    return urlData.publicUrl;
  }, [renderOffline]);

  return { exportAsWav, exportAsZip, shareMix };
};
