import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PROMPT_FRAME,
  PROMPT_PILL,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { AtlasRoutes } from '@/constants/routes';
import type { GenreProfile } from '@/curriculum/types/genreProfile';
import { EYEBROW } from './genreOverviewShared';

/** A word about the genre, in a pill's shape; not a button. */
const TAG = 'border-white/10 bg-white/[0.03] text-white/60';

/** The genre: its history, its artists, where it branches, how it sounds. */
export function AboutPanel({ profile }: { profile: GenreProfile }) {
  return (
    <div data-genre-overview-panel="about" className="flex flex-col gap-4">
      <section
        className={cn(PROMPT_FRAME, PROMPT_WASH, 'flex flex-col gap-2 p-5')}
      >
        <h3 className={EYEBROW}>History</h3>
        <p className="whitespace-pre-line text-[15px] leading-6 text-white/70">
          {profile.history}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={EYEBROW}>Key Artists</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profile.primaryArtists.map((artist) => (
            <div
              key={artist.name}
              className={cn(
                PROMPT_FRAME,
                PROMPT_WASH,
                'flex flex-col gap-1 p-4',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base text-[#e8e8f0]">{artist.name}</p>
                {/* Opens the artist's globe card, where a featured hit plays. */}
                <Link
                  to={AtlasRoutes.globe(undefined, {
                    artist: artist.globeArtist ?? artist.name,
                  })}
                  aria-label={`${artist.name} on the Globe`}
                  title={`${artist.name} on the Globe`}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/55 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Globe aria-hidden className="size-4" />
                </Link>
              </div>
              <p className="text-sm text-white/55">
                {artist.era}
                {artist.role && ` · ${artist.role}`}
              </p>
              {artist.tracks && artist.tracks.length > 0 && (
                <p className="text-sm text-white/45">
                  {artist.tracks.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h3 className={EYEBROW}>Sub-genres</h3>
          <ul className="flex flex-wrap gap-2">
            {profile.subGenres.map((sg) => (
              <li key={sg} className={cn(PROMPT_PILL, TAG)}>
                {sg}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3">
          <h3 className={EYEBROW}>Crossover Genres</h3>
          <ul className="flex flex-wrap gap-2">
            {profile.crossoverGenres.map((cg) => (
              <li key={cg} className={cn(PROMPT_PILL, TAG)}>
                {cg}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        className={cn(PROMPT_FRAME, PROMPT_WASH, 'flex flex-col gap-2 p-5')}
      >
        <h3 className={EYEBROW}>Characteristics</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-white/30">
          {profile.characteristics.map((c) => (
            <li key={c} className="text-[15px] leading-6 text-white/70">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
