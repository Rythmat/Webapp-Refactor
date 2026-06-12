// ── useStudioMonitor ────────────────────────────────────────────────────────
// Receives collaborators' live signals and plays them locally according to this
// user's (local) listen settings:
//   • Live MIDI  → re-synthesised through this user's copy of the sender's track
//                  (the track exists locally via doc sync), so it sounds as the
//                  sender hears it. Gated by per-track audibility.
//   • Live audio → WebRTC peer streams mixed into master via StudioRtcManager,
//                  with per-peer gain following audibility.
// It also publishes a per-track "activity" level (live MIDI + audio) used to
// pulse the remote-selected track's border — suppressed when muted/unlistened.

import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from './usePlaybackEngine';
import { studioRealtime } from '@/daw/collab/studioRealtime';
import { StudioRtcManager } from '@/daw/collab/StudioRtcManager';
import {
  getRemoteTrackAudible,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';

const MIDI_PULSE_MS = 260;

export function useStudioMonitor(isReady: boolean, token: string | null) {
  const remoteUsers = useStore((s) => s.remoteUsers);

  // Hold the token in a ref so the RTC manager (created once per session) reads
  // the latest value when it mints TURN credentials, without re-creating it.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const rtcRef = useRef<StudioRtcManager | null>(null);
  // trackId → set of notes a remote user currently holds on that track.
  const activeNotesRef = useRef<Map<string, Set<number>>>(new Map());
  // trackId → performance.now() of the last remote note (drives the MIDI pulse).
  const lastMidiRef = useRef<Map<string, number>>(new Map());
  // Latest clientId → trackId map (kept in a ref for the stable RAF loop).
  const peerTrackRef = useRef<Map<number, string>>(new Map());

  // ── Live MIDI receive (independent of WebRTC support) ──────────────────
  useEffect(() => {
    if (!isReady) return;
    return studioRealtime.subscribe((msg) => {
      if (msg.type !== 'studio:note') return;
      const engine = trackEngineRegistry.get(msg.trackId)?.trackEngine;
      if (!engine) return;

      let held = activeNotesRef.current.get(msg.trackId);
      if (!held) {
        held = new Set();
        activeNotesRef.current.set(msg.trackId, held);
      }

      if (msg.action === 'on') {
        held.add(msg.note);
        lastMidiRef.current.set(msg.trackId, performance.now());
        if (getRemoteTrackAudible(msg.trackId)) {
          engine.noteOn(msg.note, msg.velocity);
        }
      } else {
        held.delete(msg.note);
        engine.noteOff(msg.note);
      }
    });
  }, [isReady]);

  // ── WebRTC mesh lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;
    const mgr = new StudioRtcManager(() => tokenRef.current);
    mgr.start();
    rtcRef.current = mgr;
    return () => {
      mgr.stop();
      rtcRef.current = null;
    };
  }, [isReady]);

  // ── Track remote peers + apply per-peer audibility gain ────────────────
  useEffect(() => {
    const map = new Map<number, string>();
    remoteUsers.forEach((u, clientId) => {
      if (u.selectedTrackId) map.set(clientId, u.selectedTrackId);
    });
    peerTrackRef.current = map;

    const mgr = rtcRef.current;
    if (mgr) {
      mgr.syncPeers([...remoteUsers.keys()]);
      for (const [clientId, trackId] of map) {
        mgr.setPeerGain(clientId, getRemoteTrackAudible(trackId) ? 1 : 0);
      }
    }
  }, [remoteUsers]);

  // ── React to local listen-state changes (gains + cut held MIDI) ────────
  useEffect(() => {
    const apply = () => {
      const mgr = rtcRef.current;
      for (const [clientId, trackId] of peerTrackRef.current) {
        const audible = getRemoteTrackAudible(trackId);
        mgr?.setPeerGain(clientId, audible ? 1 : 0);
        // Silence held remote notes on a track that just became inaudible.
        if (!audible) {
          const held = activeNotesRef.current.get(trackId);
          const engine = trackEngineRegistry.get(trackId)?.trackEngine;
          if (held && engine) {
            for (const note of held) engine.noteOff(note);
            held.clear();
          }
        }
      }
    };
    return useStudioListenStore.subscribe(apply);
  }, []);

  // ── Activity loop (pulse signal) ───────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const setActivity = useStudioListenStore.getState().setActivity;
      for (const [clientId, trackId] of peerTrackRef.current) {
        if (!getRemoteTrackAudible(trackId)) {
          setActivity(trackId, 0);
          continue;
        }
        const audio = rtcRef.current?.getPeerLevel(clientId) ?? 0;
        const last = lastMidiRef.current.get(trackId) ?? -Infinity;
        const midi = now - last < MIDI_PULSE_MS ? 1 : 0;
        setActivity(trackId, Math.max(audio, midi));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isReady]);
}
