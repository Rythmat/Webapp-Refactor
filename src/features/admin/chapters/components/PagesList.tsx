import { MoreHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { usePages, useReorderPages } from '@/hooks/data';
import { PageItem } from './PageItem';

interface PagesListProps {
  chapterId: string;
  color?: string | null;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  renderActions?: (page: {
    id: string;
    content: string;
    order: number;
    color?: string | null;
  }) => React.ReactNode;
}

export const PagesList = ({
  chapterId,
  color,
  selectedPageId,
  onSelectPage,
  renderActions,
}: PagesListProps) => {
  const { data: pages = [], isLoading, isFetching } = usePages({ chapterId });
  const reorderPages = useReorderPages();

  const sortedPages = useMemo(() => {
    return pages.sort((a, b) => a.order - b.order);
  }, [pages]);

  const handleMovePageUp = (pageIndex: number) => {
    if (pageIndex === 0) return;

    const newOrder = [...sortedPages];
    const currentPage = newOrder[pageIndex];
    const previousPage = newOrder[pageIndex - 1];

    // Swap the pages
    newOrder[pageIndex] = previousPage;
    newOrder[pageIndex - 1] = currentPage;

    // Update the order property
    const updatedPages = newOrder.map((page, index) => ({
      id: page.id,
      order: index,
    }));

    // Call API to update order
    reorderPages.mutateAsync({
      chapterId,
      pageOrders: updatedPages,
    });
  };

  const handleMovePageDown = (pageIndex: number) => {
    if (pageIndex === sortedPages.length - 1) return;

    const newOrder = [...sortedPages];
    const currentPage = newOrder[pageIndex];
    const nextPage = newOrder[pageIndex + 1];

    // Swap the pages
    newOrder[pageIndex] = nextPage;
    newOrder[pageIndex + 1] = currentPage;

    // Update the order property
    const updatedPages = newOrder.map((page, index) => ({
      id: page.id,
      order: index,
    }));

    // Call API to update order
    reorderPages.mutate({
      chapterId,
      pageOrders: updatedPages,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!sortedPages.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No pages in this chapter yet.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sortedPages.map((page, index) => (
        <PageItem
          key={page.id}
          canMove={!reorderPages.isPending || isFetching}
          canMoveDown={index < sortedPages.length - 1}
          canMoveUp={index > 0}
          isSelected={page.id === selectedPageId}
          page={page}
          parentColor={color}
          renderActions={() =>
            renderActions ? (
              renderActions(page)
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="size-7"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPage(page.id);
                    }}
                  >
                    Edit Page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
          onMoveDown={() => handleMovePageDown(index)}
          onMoveUp={() => handleMovePageUp(index)}
          onSelect={() => onSelectPage(page.id)}
        />
      ))}
    </div>
  );
};
