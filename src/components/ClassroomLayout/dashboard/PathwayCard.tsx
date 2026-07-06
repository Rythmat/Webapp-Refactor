import { Link } from 'react-router-dom';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

interface PathwayCardProps {
  title: string;
  route: string;
  seed: string;
  paletteIndex?: number;
  image?: string;
}

export const PathwayCard = ({
  title,
  route,
  seed,
  paletteIndex,
  image,
}: PathwayCardProps) => {
  const config = {
    ...defaultAvatarConfig(seed),
    ...(paletteIndex !== undefined ? { paletteIndex } : {}),
  };

  return (
    <Link
      to={route}
      aria-label={`Open ${title} pathway`}
      className="group relative flex aspect-[3/4] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-transform hover:-translate-y-px hover:border-white/15"
    >
      <div className="relative z-10 m-3 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm md:m-4 md:rounded-xl">
        <div className="text-base font-medium text-white md:text-xl">
          {title}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 -z-0">
        {image ? (
          <img
            src={image}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <HexAvatarSVG
            config={config}
            size={512}
            circular={false}
            className="h-full w-full"
          />
        )}
      </div>
    </Link>
  );
};
