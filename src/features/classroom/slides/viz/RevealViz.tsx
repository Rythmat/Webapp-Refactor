/**
 * RevealViz — the single selector from a VizAggregate + a slide reveal hint to
 * the right reveal component. Shared by the projector and the teacher panel so
 * both surfaces stay in sync. Pure props-in (identity-free VizAggregate).
 */
import type { StudentLanguage } from '../../types';
import { AnimatedChoiceBars } from './AnimatedChoiceBars';
import { toWordCloud, type VizAggregate } from './buildVizAggregate';
import { ResponseCardWall } from './ResponseCardWall';
import { ScaleReveal } from './ScaleReveal';
import { WordCloudReveal } from './WordCloudReveal';

export interface RevealVizProps {
  viz: VizAggregate;
  reveal?: 'bars' | 'wall' | 'words' | 'scale';
  size: 'projector' | 'panel';
  language: StudentLanguage;
}

export const RevealViz = ({ viz, reveal, size, language }: RevealVizProps) => {
  if (viz.kind === 'choice') {
    return <AnimatedChoiceBars aggregate={viz} size={size} />;
  }
  if (viz.kind === 'scale') {
    return <ScaleReveal aggregate={viz} size={size} />;
  }
  if (viz.kind === 'wordcloud') {
    return <WordCloudReveal aggregate={viz} size={size} />;
  }
  // text → word cloud when the slide requests it, else the card wall. The
  // reveal token is 'words' (not 'cloud') so it can't collide with the Rule 1
  // FORBIDDEN_SUBSTRINGS entry 'clo' once published (see publishDay.ts).
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
  return <ResponseCardWall aggregate={viz} size={size} language={language} />;
};
