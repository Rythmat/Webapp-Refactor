import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { AtlasRoutes, SongRoutes } from '@/constants/routes';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { getSong } from '@/content/songStore';
import {
  CANONICAL_ANNUAL_TEMPLATE,
  type UnitTemplate,
} from '@/features/classroom/annual/curriculumTemplate';
import { seededDayFromStub } from '@/features/classroom/annual/stubMaterialization';
import { DeckPreview } from '@/features/classroom/slides/wizard/DeckPreview';

/**
 * Teach, as the Music Atlas curriculum: the canonical year's units, each
 * unit's days, and each day's slides exactly as they would project.
 *
 * This is not a copy of the teacher's own planning screens — those show one
 * teacher's plan, stored per teacher. It shows what Music Atlas ships to every
 * teacher, rendered through the same path a teacher's day takes
 * (`seededDayFromStub` → `DeckPreview`, which publishes the day and draws the
 * projector surface). Songs and globe events link into the mirror.
 */

const SEMESTERS = [
  CANONICAL_ANNUAL_TEMPLATE.autumn,
  CANONICAL_ANNUAL_TEMPLATE.spring,
];

const allUnits = (): UnitTemplate[] => SEMESTERS.flatMap((s) => s.units);

const unitFocus = (unit: UnitTemplate) =>
  [unit.kind, unit.focusGenre, unit.focusLocation, unit.focusEra]
    .filter(Boolean)
    .join(' · ');

export const TeachMirror = () => {
  const [params, setParams] = useSearchParams();
  const units = useMemo(allUnits, []);
  const unit = units.find((u) => u.slug === params.get('unit')) ?? units[0];
  const stub =
    unit?.dayStubs.find((d) => d.slug === params.get('day')) ??
    unit?.dayStubs[0];
  const day = useMemo(() => (stub ? seededDayFromStub(stub) : null), [stub]);

  const select = (next: { unit?: string; day?: string }) => {
    const p = new URLSearchParams(params);
    if (next.unit !== undefined) {
      p.set('unit', next.unit);
      p.delete('day');
    }
    if (next.day !== undefined) p.set('day', next.day);
    setParams(p);
  };

  return (
    <div className="flex h-full min-h-0 gap-6 px-6 py-6 md:px-10">
      <nav
        aria-label="Units"
        className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40">Teach</p>
          <h1 className="text-xl text-white">
            {CANONICAL_ANNUAL_TEMPLATE.label}
          </h1>
        </div>
        {SEMESTERS.map((semester) => (
          <div key={semester.semester} className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-white/40">
              {semester.label}
            </p>
            {semester.units.map((u) => (
              <button
                key={u.slug}
                type="button"
                onClick={() => select({ unit: u.slug })}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  u.slug === unit?.slug
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <span className="block">{u.label}</span>
                <span className="block text-xs text-white/40">
                  {u.dayStubs.length} days
                  {unitFocus(u) ? ` · ${unitFocus(u)}` : ''}
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {unit && (
        <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <header>
            <h2 className="text-2xl text-white">{unit.label}</h2>
            {unitFocus(unit) && (
              <p className="text-sm text-white/50">{unitFocus(unit)}</p>
            )}
          </header>

          <div className="flex flex-wrap gap-2">
            {unit.dayStubs.map((d, i) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => select({ day: d.slug })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  d.slug === stub?.slug
                    ? 'border-white bg-white text-[#101012]'
                    : 'border-white/15 text-white/70 hover:border-white/30',
                )}
              >
                Day {i + 1}
              </button>
            ))}
          </div>

          {stub && day && (
            <div className="flex flex-col gap-3">
              <h3 className="text-lg text-white">{stub.label}</h3>
              <DayLinks songId={stub.songId} eventIds={stub.globeEventIds} />
              <DeckPreview key={stub.slug} day={day} />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

/** The day's song and globe events, as links into the mirror. */
const DayLinks = ({
  songId,
  eventIds = [],
}: {
  songId?: string;
  eventIds?: string[];
}) => {
  const song = songId ? getSong(songId) : null;
  if (!songId && eventIds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {songId && (
        <Link
          to={SongRoutes.song({ songId })}
          className="rounded-full border border-white/15 px-2.5 py-1 text-white/75 hover:border-white/30"
        >
          Song: {song ? `${song.title} — ${song.artist}` : songId}
        </Link>
      )}
      {eventIds.map((id) => {
        const event = MUSIC_HISTORY.find((e) => e.id === id);
        return (
          <Link
            key={id}
            to={`${AtlasRoutes.globe()}?event=${encodeURIComponent(id)}`}
            title={id}
            className="rounded-full border border-white/10 px-2.5 py-1 text-white/55 hover:border-white/30"
          >
            {event ? `${event.year} · ${event.title}` : `Event: ${id}`}
          </Link>
        );
      })}
    </div>
  );
};
