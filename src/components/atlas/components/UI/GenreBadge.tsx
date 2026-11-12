import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AtlasChip } from '@/components/atlas/components/UI/primitives';
import { learnSlugOf } from '@/components/atlas/utils/genreMapping';
import { LearnRoutes } from '@/constants/routes';

/**
 * A genre chip. When the genre maps to one of Learn's genre courses, it
 * becomes a button that opens that course; otherwise it's a plain label.
 * Shared by the DetailsCard event cards and the city header.
 */
export function GenreBadge({ genre }: { genre: string }) {
  const navigate = useNavigate();
  const learn = learnSlugOf(genre);

  if (learn) {
    return (
      <AtlasChip
        title={`Learn ${learn.title}`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(LearnRoutes.genreCourse({ genre: learn.slug }));
        }}
      >
        {genre}
        <ArrowUpRight aria-hidden className="size-3 text-atlas-text-2" />
      </AtlasChip>
    );
  }

  return <AtlasChip>{genre}</AtlasChip>;
}
