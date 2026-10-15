import { ArrowUpRight, AudioLines } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CurriculumRoutes, SongRoutes } from '@/constants/routes';
import { canonicalGenre } from '@/content/flowStore';
import {
  type HarmonyMatch,
  type HarmonySource,
  PLACEMENT_TEXT,
  TIER_TEXT,
  isStrongMatch,
  songUses,
} from '@/content/harmony';
import { CURRICULUM_GENRE_SLUGS } from '@/curriculum/bridge/genreIdMap';
import { studioProgressionUrl } from '@/features/songs/studioSongUrl';
import { useHarmonyIndex } from '../../content/chords/useHarmonyIndex';
import { tableHref } from '../tablePaths';
import { Capped } from './PanelConnections';
import { PanelSection } from './PanelSection';

/**
 * Where a progression is heard, by its chords — or, on a song's row, the
 * library progressions its chart plays (`content/harmony`).
 *
 * What the chords say, beside what a person linked: a song the progression
 * already links is marked "linked"; the rest are for a person to look at.
 * Strong matches first (the section is built on it, or plays it as a
 * phrase); the passing and loose ones are a click away.
 */

const SLUG_BY_CANONICAL = new Map(
  Object.values(CURRICULUM_GENRE_SLUGS).map((slug) => [
    canonicalGenre(slug),
    slug,
  ]),
);

/** The genre lesson a lesson match opens: its level, at its section. */
function lessonHref(source: HarmonySource): string | null {
  if (source.kind === 'activity') {
    const genre = SLUG_BY_CANONICAL.get(canonicalGenre(source.genre));
    if (!genre) return null;
    const href = CurriculumRoutes.genreLevel({
      genre,
      level: String(source.level),
    });
    return source.section ? `${href}?section=${source.section}` : href;
  }
  if (source.kind === 'curriculum') {
    const genre =
      CURRICULUM_GENRE_SLUGS[
        source.genre as keyof typeof CURRICULUM_GENRE_SLUGS
      ];
    if (!genre) return null;
    return CurriculumRoutes.genreLevel({
      genre,
      level: source.level.replace(/^L/i, ''),
    });
  }
  return null;
}

const bars = (m: HarmonyMatch) =>
  m.endBar > m.startBar
    ? `bars ${m.startBar + 1}–${m.endBar + 1}`
    : `bar ${m.startBar + 1}`;

/** How a match is heard, in words: "looped ×4, same chord families". */
export function howHeard(m: HarmonyMatch): string {
  const parts = [
    PLACEMENT_TEXT[m.placement] + (m.cycles > 1 ? ` ×${m.cycles}` : ''),
    TIER_TEXT[m.tier],
  ];
  if (m.relative) parts.push('read from the relative major');
  return parts.join(', ');
}

const Toggle = ({
  all,
  hidden,
  onChange,
}: {
  all: boolean;
  hidden: number;
  onChange(all: boolean): void;
}) =>
  hidden > 0 || all ? (
    <button
      type="button"
      onClick={() => onChange(!all)}
      className="text-xs text-white/55 hover:text-white hover:underline"
      aria-pressed={all}
    >
      {all ? 'Strong matches only' : `Also passing and loose · ${hidden}`}
    </button>
  ) : null;

/** The progression as a new Studio project, in the key it was heard in. */
function studioHref(m: HarmonyMatch): string {
  const s = m.source;
  return studioProgressionUrl(m.progressionId, {
    ...(s.kind === 'song'
      ? { key: s.key, songId: s.songId, section: s.sectionLabel }
      : s.kind === 'activity'
        ? { key: s.key }
        : {}),
    ...(m.relative ? { relative: true } : {}),
  });
}

/**
 * Copies the Studio link that opens it as a new project. A copy, not a
 * link: the console mirrors the app, and the mirror does not open the
 * Studio's editor (a student's own project), so an admin following it would
 * land on "not shown in the console". Pasted into a teacher's or a
 * student's session, it opens.
 */
async function copyStudioLink(href: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    toast.success('Studio link copied: it opens for a teacher or a student');
  } catch {
    toast.error('Could not copy the Studio link');
  }
}

const StudioLink = ({ href, label }: { href: string; label: string }) => (
  <button
    type="button"
    onClick={() => void copyStudioLink(href)}
    aria-label={label}
    title={label}
    className="shrink-0 text-white/35 hover:text-white"
  >
    <AudioLines aria-hidden className="size-3.5" />
  </button>
);

const Line = ({ m }: { m: HarmonyMatch }) => (
  <p className="text-xs text-white/50">
    {howHeard(m)} ·{' '}
    <span className="text-white/65">{m.labels.join(' – ')}</span>
  </p>
);

/** A progression's row: the songs and lessons that play it. */
export const ProgressionHeardIn = ({
  progressionId,
  linked,
}: {
  progressionId: number;
  /** The songs the progression links (`songIds`). */
  linked: readonly string[];
}) => {
  const index = useHarmonyIndex();
  const [all, setAll] = useState(false);
  const matches = useMemo(
    () => index?.byProgression.get(progressionId) ?? [],
    [index, progressionId],
  );
  const songs = useMemo(() => songUses(matches), [matches]);
  const strong = useMemo(
    () => songs.filter((use) => isStrongMatch(use.best)),
    [songs],
  );
  const lessons = matches.filter(
    (m) => m.source.kind !== 'song' && (all || isStrongMatch(m)),
  );
  const shown = all ? songs : strong;

  if (!index)
    return (
      <PanelSection title="Heard in">
        <p className="text-sm text-white/45">Reading the charts…</p>
      </PanelSection>
    );

  return (
    <PanelSection
      title="Heard in"
      count={strong.length}
      note="By its chords, in the charts and lessons"
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void copyStudioLink(studioProgressionUrl(progressionId))
            }
            title="Copy the link that opens it in the Studio, in C"
            className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white hover:underline"
          >
            <AudioLines aria-hidden className="size-3.5" />
            Copy Studio link
          </button>
          <Toggle
            all={all}
            hidden={songs.length - strong.length}
            onChange={setAll}
          />
        </div>
      }
    >
      {shown.length === 0 && lessons.length === 0 ? (
        <p className="text-sm text-white/45">
          {songs.length
            ? 'No song plays it squarely; it passes through some.'
            : 'No chart or lesson plays it.'}
        </p>
      ) : null}
      {shown.length > 0 && (
        <Capped
          className="flex flex-col gap-2"
          items={shown}
          render={(use) => (
            <li key={use.songId} className="flex flex-col gap-0.5">
              <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
                <Link
                  to={tableHref('songs', use.songId)}
                  className="min-w-0 truncate text-white/90 hover:underline"
                >
                  {use.title}
                </Link>
                <span className="min-w-0 truncate text-white/45">
                  {use.artist}
                </span>
                {linked.includes(use.songId) && (
                  <span className="shrink-0 rounded-full bg-emerald-400/10 px-1.5 text-[11px] text-emerald-200/90">
                    linked
                  </span>
                )}
                <Link
                  to={SongRoutes.song({ songId: use.songId })}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${use.title}: open the chart`}
                  title="Open the chart"
                  className="shrink-0 text-white/35 hover:text-white"
                >
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
                <StudioLink
                  href={studioHref(use.best)}
                  label={`Copy the Studio link, in the key of ${use.title}`}
                />
              </div>
              <p className="text-xs text-white/60">
                {use.best.source.kind === 'song' &&
                  `${use.best.source.sectionLabel}, ${bars(use.best)}`}
                {use.matches.length > 1 &&
                  ` · and ${use.matches.length - 1} more place${use.matches.length > 2 ? 's' : ''}`}
              </p>
              <Line m={use.best} />
            </li>
          )}
        />
      )}
      {lessons.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="mt-1 text-xs text-white/45">Genre lessons</p>
          <ul className="flex flex-col gap-2">
            {lessons.map((m, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <LessonLink m={m} />
                  <StudioLink
                    href={studioHref(m)}
                    label="Copy the Studio link, in the lesson’s key"
                  />
                </div>
                <Line m={m} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelSection>
  );
};

const LessonLink = ({ m }: { m: HarmonyMatch }) => {
  const href = lessonHref(m.source);
  const s = m.source;
  const text =
    s.kind === 'activity'
      ? `${s.genre} L${s.level}${s.section ? ` · ${s.section}` : ''} · ${s.activity}`
      : s.kind === 'curriculum'
        ? `${s.genre} ${s.level} · curriculum map: ${s.text}`
        : '';
  return href ? (
    <Link
      to={href}
      target="_blank"
      rel="noreferrer"
      className="truncate text-sm text-white/90 hover:underline"
    >
      {text}
    </Link>
  ) : (
    <span className="truncate text-sm text-white/90">{text}</span>
  );
};

/** A song's row: the library progressions its chart plays. */
export const SongProgressions = ({
  songId,
  labelOf,
}: {
  songId: string;
  /** A progression's chords, as the graph names it. */
  labelOf(id: number): string | undefined;
}) => {
  const index = useHarmonyIndex();
  const [all, setAll] = useState(false);
  const { strong, every } = useMemo(() => {
    const matches = index?.bySong.get(songId) ?? [];
    // One entry per progression: its strongest place in the song.
    const best = new Map<number, HarmonyMatch>();
    for (const m of matches)
      if (!best.has(m.progressionId)) best.set(m.progressionId, m);
    const every = [...best.values()];
    return { strong: every.filter(isStrongMatch), every };
  }, [index, songId]);
  const shown = all ? every : strong;
  if (!index) return null;

  return (
    <PanelSection
      title="Progressions heard"
      count={strong.length}
      note="Library progressions its chart plays"
      actions={
        <Toggle
          all={all}
          hidden={every.length - strong.length}
          onChange={setAll}
        />
      }
    >
      {shown.length === 0 ? (
        <p className="text-sm text-white/45">
          {every.length
            ? 'None squarely; some pass through.'
            : 'The chart plays no library progression.'}
        </p>
      ) : (
        <Capped
          className="flex flex-col gap-2"
          items={shown}
          render={(m) => (
            <li key={m.progressionId} className="flex flex-col gap-0.5">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <Link
                  to={tableHref('progressions', String(m.progressionId))}
                  className="truncate text-sm text-white/90 hover:underline"
                >
                  {labelOf(m.progressionId) ?? `#${m.progressionId}`}
                </Link>
                <StudioLink
                  href={studioHref(m)}
                  label="Copy the Studio link, in this song’s key"
                />
              </div>
              <p className="text-xs text-white/60">
                {m.source.kind === 'song' &&
                  `${m.source.sectionLabel}, ${bars(m)}`}
              </p>
              <Line m={m} />
            </li>
          )}
        />
      )}
    </PanelSection>
  );
};
