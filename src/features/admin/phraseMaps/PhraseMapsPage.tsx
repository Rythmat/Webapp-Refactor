import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RhythmIcon } from '@/components/ui/icons/rhythm-icon';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { usePhraseMaps } from '@/hooks/data';
import { CreatePhraseMapModal } from './components/CreatePhraseMapModal';
import { PhraseMapList } from './components/PhraseMapList';

export const PhraseMapsPage = () => {
  const { setTitle } = useNavigationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePhraseMaps({ pageSize: 20 });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage || !hasNextPage) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  useEffect(() => {
    setTitle('Rhythm Maps');
  }, [setTitle]);

  // Clean up the observer when the component unmounts
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Flatten all phrase maps from all pages and filter by search term
  const allPhraseMaps = useMemo(() => {
    const maps = data?.pages.flatMap((page) => page.data) || [];
    if (!debouncedSearchTerm) return maps;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return maps.filter(
      (map) =>
        map.label?.toLowerCase().includes(searchLower) ||
        map.description?.toLowerCase().includes(searchLower),
    );
  }, [data?.pages, debouncedSearchTerm]);

  const isEmpty = allPhraseMaps.length === 0;

  return (
    <div className="animate-fade-in-bottom rounded-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rhythm Maps</h1>
          <p className="text-muted-foreground">
            View and manage all rhythm maps in the system
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 rounded-full pl-9"
              placeholder="Search rhythm maps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <CreatePhraseMapModal>
            <Button>Create Rhythm Map</Button>
          </CreatePhraseMapModal>
        </div>
      </div>

      <PhraseMapList
        error={error}
        isLoading={isLoading}
        phraseMaps={allPhraseMaps}
      />

      {isEmpty && !isLoading && !error && searchTerm && (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="text-muted-foreground">No rhythm maps found</div>
        </div>
      )}

      {isEmpty && !isLoading && !error && !searchTerm && (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-2 rounded-full bg-black p-4">
              <RhythmIcon className="size-10 text-muted-foreground" />
            </div>
            <p className="text-3xl text-white">No rhythm maps yet</p>
            <p className="text-muted-foreground">
              Fire up the synths and add your first groove.
            </p>
            <CreatePhraseMapModal>
              <Button className="mt-5">Create my rhythm map</Button>
            </CreatePhraseMapModal>
          </div>
        </div>
      )}

      {/* Load more trigger element */}
      <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
        {isFetchingNextPage ? (
          <div className="text-muted-foreground">Loading more...</div>
        ) : hasNextPage ? (
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Load More
          </Button>
        ) : (
          !isEmpty && (
            <div className="text-muted-foreground">No more rhythm maps</div>
          )
        )}
      </div>
    </div>
  );
};
