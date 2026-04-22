/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Play } from 'lucide-react';
import * as Tone from 'tone';
import { PianoKeyboard, useRange } from '@/components/PianoKeyboard';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { startEpSampler, triggerEpAttackRelease } from '@/audio/epSampler';
import { CurriculumRoutes } from '@/constants/routes';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import type {
  GenreLevelProfile,
  GenreProfile,
  VoicingRef,
} from '@/curriculum/types/genreProfile';
import { formatScaleDegrees } from '@/components/learn/modeHelpers';
import { colorForKeyMode } from '@/lib/modeColorShift';
import '@/components/learn/learn.css';

// ── Section key → ActivitySectionId mapping ─────────────────────────────
const TECHNIQUE_TO_SECTION: Record<string, string> = {
  melody: 'A',
  chords: 'B',
  bass: 'C',
  performance: 'D',
};

// ── Audio helpers (copied from LessonOverview.tsx) ──────────────────────

async function playChord(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.8, 0.8);
    }, i * 30);
  });
}

async function playScaleAscending(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.4, 0.8);
    }, i * 600);
  });
}

// ── ScaledPiano (copied from LessonOverview.tsx) ────────────────────────

function ScaledPiano({
  children,
  pointerEventsNone,
}: {
  children: React.ReactNode;
  pointerEventsNone?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    let prevWidth = 0;
    const update = () => {
      const cw = container.clientWidth;
      if (cw === prevWidth) return;
      prevWidth = cw;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (iw > 0) {
        const s = cw / iw;
        setScale(s);
        setInnerHeight(ih);
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden${pointerEventsNone ? ' pointer-events-none' : ''}`}
      style={{ height: innerHeight ? `${innerHeight * scale}px` : undefined }}
    >
      <div
        ref={innerRef}
        style={{
          width: 'fit-content',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function scaleMidisToEvents(midis: number[]): PlaybackEvent[] {
  return midis.map((midi, i) => ({
    id: `scale-${midi}-${i}`,
    type: 'note' as const,
    midi,
    time: Date.now(),
    duration: 0,
    velocity: 1,
  }));
}

type TabId = 'about' | 'theory' | 'technique';
type LevelNum = 1 | 2 | 3;
type TechniqueSection = 'melody' | 'chords' | 'bass' | 'performance';

const TAB_ACCENT = '#7ecfcf';

const tabStyle = (isActive: boolean) => ({
  background: isActive ? 'rgba(126, 207, 207, 0.12)' : 'rgba(255,255,255,0.03)',
  border: isActive
    ? `1px solid ${TAB_ACCENT}`
    : '1px solid var(--color-border)',
  color: isActive ? TAB_ACCENT : 'var(--color-text-dim)',
});

const levelPillStyle = (isActive: boolean, accentColor: string) => ({
  background: isActive ? `${accentColor}20` : 'rgba(255,255,255,0.03)',
  border: isActive
    ? `1px solid ${accentColor}`
    : '1px solid var(--color-border)',
  color: isActive ? accentColor : 'var(--color-text-dim)',
});

// ── VoicingCard ─────────────────────────────────────────────────────────

function VoicingCard({
  voicing,
  accentColor,
  startC,
  endC,
}: {
  voicing: VoicingRef;
  accentColor: string;
  startC: number;
  endC: number;
}) {
  const events = useMemo(
    () =>
      voicing.midis.map((midi, i) => ({
        id: `voicing-${voicing.symbol}-${i}`,
        type: 'note' as const,
        midi,
        time: Date.now(),
        duration: 0,
        velocity: 1,
      })),
    [voicing],
  );

  return (
    <div
      className="glass-panel-sm relative flex flex-col gap-2 rounded-xl p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={() => playChord(voicing.midis)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
        style={{ color: 'var(--color-accent)' }}
      >
        <Play size={16} fill="currentColor" />
      </button>
      <p
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {voicing.label}
      </p>
      <ScaledPiano pointerEventsNone>
        <PianoKeyboard
          activeWhiteKeyColor={accentColor}
          activeBlackKeyColor={accentColor}
          enableClick={false}
          startC={startC}
          endC={endC}
          playingNotes={events}
          useContextNotes={false}
        />
      </ScaledPiano>
      <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
        {voicing.description}
      </p>
    </div>
  );
}

// ── About Tab ───────────────────────────────────────────────────────────

function AboutTab({ profile }: { profile: GenreProfile }) {
  return (
    <div className="flex flex-col gap-6">
      {/* History */}
      <div
        className="glass-panel-sm rounded-xl p-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="text-[10px] uppercase tracking-widest opacity-50 mb-2"
          style={{ color: 'var(--color-text-dim)' }}
        >
          History
        </div>
        <p
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--color-text)' }}
        >
          {profile.history}
        </p>
      </div>

      {/* Primary Artists */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest opacity-50 mb-3"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Key Artists
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.primaryArtists.map((artist) => (
            <div
              key={artist.name}
              className="glass-panel-sm rounded-lg p-3 flex flex-col gap-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {artist.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                {artist.era}
                {artist.role && ` · ${artist.role}`}
              </p>
              {artist.tracks && artist.tracks.length > 0 && (
                <p
                  className="text-xs italic"
                  style={{ color: 'var(--color-text-dim)', opacity: 0.7 }}
                >
                  {artist.tracks.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sub-genres + Crossover */}
      <div className="flex flex-col gap-3">
        <div>
          <div
            className="text-[10px] uppercase tracking-widest opacity-50 mb-2"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Sub-genres
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.subGenres.map((sg) => (
              <span
                key={sg}
                className="inline-block rounded px-2 py-0.5 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  color: profile.accentColor,
                }}
              >
                {sg}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div
            className="text-[10px] uppercase tracking-widest opacity-50 mb-2"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Crossover Genres
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.crossoverGenres.map((cg) => (
              <span
                key={cg}
                className="inline-block rounded px-2 py-0.5 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-dim)',
                }}
              >
                {cg}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Characteristics */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest opacity-50 mb-2"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Characteristics
        </div>
        <ul className="flex flex-col gap-1.5">
          {profile.characteristics.map((c) => (
            <li
              key={c}
              className="text-sm"
              style={{ color: 'var(--color-text)' }}
            >
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Theory Tab ──────────────────────────────────────────────────────────

function TheoryTab({
  profile,
  levelProfile,
  selectedLevel,
  onLevelChange,
  onStartActivity,
  keyColor,
}: {
  profile: GenreProfile;
  levelProfile: GenreLevelProfile;
  selectedLevel: LevelNum;
  onLevelChange: (level: LevelNum) => void;
  onStartActivity: (level: LevelNum, section: string) => void;
  keyColor: string;
}) {
  const [animatingNotes, setAnimatingNotes] = useState<PlaybackEvent[]>([]);

  // Build scale MIDIs from intervals + root
  const scaleMidis = useMemo(() => {
    const midis = levelProfile.scaleIntervals.map(
      (i) => i + levelProfile.keyMidi,
    );
    // Add octave if not present
    const octave = levelProfile.keyMidi + 12;
    if (!midis.includes(octave)) midis.push(octave);
    return midis;
  }, [levelProfile]);

  const scaleEvents = useMemo(
    () => scaleMidisToEvents(scaleMidis),
    [scaleMidis],
  );

  const { lowestC, highestC } = useRange(scaleEvents);

  // Unified range for all voicing cards — collect all MIDIs, pad by 1 octave each side
  const { voicingStartC, voicingEndC } = useMemo(() => {
    const allMidis = levelProfile.primaryVoicings.flatMap((v) => v.midis);
    if (allMidis.length === 0) return { voicingStartC: 3, voicingEndC: 6 };
    const lo = Math.floor(Math.min(...allMidis) / 12);
    const hi = Math.floor(Math.max(...allMidis) / 12);
    return { voicingStartC: Math.max(0, lo - 1), voicingEndC: hi + 2 };
  }, [levelProfile]);

  const handlePlayScale = useCallback(() => {
    playScaleAscending(scaleMidis);
    scaleMidis.forEach((midi, i) => {
      setTimeout(() => {
        setAnimatingNotes([
          {
            id: `anim-${midi}-${i}`,
            type: 'note',
            midi,
            time: Date.now(),
            duration: 0,
            velocity: 1,
          },
        ]);
      }, i * 600);
    });
    setTimeout(() => {
      setAnimatingNotes([]);
    }, scaleMidis.length * 600);
  }, [scaleMidis]);

  return (
    <div className="flex flex-col gap-6">
      {/* Level pills */}
      <LevelPills
        selectedLevel={selectedLevel}
        onLevelChange={onLevelChange}
        accentColor={profile.accentColor}
        keyColor={keyColor}
      />

      {/* Key & Scale section */}
      <div
        className="glass-panel-sm rounded-xl p-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="text-[10px] uppercase tracking-widest opacity-50 mb-3"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Key &amp; Scale
        </div>

        <ScaledPiano>
          <PianoKeyboard
            activeWhiteKeyColor={keyColor}
            activeBlackKeyColor={keyColor}
            enableClick={false}
            startC={lowestC}
            endC={highestC}
            playingNotes={
              animatingNotes.length > 0 ? animatingNotes : scaleEvents
            }
            useContextNotes={false}
          />
        </ScaledPiano>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {levelProfile.keyCenter} {levelProfile.mode}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            [{levelProfile.scaleNotes.join(', ')}]
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            Intervals: [
            {formatScaleDegrees(levelProfile.scaleIntervals).join(', ')}]
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            {levelProfile.tempoRange}
          </p>
          <button
            type="button"
            onClick={handlePlayScale}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              border: `1px solid ${keyColor}`,
              color: keyColor,
            }}
          >
            <Play size={12} fill="currentColor" />
            Play Scale
          </button>
        </div>
      </div>

      {/* Key Voicings */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest opacity-50 mb-3"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Key Voicings
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {levelProfile.primaryVoicings.map((v) => (
            <VoicingCard
              key={v.symbol}
              voicing={v}
              accentColor={keyColor}
              startC={voicingStartC}
              endC={voicingEndC}
            />
          ))}
        </div>
      </div>

      {/* Jump In */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => onStartActivity(selectedLevel, 'chords')}
          className="rounded-full px-6 py-2 text-sm font-semibold"
          style={{ background: keyColor, color: '#fff' }}
        >
          {levelProfile.entryLabel}
        </button>
      </div>
    </div>
  );
}

// ── Technique Tab ───────────────────────────────────────────────────────

const SECTION_LABELS: { key: TechniqueSection; label: string }[] = [
  { key: 'melody', label: 'Melody' },
  { key: 'chords', label: 'Chords' },
  { key: 'bass', label: 'Bass' },
  { key: 'performance', label: 'Performance' },
];

function TechniqueTab({
  profile,
  levelProfile,
  selectedLevel,
  onLevelChange,
  onStartActivity,
  keyColor,
}: {
  profile: GenreProfile;
  levelProfile: GenreLevelProfile;
  selectedLevel: LevelNum;
  onLevelChange: (level: LevelNum) => void;
  onStartActivity: (level: LevelNum, section: string) => void;
  keyColor: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Level pills */}
      <LevelPills
        selectedLevel={selectedLevel}
        onLevelChange={onLevelChange}
        accentColor={profile.accentColor}
        keyColor={keyColor}
      />

      {/* Section rows */}
      <div className="flex flex-col gap-3">
        {SECTION_LABELS.map(({ key, label }) => {
          const entry = levelProfile.technique[key];
          return (
            <div
              key={key}
              className="glass-panel-sm rounded-xl p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: keyColor }}
                  >
                    {label}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                    {entry.summary}
                  </p>
                  <ul className="flex flex-col gap-1 mt-1">
                    {entry.details.map((d, i) => (
                      <li
                        key={i}
                        className="text-xs"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onStartActivity(selectedLevel, key)}
                  className="shrink-0 rounded-lg px-3 py-1 text-xs"
                  style={{
                    border: '1px solid var(--color-accent)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Jump In &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Level Pills (shared) ────────────────────────────────────────────────

function LevelPills({
  selectedLevel,
  onLevelChange,
  accentColor,
  keyColor,
}: {
  selectedLevel: LevelNum;
  onLevelChange: (level: LevelNum) => void;
  accentColor: string;
  keyColor?: string;
}) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3] as LevelNum[]).map((lvl) => (
        <button
          key={lvl}
          type="button"
          onClick={() => onLevelChange(lvl)}
          className="rounded-full px-4 py-1 text-xs font-semibold"
          style={levelPillStyle(selectedLevel === lvl, keyColor ?? accentColor)}
        >
          L{lvl}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

type GenreCourseOverviewProps = {
  genreSlug: string;
};

export function GenreCourseOverview({ genreSlug }: GenreCourseOverviewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [selectedLevel, setSelectedLevel] = useState<LevelNum>(1);

  const profile = getGenreProfile(genreSlug);

  const levelProfile = useMemo<GenreLevelProfile | null>(() => {
    if (!profile) return null;
    return profile.levels[selectedLevel];
  }, [profile, selectedLevel]);

  const keyColor = useMemo(() => {
    if (!levelProfile) return profile?.accentColor ?? '#888';
    const root = levelProfile.keyCenter.split(' ')[0];
    const rawMode = levelProfile.mode.toLowerCase();
    // Minor Pentatonic → treat as Dorian for color (same relative-major relationship)
    const modeSlug = rawMode.includes('pentatonic') ? 'dorian' : rawMode;
    return colorForKeyMode(
      root,
      modeSlug as Parameters<typeof colorForKeyMode>[1],
    );
  }, [levelProfile, profile]);

  const handleStartActivity = useCallback(
    (level: LevelNum, section: string) => {
      const sectionId = TECHNIQUE_TO_SECTION[section] ?? 'A';
      navigate(
        CurriculumRoutes.genreLevel({
          genre: genreSlug,
          level: String(level),
        }) + `?section=${sectionId}`,
      );
    },
    [navigate, genreSlug],
  );

  if (!profile || !levelProfile) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Genre profile not found: {genreSlug}
      </div>
    );
  }

  return (
    <div
      className="learn-root flex flex-col gap-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeaderBar
        title={profile.displayName}
        onBack={() => navigate(-1)}
        showProfile={false}
      />

      {/* Tagline */}
      <p
        className="px-4 text-sm italic"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {profile.tagline}
      </p>

      {/* Tab bar */}
      <div className="flex gap-2 px-4">
        {(
          [
            { id: 'about', label: 'About' },
            { id: 'theory', label: 'Theory' },
            { id: 'technique', label: 'Technique' },
          ] as { id: TabId; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={tabStyle(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pb-8">
        {activeTab === 'about' && <AboutTab profile={profile} />}
        {activeTab === 'theory' && (
          <TheoryTab
            profile={profile}
            levelProfile={levelProfile}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            onStartActivity={handleStartActivity}
            keyColor={keyColor}
          />
        )}
        {activeTab === 'technique' && (
          <TechniqueTab
            profile={profile}
            levelProfile={levelProfile}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            onStartActivity={handleStartActivity}
            keyColor={keyColor}
          />
        )}
      </div>
    </div>
  );
}
