import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';

interface PageItemProps {
  page: {
    id: string;
    name: string | null;
    content: string;
    order: number;
    color?: string | null;
  };
  parentColor?: string | null;
  isSelected: boolean;
  canMove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  renderActions: () => React.ReactNode;
}

export const PageItem = ({
  page,
  parentColor,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canMove,
  onSelect,
  renderActions,
}: PageItemProps) => {
  // Parse the first heading from markdown content or use a fallback
  const title = page.name || `Untitled Page ${page.order + 1}`;
  const isUntitled = !page.name;

  // Get a preview of content (first paragraph after the title)
  const previewContent = page.content
    .replace(/^#\s+(.+)$/m, '') // Remove title
    .trim()
    .split('\n\n')[0] // Get first paragraph
    .slice(0, 100); // Limit length

  // Color styling
  const borderLeftStyle = page.color
    ? { borderLeftColor: page.color, borderLeftWidth: '3px' }
    : parentColor
      ? { borderLeftColor: parentColor, borderLeftWidth: '3px' }
      : {};

  return (
    <div
      className={cn(
        'flex items-center rounded-md border transition-all p-2 select-none bg-shade-4/40',
      )}
      style={borderLeftStyle}
      onClick={onSelect}
    >
      <div className="mr-2 flex flex-col gap-1">
        <Button
          className="size-5"
          disabled={!canMoveUp || !canMove}
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
        >
          <ChevronUp className="size-3" />
        </Button>
        <Button
          className="size-5"
          disabled={!canMoveDown || !canMove}
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
        >
          <ChevronDown className="size-3" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-medium',
            isUntitled && 'text-stone-500',
          )}
        >
          {title}
        </div>
        {previewContent && (
          <div className="truncate text-xs text-muted-foreground">
            {previewContent}
          </div>
        )}
      </div>
      <div className="ml-auto shrink-0">{renderActions()}</div>
    </div>
  );
};
