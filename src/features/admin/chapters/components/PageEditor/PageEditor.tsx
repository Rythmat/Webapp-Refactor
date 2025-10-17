import { debounce } from 'lodash';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/components/utilities';
import { GetPagesByIdData } from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { useUpdatePage } from '@/hooks/data';
import { PageEditorPane } from './PageEditorPane';
import { PageViewer } from './PageViewer';

interface PageEditorProps {
  page: GetPagesByIdData;
  chapterColor: string | null;
  className?: string;
}

export const PageEditor = ({
  page,
  chapterColor,
  className,
}: PageEditorProps) => {
  const [name, setName] = useState(page.name || '');
  // const [description, setDescription] = useState(page.description || '');
  const [content, setContent] = useState(page.content || '');
  const [color, setColor] = useState<string | null>(page.color || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const updatePage = useUpdatePage();

  // Use useRef to store the debounced function to prevent recreating it on every render
  const saveChapterRef = useRef<ReturnType<typeof debounce>>();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false);

  // Initialize the debounced save function only once
  useEffect(() => {
    saveChapterRef.current = debounce(async () => {
      try {
        await updatePage.mutateAsync({
          id: page.id,
          name,
          // description,
          content,
          color,
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save chapter:', error);
      }
    }, 2000);

    // Clean up the debounced function when component unmounts
    return () => {
      saveChapterRef.current?.cancel();
    };
  }, [page.id, color, content, updatePage, name]);

  // Trigger the debounced save when content changes
  useEffect(() => {
    // Only trigger save if content has been initialized
    if (saveChapterRef.current) {
      saveChapterRef.current();
    }
  }, [content, color, name]);

  // Handle scroll synchronization
  const syncScroll = useCallback(
    (source: 'editor' | 'viewer', element: HTMLDivElement) => {
      if (isScrollingSyncRef.current) return;
      isScrollingSyncRef.current = true;

      const targetElement =
        source === 'editor' ? viewerRef.current : editorRef.current;

      if (element && targetElement) {
        const sourceScrollPercentage =
          element.scrollTop / (element.scrollHeight - element.clientHeight);
        const targetScrollPosition =
          sourceScrollPercentage *
          (targetElement.scrollHeight - targetElement.clientHeight);

        targetElement.scrollTo({
          top: targetScrollPosition,
          behavior: 'smooth',
        });
      }

      // Reset the flag after a short delay to prevent scroll event loops
      setTimeout(() => {
        isScrollingSyncRef.current = false;
      }, 1000);
    },
    [],
  );

  // Create debounced scroll handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSyncScroll = useCallback(
    debounce((source: 'editor' | 'viewer', element: HTMLDivElement) => {
      syncScroll(source, element);
    }, 150),
    [syncScroll],
  );

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedSyncScroll.cancel();
    };
  }, [debouncedSyncScroll]);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Editor Column */}
      <PageEditorPane
        ref={editorRef}
        color={color}
        content={content}
        isSaving={updatePage.isPending}
        lastSaved={lastSaved}
        name={name}
        setColor={setColor}
        setContent={setContent}
        setName={setName}
        onScroll={(event) =>
          debouncedSyncScroll('editor', event.target as HTMLDivElement)
        }
      />

      {/* Preview Column */}
      <PageViewer
        ref={viewerRef}
        chapterColor={chapterColor}
        color={color || null}
        content={content}
        name={name}
        onScroll={(event) =>
          debouncedSyncScroll('viewer', event.target as HTMLDivElement)
        }
      />
    </div>
  );
};
