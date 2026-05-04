/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import type { FC } from 'react';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

interface SongCardProps {
  song: Song;
}

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'L1', 2: 'L2', 3: 'L3' };

export const SongCard: FC<SongCardProps> = ({ song }) => {
  const initials = song.artist
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      to={`/songs/${song.id}`}
      aria-label={`${song.title} by ${song.artist}, ${song.key}, ${song.genreTags[0] ?? ''}, Difficulty ${song.difficulty}`}
      className="group rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-white/50 outline-none block"
      style={{ background: 'rgba(26, 26, 26, 0.75)' }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(30,30,30,0.6)' }}>
        {song.artistImageRef ? (
          <img
            src={song.artistImageRef}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <HexAvatarSVG
            config={defaultAvatarConfig(song.genreTags[0] ?? song.artist)}
            circular={false}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={20} className="text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        {/* Initials fallback (behind HexAvatar) */}
        {!song.artistImageRef && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/20 font-bold" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{initials}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'clamp(0.5rem, 1vw, 0.875rem)' }}>
        <h3 className="font-semibold text-white truncate" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.9rem)' }}>
          {song.title}
        </h3>
        <p className="text-white/50 truncate" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.75rem)' }}>
          {song.artist}
        </p>
        <p className="text-white/30 tabular-nums" style={{ fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)', marginTop: 'clamp(0.15rem, 0.3vw, 0.25rem)' }}>
          {song.key} · {song.tempo} BPM
        </p>
        {/* Chips */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {song.genreTags.slice(0, 1).map((g) => (
            <span key={g} className="rounded-full text-white/50" style={{ padding: '1px clamp(0.3rem, 0.5vw, 0.4rem)', fontSize: 'clamp(0.4rem, 0.6vw, 0.5rem)', background: 'rgba(255,255,255,0.06)' }}>
              {g}
            </span>
          ))}
          <span className="rounded-full text-white/50" style={{ padding: '1px clamp(0.3rem, 0.5vw, 0.4rem)', fontSize: 'clamp(0.4rem, 0.6vw, 0.5rem)', background: 'rgba(255,255,255,0.06)' }}>
            {DIFFICULTY_LABEL[song.difficulty] ?? `L${song.difficulty}`}
          </span>
        </div>
      </div>
    </Link>
  );
};
