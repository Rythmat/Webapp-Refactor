/**
 * Frozen copies of the v2 draft decoders that ship before codec v3, for the
 * migration and rollback tests. Not a test file itself.
 *
 * - decodeAs12: deserializeSession as milestones 1.1 and 1.2 wrote it
 *   (SessionSerializer.ts at 6250e969), copied before codec v3 replaced it.
 *   It is the oracle the v1/v2 migrations are held to: whatever it gives a
 *   v1 or v2 draft, codec v3 must give too, field for field.
 * - decodeAsMain: deserializeSession as origin/main (ae320468, today's prod,
 *   from before 1.1) has it. A v3 draft keeps the v2 envelope (decision D1)
 *   so this older code still reads the core project after a rollback.
 *
 * Both are the shipped code with two changes: the store write returns the
 * decoded payload instead (without the reset lists the 1.2 code spread under
 * it, which hold no decoded data), and Oracle patches are collected instead
 * of seeded. Everything else, helpers included, is verbatim, so a draft that
 * would throw in a shipped build throws here.
 */
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { ensureSamplerSampleId } from '@/daw/instruments/samplerChops';
import { defaultReturns } from '@/daw/store/returnsSlice';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What a frozen decoder put in the store, and the patches it seeded. */
export interface FrozenDecode {
  state: Record<string, any>;
  synthSeeds: [string, unknown][];
}

// ── Helpers, verbatim ─────────────────────────────────────────────────────

function applyTrackSettings(settings: any) {
  return {
    gmProgram: settings?.gmProgram,
    effects: settings?.effects
      ? { ...structuredClone(DEFAULT_EFFECTS), ...settings.effects }
      : structuredClone(DEFAULT_EFFECTS),
    vocalChain: settings?.vocalChain,
    guitarChain: settings?.guitarChain,
    drumPads: settings?.drumPads,
    automation: settings?.automation,
    drumKit: settings?.drumKit,
    bassVoice: settings?.bassVoice,
    samplerSample: settings?.samplerSample
      ? ensureSamplerSampleId(settings.samplerSample)
      : undefined,
    organState: settings?.organState,
    presetName: settings?.presetName,
    sends: settings?.sends,
  };
}

function decodeMidiEvents(columnar: any): any[] {
  const len = columnar.notes.length;
  const out = new Array<any>(len);
  let tick = 0;
  for (let i = 0; i < len; i++) {
    tick += columnar.startTickDeltas[i];
    out[i] = {
      note: columnar.notes[i],
      velocity: columnar.velocities[i],
      startTick: tick,
      durationTicks: columnar.durations[i],
      channel: columnar.channels[i],
    };
  }
  return out;
}

function isLegacyMidiClip(clip: unknown): boolean {
  return (
    typeof clip === 'object' &&
    clip !== null &&
    Array.isArray((clip as { events?: unknown }).events)
  );
}

function remapDuckerKeys(tracks: any[], oldToNew: Map<string, string>): void {
  for (const track of tracks) {
    const ducker = track.effects?.ducker;
    if (ducker?.keyTrackId) {
      track.effects!.ducker = {
        ...ducker,
        keyTrackId: oldToNew.get(ducker.keyTrackId) ?? null,
      };
    }
  }
}

function restoreReturns(saved: any[] | undefined): any[] {
  if (!saved || saved.length === 0) return defaultReturns();
  return saved.map((r) => ({
    ...r,
    effects: { ...structuredClone(DEFAULT_EFFECTS), ...r.effects },
  }));
}

function dedupeChordRegionIds(regions: any[]): any[] {
  const seen = new Set<string>();
  let repaired: any[] | null = null;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    if (region.id && !seen.has(region.id)) {
      seen.add(region.id);
      continue;
    }
    repaired ??= [...regions];
    const id = crypto.randomUUID();
    seen.add(id);
    repaired[i] = { ...region, id };
  }
  return repaired ?? regions;
}

/** The per-track decode both builds share, up to the 1.1 backfills. */
function decodeTracks(d: any, synthSeeds: [string, unknown][], is12: boolean) {
  const tracks = d.tracks.map((t: any) => {
    const rawClips = (t.midiClips ?? []) as unknown[];
    const midiClips = rawClips.map((raw: any) => {
      if (isLegacyMidiClip(raw)) {
        return {
          id: raw.id,
          name: raw.name,
          startTick: raw.startTick,
          events: raw.events.map((e: any) => ({
            note: e.note,
            velocity: e.velocity,
            startTick: e.startTick,
            durationTicks: e.durationTicks,
            channel: e.channel,
          })),
        };
      }
      return {
        id: raw.id,
        name: raw.name,
        startTick: raw.startTick,
        events: decodeMidiEvents(raw.events),
      };
    });

    if (t.instrument === 'oracle-synth' && t.settings?.oracleSynth) {
      synthSeeds.push([t.id, t.settings.oracleSynth]);
    }

    const trackFields = { ...t };
    delete trackFields.settings;
    return {
      ...trackFields,
      ...(is12
        ? {
            audioInputChannel: t.audioInputChannel ?? null,
            trackRole: t.trackRole ?? 'auto',
          }
        : {}),
      ...applyTrackSettings(t.settings),
      activeEffects: t.activeEffects ?? [],
      midiClips,
      audioClips: (t.audioClips ?? []).map((c: any) => ({
        ...c,
        fadeInTicks: c.fadeInTicks ?? 0,
        fadeOutTicks: c.fadeOutTicks ?? 0,
      })),
    };
  });

  const hasMonitored = tracks.some(
    (t: any) => t.monitoring && t.type === 'midi',
  );
  if (!hasMonitored) {
    const firstMidi = tracks.find((t: any) => t.type === 'midi');
    if (firstMidi) {
      firstMidi.monitoring = true;
      firstMidi.recordArmed = true;
    }
  }

  const localMap = new Map<string, string>();
  d.tracks.forEach((t: any, i: number) => {
    localMap.set(t.settings?.sourceTrackId ?? t.id, tracks[i].id);
  });
  remapDuckerKeys(tracks, localMap);
  return tracks;
}

// ── The decoders ──────────────────────────────────────────────────────────

/**
 * deserializeSession of milestones 1.1 and 1.2 (6250e969). Null where it
 * returns false: an envelope version other than 1 or 2.
 */
export function decodeAs12(session: any): FrozenDecode | null {
  if (!(session.version === 1 || session.version === 2)) return null;
  const d = session.data;
  const synthSeeds: [string, unknown][] = [];
  const tracks = decodeTracks(d, synthSeeds, true);
  return {
    synthSeeds,
    state: {
      projectId: d.projectId ?? null,
      projectName: d.projectName ?? 'Untitled Project',
      composerName: d.composerName ?? '',
      bpm: d.transport.bpm,
      position: d.transport.position,
      metronomeEnabled: d.transport.metronomeEnabled,
      loopEnabled: d.transport.loopEnabled,
      loopStart: d.transport.loopStart,
      loopEnd: d.transport.loopEnd,
      isPlaying: false,
      isRecording: false,
      tracks,
      rootNote: d.prism.rootNote,
      mode: d.prism.mode ?? 'ionian',
      rhythmName: d.prism.rhythmName,
      genre: d.prism.genre,
      swing: d.prism.swing,
      chordRegions: dedupeChordRegionIds(d.chordRegions ?? []),
      returns: restoreReturns(d.returns),
      masterAutomation: d.masterAutomation ?? {},
    },
  };
}

/**
 * deserializeSession of origin/main (ae320468), the build in prod before
 * 1.1. Null where it logs "Unknown session version" and returns.
 */
export function decodeAsMain(session: any): FrozenDecode | null {
  if (session.version !== 1 && session.version !== 2) return null;
  const d = session.data;
  const synthSeeds: [string, unknown][] = [];
  const tracks = decodeTracks(d, synthSeeds, false);
  return {
    synthSeeds,
    state: {
      projectId: d.projectId ?? null,
      projectName: d.projectName ?? 'Untitled Project',
      composerName: d.composerName ?? '',
      bpm: d.transport.bpm,
      position: d.transport.position,
      metronomeEnabled: d.transport.metronomeEnabled,
      loopEnabled: d.transport.loopEnabled,
      loopStart: d.transport.loopStart,
      loopEnd: d.transport.loopEnd,
      isPlaying: false,
      isRecording: false,
      tracks,
      rootNote: d.prism.rootNote,
      mode: d.prism.mode ?? 'ionian',
      rhythmName: d.prism.rhythmName,
      genre: d.prism.genre,
      swing: d.prism.swing,
      chordRegions: d.chordRegions ?? [],
      returns: restoreReturns(d.returns),
      masterAutomation: d.masterAutomation ?? {},
    },
  };
}

/**
 * What prod's other readers of the autosave touch (origin/main): the Song
 * page's unsavedStudioSession reads `saved.tracks.length` with no optional
 * chaining, StudioNewProject reads `data.projectName`, and hasWork reads the
 * track and chord counts. Throws where those would.
 */
export function readAsMainSongPage(session: any): {
  hasContent: boolean;
  projectName: string;
} {
  const saved = session.data;
  const hasContent =
    saved.tracks.length > 0 || (saved.chordRegions?.length ?? 0) > 0;
  return {
    hasContent,
    projectName: saved.projectName || 'Untitled Project',
  };
}
