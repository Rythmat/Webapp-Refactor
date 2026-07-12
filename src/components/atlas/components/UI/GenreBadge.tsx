import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
      <button
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        title={`Explore ${course} in Learn`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/learn?genre=${encodeURIComponent(course)}`);
        }}
      >
        {genre}
        <ArrowUpRight className="size-2.5 opacity-60" />
      </button>
    );
  }

  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
      {genre}
    </span>
  );
}
