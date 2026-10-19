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
import { addFrameTask } from '@/daw/engine/engineClock';
import { trackEngineRegistry } from './usePlaybackEngine';
import { studioRealtime } from '@/daw/collab/studioRealtime';
import { StudioRtcManager } from '@/daw/collab/StudioRtcManager';
import {
  getRemoteTrackAudible,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';

const MIDI_PULSE_MS = 260;

/** The notes one remote user holds on one of their tracks. */
interface RemoteHeld {
  clientId: number;
  trackId: string;
  notes: Set<number>;
}

const heldKey = (clientId: number, trackId: string) => `${clientId}:${trackId}`;

/** Stops a remote user's held notes on their track and forgets them. */
function releaseHeld(held: RemoteHeld): void {
  const engine = trackEngineRegistry.get(held.trackId)?.trackEngine;
  if (engine) for (const note of held.notes) engine.noteOff(note);
  held.notes.clear();
}
/** The activity pulse only needs to look alive, not follow every frame. */
const ACTIVITY_FPS = 20;

export function useStudioMonitor(isReady: boolean, token: string | null) {
  const remoteUsers = useStore((s) => s.remoteUsers);

  // Hold the token in a ref so the RTC manager (created once per session) reads
  // the latest value when it mints TURN credentials, without re-creating it.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const rtcRef = useRef<StudioRtcManager | null>(null);
  // clientId:trackId → the notes that remote user holds on that track. Keyed
  // by sender too, so one peer's notes can be let go of when they leave.
  const activeNotesRef = useRef<Map<string, RemoteHeld>>(new Map());
  // trackId → performance.now() of the last remote note (drives the MIDI pulse).
  const lastMidiRef = useRef<Map<string, number>>(new Map());
  // Latest clientId → trackId map (kept in a ref for the activity task).
  const peerTrackRef = useRef<Map<number, string>>(new Map());
  // Whether any peer drives a track: the activity task runs only then.
  let peersDriving = false;
  remoteUsers.forEach((u) => {
    if (u.selectedTrackId) peersDriving = true;
  });

  // ── Live MIDI receive (independent of WebRTC support) ──────────────────
  useEffect(() => {
    if (!isReady) return;
    const active = activeNotesRef.current;
    const unsubscribe = studioRealtime.subscribe((msg) => {
      if (msg.type !== 'studio:note') return;
      const engine = trackEngineRegistry.get(msg.trackId)?.trackEngine;
      if (!engine) return;

      const key = heldKey(msg.from, msg.trackId);
      let held = active.get(key);
      if (!held) {
        held = { clientId: msg.from, trackId: msg.trackId, notes: new Set() };
        active.set(key, held);
      }

      if (msg.action === 'on') {
        held.notes.add(msg.note);
        lastMidiRef.current.set(msg.trackId, performance.now());
        if (getRemoteTrackAudible(msg.trackId)) {
          engine.noteOn(msg.note, msg.velocity);
        }
      } else {
        held.notes.delete(msg.note);
        if (held.notes.size === 0) active.delete(key);
        engine.noteOff(msg.note);
      }
    });
    return () => {
      unsubscribe();
      // Leaving the session: nothing will send these notes' note-offs now.
      for (const held of active.values()) releaseHeld(held);
      active.clear();
    };
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
    // A track no peer drives any more stops pulsing.
    const setActivity = useStudioListenStore.getState().setActivity;
    const driven = new Set(map.values());
    for (const trackId of peerTrackRef.current.values()) {
      if (!driven.has(trackId)) setActivity(trackId, 0);
    }
    peerTrackRef.current = map;

    // A peer who leaves with keys down sends no note-offs: let go of them.
    for (const [key, held] of activeNotesRef.current) {
      if (remoteUsers.has(held.clientId)) continue;
      releaseHeld(held);
      activeNotesRef.current.delete(key);
    }

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
          for (const held of activeNotesRef.current.values()) {
            if (held.trackId === trackId) releaseHeld(held);
          }
        }
      }
    };
    return useStudioListenStore.subscribe(apply);
  }, []);

  // ── Activity task (pulse signal) ───────────────────────────────────────
  // A task on the shared frame loop at 20 fps, registered only while some
  // peer drives a track: a session with nobody else in it runs nothing.
  useEffect(() => {
    if (!isReady || !peersDriving) return;
    const tick = () => {
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
    return addFrameTask(tick, { fps: ACTIVITY_FPS, name: 'studioActivity' });
  }, [isReady, peersDriving]);
}
