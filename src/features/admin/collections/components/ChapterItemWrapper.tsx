import { Edit, MoreVertical, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useChapter } from '@/hooks/data';
import { ChapterItem } from './ChapterItem';

// Wrapper component to fetch chapter data
interface ChapterItemWrapperProps {
  chapterId: string;
  index: number;
  moveChapter: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  onEdit: (chapterId: string) => void;
  onRemove: (id: string, name: string) => void;
}

export const ChapterItemWrapper = ({
  chapterId,
  index,
  moveChapter,
  onDrop,
  onEdit,
  onRemove,
}: ChapterItemWrapperProps) => {
  const { data: chapterData, isLoading } = useChapter(chapterId);

  if (isLoading || !chapterData) {
    return (
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center">
            <Skeleton className="mr-4 size-6" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ChapterItem
      chapter={{
        id: chapterData.id,
        name: chapterData.name,
        description: chapterData.description,
        color: chapterData.color,
      }}
      id={chapterId}
      index={index}
      moveChapter={moveChapter}
      pageCount={chapterData.pages.length}
      renderActions={() => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(chapterData.id)}
          >
            <Edit className="mr-2 size-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove(chapterId, chapterData.name)}
              >
                <Trash className="mr-2 size-4" />
                Remove from Collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      onDrop={onDrop}
    />
  );
};
