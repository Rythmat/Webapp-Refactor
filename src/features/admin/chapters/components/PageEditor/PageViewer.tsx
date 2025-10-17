import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useMarkdownComponents } from '../useMarkdownComponents';

interface PageViewerProps {
  name: string | null;
  content: string;
  color: string | null;
  chapterColor?: string | null;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const PageViewer = forwardRef<HTMLDivElement, PageViewerProps>(
  ({ name, content, color, chapterColor, onScroll }: PageViewerProps, ref) => {
    const MarkdownComponents = useMarkdownComponents(
      color || chapterColor || undefined,
    );

    return (
      <div
        ref={ref}
        className="flex h-full max-w-[50%] flex-1 flex-col overflow-auto border-l bg-surface-box"
        onScroll={onScroll}
      >
        <div
          className="prose max-w-none flex-1 border-l-[16px] p-8 text-foreground"
          style={{ borderColor: color || chapterColor || undefined }}
        >
          <ReactMarkdown
            className="text-foreground prose-h2:text-white prose-h3:text-white prose-h4:text-white prose-h5:text-white prose-h6:text-white"
            components={MarkdownComponents}
          >
            {name ? `# ${name}\n\n${content}` : content}
          </ReactMarkdown>
        </div>
      </div>
    );
  },
);

PageViewer.displayName = 'PageViewer';
