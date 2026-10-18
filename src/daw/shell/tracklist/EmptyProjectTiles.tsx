import { Disc3, Drum, Piano, Plus } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { addTrackFrom, openAddTrackSheet } from './addTrack';
import { choiceOf } from './trackTemplates';

// ── An empty project's first steps (milestones 2.6 and 2.14) ───────────────
//
// A new project used to show an empty canvas and a 10 px 'Add Track' link
// (ia-flows-25). The lanes now offer four ways in, worded as goals (the
// plan's wording for Stage D, where an assignment shows its brief here
// instead):
// - Start with a beat: the picker's Drum grid, open on the step sequencer
//   (the drums' Notes tab);
// - Play an instrument: its Piano, with the computer keyboard playing it;
// - Start from a genre: its Grooves, open on the genre grooves;
// - Add a track: the Add-track picker, for anything else.

interface Tile {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  run(): void;
}

const TILES: readonly Tile[] = [
  {
    id: 'beat',
    title: 'Start with a beat',
    description: 'Program drums on the step sequencer',
    icon: <Drum />,
    run: () => {
      addTrackFrom(choiceOf('drum-grid'));
    },
  },
  {
    id: 'play',
    title: 'Play an instrument',
    description: 'A piano you play from the computer keyboard',
    icon: <Piano />,
    run: () => {
      if (addTrackFrom(choiceOf('piano'))) {
        useMusicalTypingStore.getState().setEnabled(true);
      }
    },
  },
  {
    id: 'genre',
    title: 'Start from a genre',
    description: 'Pick a hip hop, funk or rock groove',
    icon: <Disc3 />,
    run: () => {
      addTrackFrom(choiceOf('grooves'));
    },
  },
  {
    id: 'add',
    title: 'Add a track',
    description: 'Synth, sampler, voice, guitar and more',
    icon: <Plus />,
    run: openAddTrackSheet,
  },
];

export const EmptyProjectTiles = memo(function EmptyProjectTiles() {
  return (
    <section
      data-ds="v2"
      data-testid="empty-project"
      aria-label="Start your song"
      className="flex h-full flex-col items-center justify-center gap-3 px-6"
    >
      <h2 className={cn(TYPE_CLASS.title, 'text-daw-text')}>Start your song</h2>
      <div className="grid w-full max-w-[720px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            data-testid={`empty-tile-${tile.id}`}
            onClick={tile.run}
            className={cn(
              'flex min-h-[88px] flex-col items-start gap-1 rounded-[var(--daw-radius-md)] border border-daw-hairline bg-daw-surface-2 p-3 text-left',
              'hover:border-daw-outline hover:bg-daw-hover',
              '[&_svg]:size-5 [&_svg]:text-daw-text-2',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            {tile.icon}
            <span className={cn(TYPE_CLASS.body, 'font-bold text-daw-text')}>
              {tile.title}
            </span>
            <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              {tile.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
});
