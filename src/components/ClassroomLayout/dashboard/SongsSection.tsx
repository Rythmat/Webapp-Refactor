import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SongsMarquee } from '@/components/songLibrary/SongsMarquee';
import { SongRoutes } from '@/constants/routes';

export const SongsSection = () => {
  return (
    <section aria-label="Songs" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="/icons/popular-releases-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <h2 className="text-xl font-medium text-white md:text-2xl">Songs</h2>
        </div>
        <Link
          to={SongRoutes.root()}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
        >
          <span>View All Songs</span>
          <Plus className="h-5 w-5" />
        </Link>
      </div>
      <SongsMarquee />
    </section>
  );
};
