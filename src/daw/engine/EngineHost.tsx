import { memo, useEffect } from 'react';
import { startAudioGarbageCollection } from '@/daw/audio/assets/assetGc';
import { useTransport } from '@/daw/hooks/useTransport';
import { usePlaybackEngine } from '@/daw/hooks/usePlaybackEngine';
import { useMidiInputRouting } from '@/daw/hooks/useMidiInputRouting';
import { useStudioMonitor } from '@/daw/hooks/useStudioMonitor';
import { useCollabAudioLoader } from '@/daw/hooks/useCollabAudioLoader';
import { useAudioChordDetection } from '@/daw/hooks/useAudioChordDetection';
import { useGuitarMidiDetection } from '@/daw/hooks/useGuitarMidiDetection';
import { useDraftAutosave } from '@/daw/persistence/drafts/autosave';

// ── EngineHost ──────────────────────────────────────────────────────────
// The editor's audio side, as a component that renders nothing (milestone
// 1.7). These hooks follow the transport, the tracks, MIDI input and
// collab, and used to live in DawAppInner, so every play, record and track
// change re-rendered the whole editor shell. Here they re-render only this
// empty component, and DawAppInner follows the layout alone.

export const EngineHost = memo(function EngineHost({
  isReady,
  authToken,
}: {
  isReady: boolean;
  authToken: string | null;
}) {
  useTransport();
  usePlaybackEngine(isReady, authToken);
  // MIDI input before the draft autosave: React cleans up effects in the
  // order they are declared, so a take kept as the editor closes
  // (useMidiRecording) lands while the autosave still listens, and its
  // unmount flush writes it.
  useMidiInputRouting();
  useDraftAutosave();
  useStudioMonitor(isReady, authToken);
  useCollabAudioLoader(authToken);
  // Frees the audio no clip plays any more, after a project switch or once
  // undo can't bring it back (assetGc.ts).
  useEffect(() => startAudioGarbageCollection(), []);
  useAudioChordDetection();
  useGuitarMidiDetection();
  return null;
});
