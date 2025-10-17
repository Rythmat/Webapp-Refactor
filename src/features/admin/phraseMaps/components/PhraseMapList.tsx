import { ErrorBox } from '@/components/ErrorBox';
import { Skeleton } from '@/components/ui/skeleton';
import { PhraseMaps } from '@/hooks/data';
import { PhraseMapCard } from './PhraseMapCard';

type PhraseMapListProps = {
  isLoading: boolean;
  phraseMaps: Array<PhraseMaps[number]>;
  error?: Error | null;
};

export const PhraseMapList = ({
  isLoading,
  phraseMaps,
  error,
}: PhraseMapListProps) => {
  return (
    <div className="space-y-4">
      {error && (
        <ErrorBox message="Error loading rhythm maps. Please try again." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))
          : phraseMaps.map((phraseMap) => (
              <PhraseMapCard key={phraseMap.id} phraseMapId={phraseMap.id} />
            ))}
      </div>
    </div>
  );
};
