import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChaptersIcon } from '@/components/ui/icons/chapters-icon';
import { Input } from '@/components/ui/input';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { useChapters } from '@/hooks/data';
import { ChapterList } from './components/ChapterList';
import { CreateChapterModal } from './components/CreateChapterModal';

export const ChaptersPage = () => {
  const { setTitle } = useNavigationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const { data: chapters = [], isLoading } = useChapters();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setTitle('Chapters');
  }, [setTitle]);

  const filteredChapters = chapters.filter((chapter) =>
    chapter.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  );

  const isEmpty = filteredChapters.length === 0 && !isLoading;

  return (
    <div className="animate-fade-in-bottom rounded-xl bg-surface-box">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chapters</h1>
          <p className="text-muted-foreground">
            View and manage all chapters in the system
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 rounded-full pl-9"
              placeholder="Search chapters"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <CreateChapterModal>
            <Button>Create Chapter</Button>
          </CreateChapterModal>
        </div>
      </div>

      <ChapterList chapters={filteredChapters} isLoading={isLoading} />

      {isEmpty && (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="mb-2 rounded-full bg-black p-4">
            <ChaptersIcon className="size-10 text-muted-foreground" />
          </div>
          <p className="text-3xl text-white">No chapters yet</p>
          <p className="text-muted-foreground">
            Your symphony has no movements. Time to compose the opening lines.
          </p>

          <CreateChapterModal>
            <Button>Create your first chapter</Button>
          </CreateChapterModal>
        </div>
      )}
    </div>
  );
};
