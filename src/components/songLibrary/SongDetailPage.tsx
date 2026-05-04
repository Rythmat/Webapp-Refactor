/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSong } from '@/curriculum/data/songs';
import { ChordChart } from './ChordChart';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';

export const SongDetailPage: FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const song = songId ? getSong(songId) : null;

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-white/40 text-lg">Song not found</p>
        <button
          onClick={() => navigate('/songs')}
          className="mt-4 rounded-full px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          Back to Song Library
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-bg, #191919)' }}
    >
      <HeaderBar
        title={song.title}
        subtitle={song.artist}
        onBack={() => navigate('/songs')}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 pb-4">
        <ChordChart song={song} />
      </div>
    </div>
  );
};
