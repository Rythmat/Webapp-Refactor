import { Grip, FileText } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface ChapterItemProps {
  id: string;
  index: number;
  chapter: {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
  };
  pageCount: number;
  moveChapter: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  renderActions: () => React.ReactNode;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export const ChapterItem = ({
  id,
  index,
  chapter,
  pageCount,
  moveChapter,
  onDrop,
  renderActions,
}: ChapterItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [{ handlerId, isOver, canDrop }, drop] = useDrop({
    accept: 'chapter',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      };
    },
    hover(item: unknown, monitor) {
      if (!ref.current) {
        return;
      }

      const dragItem = item as DragItem;
      const dragIndex = dragItem.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Only update the UI during hover, don't call the API
      moveChapter(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      dragItem.index = hoverIndex;
    },
    drop() {
      // Call the API to update the order on drop
      onDrop();
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'chapter',
    item: () => {
      return { id, index, type: 'chapter' };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_, monitor) => {
      if (!monitor.didDrop()) {
        // Handle case when item was not dropped in a valid target
        return;
      }
      // The drop was handled in the drop callback of useDrop
    },
  });

  // Apply drag handle to grip and drop to card
  useEffect(() => {
    if (ref.current && cardRef.current) {
      preview(cardRef.current);
      drag(ref.current);
    }
  }, [drag, preview]);

  // Setup drop target
  drop(cardRef);

  const borderLeftStyle = chapter.color
    ? { borderLeftColor: chapter.color, borderLeftWidth: '4px' }
    : {};

  // Apply visual indicator when item is being dragged over
  const dropIndicatorClass =
    isOver && canDrop ? 'ring-2 ring-primary ring-offset-2' : '';

  // Apply drag preview styles
  const dragPreviewClass = isDragging
    ? 'opacity-40 shadow-lg scale-[0.98] rotate-1 z-50'
    : '';

  return (
    <div className="relative">
      {isOver && canDrop && (
        <div className="absolute inset-x-0 -top-3 h-6 rounded-md bg-primary/10" />
      )}
      <Card
        ref={cardRef}
        className={`transition-all hover:shadow-md ${dropIndicatorClass} ${dragPreviewClass}`}
        style={{
          ...borderLeftStyle,
        }}
      >
        <CardHeader className="flex-row items-center p-4">
          <div
            ref={ref}
            className="mr-2 cursor-move rounded-md p-2 hover:bg-muted"
            data-handler-id={handlerId}
          >
            <Grip className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{chapter.name}</CardTitle>
            {chapter.description && (
              <CardDescription className="line-clamp-1">
                {chapter.description}
              </CardDescription>
            )}
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="size-3" />
              <span>
                {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </span>
            </div>
          </div>
          <div className="ml-auto">{renderActions()}</div>
        </CardHeader>
      </Card>
      {isOver && canDrop && (
        <div className="absolute inset-x-0 -bottom-3 h-6 rounded-md bg-primary/10" />
      )}
    </div>
  );
};
