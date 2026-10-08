/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { Hexagon, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toMidiEvents } from '@/curriculum/engine/parts/convert';
import { applyFeel, getFeel } from '@/curriculum/engine/parts/feel';
import {
  keyLabel,
  PART_INSTRUMENTS,
  PART_LEVELS,
  PART_ROLES,
  partTicks,
  playedTick,
  PITCH_NAMES,
  transposePart,
  type InstrumentPart,
  type PartInstrument,
} from '@/curriculum/engine/parts/part';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { useStore } from '@/daw/store';
import type {
  InstrumentType,
  StudioBassVoice,
  Track,
} from '@/daw/store/tracksSlice';

// ── Parts ──────────────────────────────────────────────────────────────
// The Parts Library in the Studio: published instrumental parts (curated in
// the console) filtered by instrument, style, level and length, transposed to
// the project key, and dropped onto this track at the playhead's bar — with
// the player's feel, as it was performed.

const PPQ = 480;

/** The part instrument a track most likely wants. */
function instrumentFor(track: Track | undefined): PartInstrument | 'all' {
  if (!track) return 'all';
  if (track.instrument === 'bass-electric' || track.trackRole === 'bass')
    return 'bass';
  if (track.instrument === 'soundfont') {
    const gm = track.gmProgram ?? 0;
    if (gm >= 24 && gm <= 31) return 'guitar';
    if (gm >= 32 && gm <= 39) return 'bass';
  }
  return 'piano';
}

/**
 * A part's `sound` as track settings (see admin/parts/sounds.ts). A synth
 * patch is seeded into the track's synth cache first, so the engine the
 * instrument change creates starts on it.
 */
function trackSound(
  trackId: string,
  sound: string,
  bpm: number,
): Partial<Track> {
  const [type, arg] = sound.split(':') as [InstrumentType, string | undefined];
  if (type === 'oracle-synth') {
    const preset = FACTORY_PRESETS.find((p) => p.name === arg);
    if (!preset) return { instrument: type };
    setTrackSynthState(trackId, synthTrackStateFromPreset(preset, bpm));
    return { instrument: type, presetName: preset.name };
  }
  if (type === 'bass-electric')
    return { instrument: type, bassVoice: arg as StudioBassVoice | undefined };
  if (type === 'soundfont')
    return { instrument: type, gmProgram: Number(arg ?? 0) };
  return { instrument: type };
}

/** The part as this project will play it: in the project key, with its feel. */
function prepared(part: InstrumentPart, toTonic: number | null) {
  const keyed = toTonic === null ? part : transposePart(part, toTonic);
  return applyFeel(keyed.notes, getFeel(part.feel)).map((n) => ({
    ...n,
    tick: Math.max(0, playedTick(n)),
    offset: undefined,
  }));
}

const selectCls =
  'rounded px-1.5 py-1 text-[10px] outline-none bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]';

interface PartsBrowserProps {
  trackId: string;
}

export function PartsBrowser({ trackId }: PartsBrowserProps) {
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const rootNote = useStore((s) => s.rootNote);
  const projectBpm = useStore((s) => s.bpm);
  const position = useStore((s) => s.position);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const addMidiClip = useStore((s) => s.addMidiClip);
  const setSelectedClip = useStore((s) => s.setSelectedClip);
  const updateTrack = useStore((s) => s.updateTrack);

  const parts = useMemo(() => listLiveParts(), []);
  const [instrument, setInstrument] = useState<PartInstrument | 'all'>(() =>
    instrumentFor(track),
  );
  const [genre, setGenre] = useState('');
  const [level, setLevel] = useState('');
  const [bars, setBars] = useState('');
  const [role, setRole] = useState('');
  const [toProjectKey, setToProjectKey] = useState(true);
  const [useSound, setUseSound] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const timeouts = useRef<number[]>([]);

  const genres = useMemo(
    () => [...new Set(parts.map((p) => p.genre).filter(Boolean))].sort(),
    [parts],
  );
  const target = toProjectKey ? rootNote : null;

  const shown = parts.filter(
    (p) =>
      (instrument === 'all' || p.instrument === instrument) &&
      p.instrument !== 'drums' &&
      (!genre || p.genre === genre) &&
      (!level || p.level === Number(level)) &&
      (!role || p.role === role) &&
      (!bars || (bars === '8' ? p.bars >= 8 : p.bars === Number(bars))),
  );

  const stopPreview = useCallback(() => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
    trackEngineRegistry.get(trackId)?.trackEngine.allNotesOff?.();
    setPreviewId(null);
  }, [trackId]);

  useEffect(() => stopPreview, [stopPreview]);

  const preview = useCallback(
    (part: InstrumentPart) => {
      stopPreview();
      const entry = trackEngineRegistry.get(trackId);
      if (!entry) return;
      setPreviewId(part.id);
      const msPerTick = 60_000 / projectBpm / PPQ;
      const notes = prepared(part, target);
      for (const n of notes) {
        timeouts.current.push(
          window.setTimeout(
            () => entry.trackEngine.noteOn(n.midi, n.velocity),
            n.tick * msPerTick,
          ),
          window.setTimeout(
            () => entry.trackEngine.noteOff(n.midi),
            (n.tick + n.duration) * msPerTick,
          ),
        );
      }
      timeouts.current.push(
        window.setTimeout(
          () => setPreviewId(null),
          partTicks(part) * msPerTick + 100,
        ),
      );
    },
    [trackId, projectBpm, target, stopPreview],
  );

  const add = useCallback(
    (part: InstrumentPart) => {
      stopPreview();
      if (useSound)
        updateTrack(trackId, trackSound(trackId, part.sound, projectBpm));
      const barTicks = Math.round((tsNum * PPQ * 4) / tsDen);
      const clipId = `clip-part-${crypto.randomUUID().slice(0, 8)}`;
      addMidiClip(trackId, {
        id: clipId,
        name: part.name,
        // The bar the playhead is in, so a part never starts mid-bar.
        startTick: Math.floor(position / barTicks) * barTicks,
        durationTicks: partTicks(part),
        events: toMidiEvents(prepared(part, target)),
      });
      setSelectedClip(clipId, trackId);
    },
    [
      trackId,
      useSound,
      tsNum,
      tsDen,
      position,
      target,
      addMidiClip,
      setSelectedClip,
      updateTrack,
      stopPreview,
      projectBpm,
    ],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <select
          className={selectCls}
          value={instrument}
          onChange={(e) =>
            setInstrument(e.target.value as PartInstrument | 'all')
          }
          aria-label="Instrument"
        >
          <option value="all">All instruments</option>
          {PART_INSTRUMENTS.filter((i) => i.id !== 'drums').map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          aria-label="Style"
        >
          <option value="">All styles</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Role"
        >
          <option value="">All roles</option>
          {PART_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          aria-label="Level"
        >
          <option value="">All levels</option>
          {PART_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={bars}
          onChange={(e) => setBars(e.target.value)}
          aria-label="Length"
        >
          <option value="">Any length</option>
          <option value="1">1 bar</option>
          <option value="2">2 bars</option>
          <option value="4">4 bars</option>
          <option value="8">8+ bars</option>
        </select>
        <label
          className="ml-auto flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
          title={
            rootNote === null
              ? 'The project has no key yet — parts stay in the key they were written in'
              : `Move every part to ${PITCH_NAMES[rootNote]}`
          }
        >
          <input
            type="checkbox"
            checked={toProjectKey}
            disabled={rootNote === null}
            onChange={(e) => setToProjectKey(e.target.checked)}
          />
          {rootNote === null ? 'No project key' : `In ${PITCH_NAMES[rootNote]}`}
        </label>
        <label
          className="flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
          title="Switch this track to the sound the part was written for"
        >
          <input
            type="checkbox"
            checked={useSound}
            onChange={(e) => setUseSound(e.target.checked)}
          />
          Part&rsquo;s sound
        </label>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {shown.length === 0 && (
          <p
            className="px-3 py-4 text-[11px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {parts.length === 0
              ? 'No parts published yet — they are curated in the Parts Library.'
              : 'No parts match these filters.'}
          </p>
        )}
        {shown.map((part) => {
          const playing = previewId === part.id;
          const key =
            target === null
              ? keyLabel(part.key)
              : keyLabel({ ...part.key, tonic: target });
          return (
            <div
              key={part.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(255,255,255,0.03)]"
            >
              <button
                type="button"
                onClick={() => (playing ? stopPreview() : preview(part))}
                aria-label={playing ? 'Stop preview' : `Preview ${part.name}`}
                style={{ color: 'var(--color-text-dim)' }}
              >
                {playing ? (
                  <Square size={12} strokeWidth={1.5} />
                ) : (
                  <Play size={12} strokeWidth={1.5} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[11px]"
                  style={{ color: 'var(--color-text)' }}
                >
                  {part.name}
                </div>
                <div
                  className="truncate text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {[
                    part.instrument,
                    part.genre,
                    part.style,
                    PART_LEVELS.find((l) => l.id === part.level)?.label,
                    `${part.bars} bar${part.bars === 1 ? '' : 's'}`,
                    key,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => add(part)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px]"
                style={{
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                title="Add at the playhead's bar"
              >
                <Hexagon size={11} strokeWidth={1.5} /> Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
