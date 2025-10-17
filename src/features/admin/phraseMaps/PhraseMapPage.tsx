import { useParams } from 'react-router-dom';
import { ErrorBox } from '@/components/ErrorBox';
import { Skeleton } from '@/components/ui/skeleton';
import { usePhraseMap } from '@/hooks/data';
import { PhraseMapEditor } from './components/PhraseMapEditor';

export const PhraseMapPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: phraseMap, isLoading, error } = usePhraseMap(id || '');

  if (!id) {
    return (
      <div className="flex h-64 items-center justify-center">
        <ErrorBox message="No rhythm map ID provided" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !phraseMap) {
    return (
      <div className="flex h-64 items-center justify-center">
        <ErrorBox message="Error loading rhythm map. Please try again." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-bottom rounded-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{phraseMap.label}</h1>
          <p className="text-muted-foreground">
            Edit and manage your rhythm map
          </p>
        </div>
      </div>

      <PhraseMapEditor id={id} />
    </div>
  );
};
