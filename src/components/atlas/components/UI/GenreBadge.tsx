import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AtlasChip } from '@/components/atlas/components/UI/primitives';
import { mapGenreToCourse } from '@/components/atlas/utils/genreMapping';

const NON_CURRICULUM_GENRES = [
  'Classical',
  'Film Scoring',
  'Musical Theatre',
  'Jingles',
];

/**
 * A genre chip. When the genre maps to a curriculum course, it becomes a button
 * that deep-links into Learn; otherwise it's a plain label. Shared by the
 * DetailsCard event cards and the city header.
 */
export function GenreBadge({ genre }: { genre: string }) {
  const navigate = useNavigate();
  const course = mapGenreToCourse(genre);

  if (course && !NON_CURRICULUM_GENRES.includes(course)) {
    return (
      <AtlasChip
        title={`Explore ${course} in Learn`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/learn?genre=${encodeURIComponent(course)}`);
        }}
      >
        {genre}
        <ArrowUpRight aria-hidden className="size-3 text-atlas-text-2" />
      </AtlasChip>
    );
  }

  return <AtlasChip>{genre}</AtlasChip>;
}
