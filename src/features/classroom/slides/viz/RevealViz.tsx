/**
 * RevealViz — the single selector from a VizAggregate + a slide reveal hint to
 * the right reveal component. Shared by the projector and the teacher panel so
 * both surfaces stay in sync. Pure props-in (identity-free VizAggregate).
 */
import type { StudentLanguage } from '../../types';
import { AnimatedChoiceBars } from './AnimatedChoiceBars';
import { ResponseCardWall } from './ResponseCardWall';
import { ScaleReveal } from './ScaleReveal';
import { WordCloudReveal } from './WordCloudReveal';
import { toWordCloud, type VizAggregate } from './buildVizAggregate';

export interface RevealVizProps {
  viz: VizAggregate;
  reveal?: 'bars' | 'wall' | 'words' | 'scale';
  size: 'projector' | 'panel';
  language: StudentLanguage;
  /**
   * Height of the box this reveal renders into, in design px. Forwarded to the
   * card wall so it caps itself to what actually fits instead of overflowing
   * into a clipped region.
   */
  availableHeight?: number;
}

export const RevealViz = ({
  viz,
  reveal,
  size,
  language,
  availableHeight,
}: RevealVizProps) => {
  if (viz.kind === 'choice') {
    return (
      <AnimatedChoiceBars
        aggregate={viz}
        size={size}
        availableHeight={availableHeight}
      />
    );
  }
  if (viz.kind === 'scale') {
    return <ScaleReveal aggregate={viz} size={size} />;
  }
  if (viz.kind === 'wordcloud') {
    return <WordCloudReveal aggregate={viz} size={size} />;
  }
  // text → word cloud when the slide requests it, else the card wall. The
  // reveal token is 'words' rather than 'cloud' for historical reasons: the
  // firewall used to match the substring 'clo'. It matches keys exactly now
  // (FORBIDDEN_KEYS in publishDay.ts), so the token choice is cosmetic.
  if (reveal === 'words') {
    return (
      <WordCloudReveal
        aggregate={{
          kind: 'wordcloud',
          words: toWordCloud(viz.answers),
          total: viz.total,
        }}
        size={size}
      />
    );
  }
  return (
    <ResponseCardWall
      availableHeight={availableHeight}
      aggregate={viz}
      size={size}
      language={language}
    />
  );
};
