import { useMemo } from 'react';
import { BoardChoiceGame } from '@/components/Games/BoardChoiceGame';
import { ChordPressGame } from '@/components/Games/ChordPressGame';
import { ImageComponent } from '@/components/ImageComponent';
import { YouTubePlayer } from './YouTubePlayer';

// eslint-disable-next-line sonarjs/cognitive-complexity
export const useMarkdownComponents = (parentColor?: string) => {
  return useMemo(
    () => ({
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="mb-1 text-4xl font-medium text-foreground">
          {children}
        </h1>
      ),
      em: ({ children }: { children?: React.ReactNode }) => {
        if (typeof children !== 'string') return <i>{children}</i>;

        const youtubeMatch = children.match(
          /component:youtube\(([^,]+)(?:,\s*(\d+))?(?:,\s*(\d+))?(?:,\s*([^)]+))?\)/,
        );

        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          const width = youtubeMatch[2]
            ? parseInt(youtubeMatch[2], 10)
            : undefined;
          const height = youtubeMatch[3]
            ? parseInt(youtubeMatch[3], 10)
            : undefined;
          const mode = youtubeMatch[4]?.trim();
          const showControls = mode !== 'minimal' && mode !== 'nocontrols';
          const minimalUI = mode === 'minimal';

          return (
            <YouTubePlayer
              height={height}
              minimalUI={minimalUI}
              showControls={showControls}
              videoId={videoId}
              width={width}
            />
          );
        }

        const imageMatch = children.match(
          /component:image\(([^,]+)(?:,\s*([^,)]+))?(?:,\s*([^)]+))?\)/,
        );

        if (imageMatch) {
          const url = imageMatch[1];
          const altText = imageMatch[2] || '';
          const width = imageMatch[3] || undefined;
          return <ImageComponent altText={altText} url={url} width={width} />;
        }

        const boardGameMatch = children.match(
          /component:board\(\s*([^|)]+(?:\|[^|)]+)*)\s*\)/i,
        );

        if (boardGameMatch) {
          const items = boardGameMatch[1]
            .split('|')
            .filter(Boolean)
            .map((s) => s.trim());

          return (
            <div>
              <BoardChoiceGame />
              <p>{items}</p>
            </div>
          );
        }

        const pressGameMatch = children.match(
          /component:press\(\s*([^|)]+(?:\|[^|)]+)*)\s*\)/i,
        );

        if (pressGameMatch) {
          const items = pressGameMatch[1]
            .split('|')
            .filter(Boolean)
            .map((s) => s.trim());

          return (
            <div>
              <ChordPressGame />
              <p>{items}</p>
            </div>
          );
        }

        const connectGameMatch = children.match(
          /component:connect\(\s*([^|)]+(?:\|[^|)]+)*)\s*\)/i,
        );

        if (connectGameMatch) {
          const items = connectGameMatch[1]
            .split('|')
            .filter(Boolean)
            .map((s) => s.trim());

          return (
            <div>
              <ChordPressGame />
              <p>{items}</p>
            </div>
          );
        }

        return <i>{children}</i>;
      },
    }),
    [parentColor],
  );
};
