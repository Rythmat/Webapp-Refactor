import { PhraseMap } from '@/components/PhraseMap/PhraseMap';
import { usePhraseMap } from '@/hooks/data';
import { PianoPlayerSkeleton } from './PianoPlayerSkeleton';

interface PhraseMapRendererProps {
  id: string;
  viewMode?: string;
  color?: string;
  showPiano?: boolean;
}

export const PhraseMapRenderer = ({ id, color }: PhraseMapRendererProps) => {
  const { data: phraseMap, isLoading, error } = usePhraseMap(id);

  if (isLoading) {
    return <PianoPlayerSkeleton />;
  }

  if (error || !phraseMap) {
    return <div>Error loading rhythm map</div>;
  }

  return <PhraseMap parentColor={color} phraseMap={phraseMap} />;
};
