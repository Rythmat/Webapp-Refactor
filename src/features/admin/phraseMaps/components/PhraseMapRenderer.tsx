import { PhraseMap } from '@/components/PhraseMap/PhraseMap';
import { usePhraseMap } from '@/hooks/data';
import { PianoPlayerSkeleton } from '../../chapters/components/PianoPlayerSkeleton';

interface PhraseMapRendererProps {
  id: string;
  viewMode?: string; // Could be used for different view modes in the future
  color?: string;
  showPiano?: boolean;
}

export const PhraseMapRenderer = ({
  id,
  // viewMode = 'default',
  color,
}: PhraseMapRendererProps) => {
  const { data: phraseMap, isLoading, error } = usePhraseMap(id);

  if (isLoading) {
    return <PianoPlayerSkeleton />;
  }

  if (error || !phraseMap) {
    return <div>Error loading rhythm map</div>;
  }

  return <PhraseMap parentColor={color} phraseMap={phraseMap} />;
};
