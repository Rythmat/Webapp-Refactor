/**
 * Hip Hop groove audition — dev-only page for hearing the proposed Hip Hop
 * drum, bass and chord patterns (and today's Funk-fallback output) before any
 * of it goes into the lesson engine.
 *
 * Route: /__hiphop-grooves  (registered in src/App.tsx behind import.meta.env.DEV).
 * Patterns: ./patterns.ts. Planning record: docs/genre-activities/PLANNING-LEDGER.md.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildBackingNotes } from '@/curriculum/engine/genreGeneration/backingPatterns';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import type { DrumKitId } from '@/daw/instruments/drumKits';
import * as audio from './auditionAudio';
import {
  AUDITION_STYLES,
  BAR_TICKS,
  LOOP_BARS,
  TICKS_PER_16TH,
  buildBassEvents,
  buildChordEvents,
  buildDrumEvents,
  type AuditionEvent,
  type AuditionStyle,
  type BassVoice,
  type Progression,
  barChords,
  spell,
  BASS_VOICE_LABELS,
} from './patterns';

const CURRENT_ENGINE_BARS = 16;
const KITS: DrumKitId[] = ['natural', '808', 'house'];
const PARTS: audio.AuditionPart[] = ['drums', 'bass', 'chords'];

const C = {
  bg: '#0d0d10',
  panel: '#17171c',
  line: '#2a2a33',
  text: '#e8e8f0',
  dim: '#9a9aa8',
  accent: '#f5b942',
  kick: '#ff6b5b',
  snare: '#5bc0ff',
  clap: '#b38bff',
  hat: '#7ee0a1',
  bass: '#f5b942',
  chords: '#ff8fd0',
};

const asciiSymbol = (s: string) =>
  s
    .replace(/\s*\(.*\)/, '')
    .replace(/ sus/, 'sus')
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#');

/** Today's generator output for Hip Hop — the Funk path, 16 bars. */
function currentEngineEvents(progression: Progression): AuditionEvent[] {
  const step = {
    backing_parts: {
      engine_generates: ['drums', 'bass', 'chords'],
      student_plays: [],
    },
    chordSymbols: progression.bars.map((b) =>
      asciiSymbol((Array.isArray(b) ? b[0] : b).symbol),
    ),
  } as unknown as ActivityStepV2;
  return buildBackingNotes(step, 60, 1, 'l1a', [], 'hip-hop')
    .filter((n) => n.onset < CURRENT_ENGINE_BARS * BAR_TICKS)
    .map((n) => ({
      part: n.part,
      tick: n.onset,
      note: n.note,
      dur: n.duration,
      vel: n.velocity,
    }));
}

export function HipHopGrooveAudition() {
  const [styleId, setStyleId] = useState(AUDITION_STYLES[1].id);
  const style = AUDITION_STYLES.find((s) => s.id === styleId)!;

  const [drumId, setDrumId] = useState('');
  const [bassId, setBassId] = useState('');
  const [compId, setCompId] = useState('');
  const [progId, setProgId] = useState('');
  const [bpm, setBpm] = useState(style.bpm);
  const [swing, setSwing] = useState(style.swing);
  const [feelOn, setFeelOn] = useState(!!style.feel);
  const [kit, setKit] = useState<DrumKitId>(style.kit);
  const [bassVoice, setBassVoice] = useState<BassVoice>(style.bassVoice);
  const [muted, setMuted] = useState<Record<audio.AuditionPart, boolean>>({
    drums: false,
    bass: false,
    chords: false,
  });
  const [levels, setLevels] = useState<Record<audio.AuditionPart, number>>({
    drums: 1,
    bass: 1,
    chords: 1,
  });
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playStep, setPlayStep] = useState<number | null>(null);
  const [regen, setRegen] = useState(0);

  /** The style's defaults, overridden by the progression's own settings. */
  function applyProgression(s: AuditionStyle, p: Progression) {
    const preset = p.preset ?? {};
    setProgId(p.id);
    setDrumId(preset.drums ?? s.drums[0]?.id ?? '');
    setBassId(preset.bass ?? s.bass[0]?.id ?? '');
    setCompId(preset.comp ?? s.comping[0]?.id ?? '');
    setBpm(preset.bpm ?? s.bpm);
    setSwing(preset.swing ?? s.swing);
    setKit(preset.kit ?? s.kit);
    setBassVoice(preset.bassVoice ?? s.bassVoice);
  }

  // Reset to the style's defaults whenever the style changes.
  useEffect(() => {
    applyProgression(style, style.progressions[0]);
    setFeelOn(!!style.feel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const pickProgression = (id: string) =>
    applyProgression(style, style.progressions.find((p) => p.id === id)!);

  const drums = style.drums.find((d) => d.id === drumId) ?? style.drums[0];
  const bass = style.bass.find((b) => b.id === bassId) ?? style.bass[0];
  const comp = style.comping.find((c) => c.id === compId) ?? style.comping[0];
  const progression =
    style.progressions.find((p) => p.id === progId) ?? style.progressions[0];

  const feel = feelOn
    ? (style.feel ?? { kickOffset: -12, snareOffset: 24 })
    : undefined;
  const isCurrent = style.engine === 'current';
  const loopBars = isCurrent ? CURRENT_ENGINE_BARS : LOOP_BARS;

  const events = useMemo<AuditionEvent[]>(() => {
    if (isCurrent) return currentEngineEvents(progression);
    const opts = { swing, feel };
    return [
      ...(drums ? buildDrumEvents(drums, opts) : []),
      ...(bass ? buildBassEvents(bass, progression, drums, opts) : []),
      ...(comp ? buildChordEvents(comp, progression, opts) : []),
    ];
    // regen re-rolls the current engine's random choices
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCurrent,
    progression,
    drums,
    bass,
    comp,
    swing,
    feel?.kickOffset,
    feel?.snareOffset,
    regen,
  ]);

  // Live settings that don't need a restart.
  useEffect(() => void audio.setBassVoice(bassVoice), [bassVoice]);
  useEffect(() => {
    PARTS.forEach((p) => {
      audio.setMuted(p, muted[p]);
      audio.setLevel(p, levels[p]);
    });
  }, [muted, levels]);

  // (Re)start whenever what's playing changes.
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    setLoadingAudio(true);
    void audio.play(events, bpm, loopBars * BAR_TICKS, kit).finally(() => {
      if (!cancelled) setLoadingAudio(false);
    });
    return () => {
      cancelled = true;
    };
  }, [playing, events, bpm, kit, loopBars]);

  useEffect(() => () => audio.stop(), []);

  // Playhead.
  const rafRef = useRef(0);
  useEffect(() => {
    if (!playing) {
      setPlayStep(null);
      return;
    }
    const tick = () => {
      const t = audio.positionTicks(bpm);
      const next =
        t == null ? null : Math.floor(t / TICKS_PER_16TH) % (loopBars * 16);
      setPlayStep((prev) => (prev === next ? prev : next));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, bpm, loopBars]);

  // Space bar toggles play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement).tagName === 'INPUT')
        return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function togglePlay() {
    if (playing) {
      audio.stop();
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }

  const windowStart =
    isCurrent && playStep != null ? Math.floor(playStep / 64) * 4 : 0;

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.text,
        fontFamily: 'system-ui, sans-serif',
        padding: '24px 28px 60px',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            fontSize: 12,
            color: C.dim,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Dev only · Hip Hop planning
        </div>
        <h1 style={{ margin: '4px 0 6px', fontSize: 28 }}>
          Hip Hop groove audition
        </h1>
        <p style={{ margin: 0, color: C.dim, maxWidth: 760, lineHeight: 1.5 }}>
          Proposed drums, bass and chord rhythms for the three Hip Hop levels,
          played on the lesson instruments. Nothing here is in the lessons yet.
          Mix and match, then tell Claude what to keep. Space bar plays and
          stops.
        </p>

        {/* Style tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            margin: '22px 0 14px',
          }}
        >
          {AUDITION_STYLES.map((s) => (
            <StyleTab
              key={s.id}
              s={s}
              active={s.id === styleId}
              onClick={() => setStyleId(s.id)}
            />
          ))}
        </div>

        <Panel>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {style.level !== 'Now' && (
                <span style={{ color: C.accent }}>{style.level} · </span>
              )}
              {style.title}
            </h2>
            <span style={{ color: C.dim }}>
              {style.key} · {style.bpmRange[0]}–{style.bpmRange[1]} BPM
            </span>
          </div>
          <p style={{ margin: '6px 0 16px', color: C.dim }}>{style.blurb}</p>

          {/* Transport */}
          <div
            style={{
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button onClick={togglePlay} style={playButton(playing)}>
              {playing ? (loadingAudio ? 'Loading…' : '■ Stop') : '▶ Play'}
            </button>
            <Slider
              label="Tempo"
              value={bpm}
              min={55}
              max={120}
              onChange={setBpm}
              suffix=" BPM"
            />
            <Slider
              label="Swing"
              value={swing}
              min={50}
              max={70}
              onChange={setSwing}
              suffix={swing === 50 ? '% (straight)' : '% · page only'}
              disabled={isCurrent}
            />
            <label
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                color: isCurrent ? C.line : C.text,
              }}
            >
              <input
                type="checkbox"
                checked={feelOn}
                disabled={isCurrent}
                onChange={(e) => setFeelOn(e.target.checked)}
              />
              Dilla feel{' '}
              <span style={{ color: C.dim, fontSize: 12 }}>
                (kick early, snare late · page only)
              </span>
            </label>
            <Select
              label="Kit"
              value={kit}
              options={KITS}
              onChange={(v) => setKit(v as DrumKitId)}
            />
            <Select
              label="Bass"
              value={bassVoice}
              options={Object.keys(BASS_VOICE_LABELS)}
              labels={BASS_VOICE_LABELS}
              onChange={(v) => setBassVoice(v as BassVoice)}
            />
            {isCurrent && (
              <button
                onClick={() => setRegen((n) => n + 1)}
                style={chip(false)}
              >
                ↻ New random take
              </button>
            )}
          </div>

          {/* Pickers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            <Picker
              title="Progression"
              items={style.progressions.map((p) => ({
                id: p.id,
                name: p.degrees,
                note: `${p.bars.map((b) => (Array.isArray(b) ? b.map((c) => c.symbol).join(' ') : b.symbol)).join(' | ')}${p.reference ? ` — ${p.reference}` : ''}`,
              }))}
              value={progression.id}
              onChange={pickProgression}
            />
            {!isCurrent && (
              <>
                <Picker
                  title="Drums"
                  items={style.drums}
                  value={drums?.id}
                  onChange={setDrumId}
                />
                <Picker
                  title="Bass"
                  items={style.bass}
                  value={bass?.id}
                  onChange={setBassId}
                />
                <Picker
                  title="Chord rhythm"
                  items={style.comping}
                  value={comp?.id}
                  onChange={setCompId}
                />
              </>
            )}
          </div>

          {/* Mixer */}
          <div
            style={{
              display: 'flex',
              gap: 22,
              marginTop: 20,
              flexWrap: 'wrap',
            }}
          >
            {PARTS.map((p) => (
              <div
                key={p}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <button
                  onClick={() => setMuted((m) => ({ ...m, [p]: !m[p] }))}
                  style={{
                    ...chip(!muted[p]),
                    minWidth: 76,
                    textTransform: 'capitalize',
                  }}
                >
                  {muted[p] ? `${p} off` : p}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={levels[p]}
                  onChange={(e) =>
                    setLevels((l) => ({ ...l, [p]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* Grid */}
        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <strong>What you're hearing</strong>
            <span style={{ color: C.dim, fontSize: 13 }}>
              {isCurrent
                ? `16-bar generated loop — showing bars ${windowStart + 1}–${windowStart + 4}`
                : '4-bar loop · one column per 16th'}
            </span>
          </div>
          <Grid
            events={events}
            progression={progression}
            barOffset={windowStart}
            playStep={playStep}
            flats={!!style.flats}
            engineVoicing={isCurrent}
          />
        </Panel>

        <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
          Voicings stay at or below C5 and bass at or below C4. The bass 5th
          always comes from the chord root. The 808 bass is a new synth voice (a
          sine with a short pitch punch and a little drive so it reads on laptop
          speakers) — use headphones or monitors to judge the sub.
        </p>
      </div>
    </div>
  );
}

// ── Grid ────────────────────────────────────────────────────────────────────

const ROWS: {
  key: string;
  label: string;
  color: string;
  match: (e: AuditionEvent) => boolean;
}[] = [
  {
    key: 'kick',
    label: 'Kick',
    color: C.kick,
    match: (e) => e.part === 'drums' && e.note === 36,
  },
  {
    key: 'snare',
    label: 'Snare',
    color: C.snare,
    match: (e) => e.part === 'drums' && e.note === 38,
  },
  {
    key: 'clap',
    label: 'Clap / rim',
    color: C.clap,
    match: (e) => e.part === 'drums' && e.note === 40,
  },
  {
    key: 'hat',
    label: 'Hat',
    color: C.hat,
    match: (e) =>
      e.part === 'drums' && (e.note === 42 || e.note === 44 || e.note === 46),
  },
  {
    key: 'bass',
    label: 'Bass',
    color: C.bass,
    match: (e) => e.part === 'bass',
  },
  {
    key: 'chords',
    label: 'Chords',
    color: C.chords,
    match: (e) => e.part === 'chords',
  },
];

const CELL = 17;

function Grid({
  events,
  progression,
  barOffset,
  playStep,
  flats,
  engineVoicing,
}: {
  events: AuditionEvent[];
  progression: Progression;
  barOffset: number;
  playStep: number | null;
  flats: boolean;
  /** The engine voices the chords itself, so show what it actually played. */
  engineVoicing: boolean;
}) {
  const noteName = (n: number) => spell(n, flats);
  const steps = 64;
  const startTick = barOffset * BAR_TICKS;
  const cells = (match: (e: AuditionEvent) => boolean) => {
    const byStep: AuditionEvent[][] = Array.from({ length: steps }, () => []);
    events.filter(match).forEach((e) => {
      const s = Math.round((e.tick - startTick) / TICKS_PER_16TH);
      if (s >= 0 && s < steps) byStep[s].push(e);
    });
    return byStep;
  };
  const localPlay = playStep == null ? null : playStep - barOffset * 16;
  const barChordNotes = (bar: number) =>
    [
      ...new Set(
        events
          .filter(
            (e) =>
              e.part === 'chords' &&
              e.tick >= bar * BAR_TICKS &&
              e.tick < bar * BAR_TICKS + 240,
          )
          .map((e) => e.note),
      ),
    ]
      .sort((a, b) => a - b)
      .map(noteName)
      .join(' ');

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: 90 + steps * CELL }}>
        {/* Chord header */}
        <div style={{ display: 'flex', marginLeft: 90 }}>
          {[0, 1, 2, 3].map((b) => {
            const chords = barChords(progression, barOffset + b);
            return (
              <div
                key={b}
                style={{
                  width: 16 * CELL,
                  padding: '0 6px 8px',
                  boxSizing: 'border-box',
                  borderLeft: `1px solid ${C.line}`,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  <span style={{ color: C.dim, fontWeight: 400, fontSize: 12 }}>
                    bar {barOffset + b + 1}{' '}
                  </span>
                  {chords.map((c) => c.symbol).join(' → ')}
                </div>
                <div style={{ fontSize: 11, color: C.dim }}>
                  {engineVoicing
                    ? `engine voicing: ${barChordNotes(barOffset + b)}`
                    : chords
                        .map(
                          (c) =>
                            `${c.voicing}: ${c.rh.map(noteName).join(' ')}`,
                        )
                        .join(' · ')}
                </div>
              </div>
            );
          })}
        </div>
        {ROWS.map((row) => {
          const byStep = cells(row.match);
          if (row.key === 'clap' && byStep.every((c) => !c.length)) return null;
          return (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: row.key === 'bass' ? 26 : 22,
              }}
            >
              <div style={{ width: 90, fontSize: 12, color: C.dim }}>
                {row.label}
              </div>
              {byStep.map((hits, s) => {
                const strongest = hits.reduce((m, h) => Math.max(m, h.vel), 0);
                const open = hits.some((h) => h.note === 46);
                const isBeat = s % 4 === 0;
                const isBar = s % 16 === 0;
                return (
                  <div
                    key={s}
                    title={hits
                      .map((h) => `${noteName(h.note)} v${h.vel}`)
                      .join(', ')}
                    style={{
                      width: CELL,
                      height: '100%',
                      boxSizing: 'border-box',
                      borderLeft: `1px solid ${isBar ? '#55556a' : isBeat ? C.line : '#1d1d24'}`,
                      background:
                        localPlay === s
                          ? 'rgba(245,185,66,0.18)'
                          : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: C.bg,
                    }}
                  >
                    {hits.length > 0 && (
                      <div
                        style={{
                          width: row.key === 'bass' ? CELL - 2 : CELL - 5,
                          height: row.key === 'bass' ? 20 : CELL - 5,
                          borderRadius: open ? 10 : 3,
                          background: row.color,
                          opacity: 0.35 + (0.65 * strongest) / 127,
                          border: open ? `2px solid ${C.text}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          lineHeight: 1,
                          overflow: 'hidden',
                        }}
                      >
                        {row.key === 'bass'
                          ? noteName(hits[0].note)
                          : row.key === 'hat' && hits.length > 1
                            ? hits.length
                            : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Small controls ──────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function StyleTab({
  s,
  active,
  onClick,
}: {
  s: AuditionStyle;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.accent : C.panel,
        color: active ? C.bg : C.text,
        border: `1px solid ${active ? C.accent : C.line}`,
        borderRadius: 10,
        padding: '8px 14px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.75 }}>{s.level}</div>
      <div style={{ fontWeight: 600 }}>{s.title}</div>
    </button>
  );
}

function Picker({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: { id: string; name: string; note: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: C.dim,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              textAlign: 'left',
              background:
                it.id === value ? 'rgba(245,185,66,0.12)' : 'transparent',
              border: `1px solid ${it.id === value ? C.accent : C.line}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14 }}>{it.name}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
              {it.note}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix: string;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: disabled ? C.line : C.text,
      }}
    >
      {label}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        style={{
          minWidth: 88,
          color: C.dim,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {suffix}
      </span>
    </label>
  );
}

function Select({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.bg,
          color: C.text,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          padding: '4px 6px',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function playButton(playing: boolean): React.CSSProperties {
  return {
    background: playing ? C.text : C.accent,
    color: C.bg,
    border: 'none',
    borderRadius: 10,
    padding: '10px 22px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    minWidth: 110,
  };
}

function chip(on: boolean): React.CSSProperties {
  return {
    background: on ? 'rgba(245,185,66,0.14)' : 'transparent',
    color: on ? C.text : C.dim,
    border: `1px solid ${on ? C.accent : C.line}`,
    borderRadius: 8,
    padding: '5px 10px',
    cursor: 'pointer',
  };
}
