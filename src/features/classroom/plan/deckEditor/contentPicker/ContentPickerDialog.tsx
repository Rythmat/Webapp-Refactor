/**
 * ContentPickerDialog — lets a teacher pick an EXACT piece of app content
 * (a song, theory lesson, genre, studio starter, historical event, region/city,
 * globe pathway, or era) and emits a ready-to-slot launch tile
 * (`{ module, activityRef, label }`) whose ref resolves via the shared
 * `resolveActivityRefHref`, optionally with media to embed alongside it.
 *
 * Used two ways: the launch-tile editor's "Choose content" button (all domains)
 * and the Add-slide TEMPLATE flow, which passes a single `domains` entry so the
 * dialog scopes to exactly that content type.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContentGate, type ContentNeed } from '@/content/ContentGate';
import { refFirewallCollision } from '../../../slides/contentRefs';
import type { InteractionType } from '../../../types';
import { ErasTab } from './ErasTab';
import { EventsTab } from './EventsTab';
import { GenreTab } from './GenreTab';
import { GlobeTab } from './GlobeTab';
import { RegionsCitiesTab } from './RegionsCitiesTab';
import { ResponsesTab } from './ResponsesTab';
import { SongsTab } from './SongsTab';
import { StudioTab } from './StudioTab';
import { TheoryTab } from './TheoryTab';
import type { PickedTile, SlideMediaEmbed } from './catalog';

export type PickerDomain =
  | 'theory'
  | 'songs'
  | 'genre'
  | 'studio'
  | 'events'
  | 'regionsCities'
  | 'globe'
  | 'eras'
  | 'responses';

interface ContentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Emits the chosen tile MINUS its id (the caller assigns the uid). Some picks
   * also emit media to embed alongside the tile: a globe pathway → `{ media }`;
   * a song → `{ media: youtube, sideMedia: artistImage }`.
   */
  onSelect: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
  initialTab?: PickerDomain;
  /** When set, only these tabs are shown (template flow scopes to one). */
  domains?: PickerDomain[];
  /** When provided, the "Responses" tab is shown; picking a type adds a student
   *  response component (a new question slide). Omit to hide the tab. */
  onAddResponse?: (type: InteractionType) => void;
}

const TABS: { id: PickerDomain; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'theory', label: 'Theory' },
  { id: 'genre', label: 'Genre' },
  { id: 'studio', label: 'Studio' },
  { id: 'events', label: 'Events' },
  { id: 'regionsCities', label: 'Regions & Cities' },
  { id: 'globe', label: 'Pathways' },
  { id: 'eras', label: 'Eras' },
  { id: 'responses', label: 'Responses' },
];

/** ContentGate needs for the visible domains (static tabs need nothing). */
const gateNeeds = (domains: PickerDomain[]): ContentNeed[] => {
  const needs: ContentNeed[] = [];
  if (domains.includes('songs')) needs.push('songs');
  if (domains.includes('events') || domains.includes('globe'))
    needs.push('events');
  return needs;
};

export const ContentPickerDialog = ({
  open,
  onOpenChange,
  onSelect,
  initialTab,
  domains,
  onAddResponse,
}: ContentPickerDialogProps) => {
  // The "Responses" tab only appears when a response handler is wired (the
  // "Choose content" button), never in the Add-slide template flow.
  const shownTabs = (
    domains ? TABS.filter((t) => domains.includes(t.id)) : TABS
  ).filter((t) => t.id !== 'responses' || onAddResponse);
  const [tab, setTab] = useState<PickerDomain>(
    () => initialTab ?? shownTabs[0]?.id ?? 'songs',
  );

  // Final safety net — never emit a tile that would fail the publish firewall
  // (the result list already disables such rows).
  const commit = (tile: PickedTile, embed?: SlideMediaEmbed) => {
    if (refFirewallCollision(tile.activityRef, tile.label?.en)) return;
    onSelect(tile, embed);
    onOpenChange(false);
  };

  const needs = gateNeeds(shownTabs.map((t) => t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#161618] p-0 text-white">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base font-medium">
            Add content link
          </DialogTitle>
        </DialogHeader>

        {shownTabs.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-white/10 px-5 pb-3 pt-2">
            {shownTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  'rounded-full px-3 py-1.5 text-sm transition-colors ' +
                  (tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <ContentGate
          needs={needs}
          fallback={
            <div className="px-5 py-12 text-center text-sm text-white/45">
              Loading content…
            </div>
          }
        >
          {tab === 'songs' && <SongsTab onSelect={commit} />}
          {tab === 'theory' && <TheoryTab onSelect={commit} />}
          {tab === 'genre' && <GenreTab onSelect={commit} />}
          {tab === 'studio' && <StudioTab onSelect={commit} />}
          {tab === 'events' && <EventsTab onSelect={commit} />}
          {tab === 'regionsCities' && <RegionsCitiesTab onSelect={commit} />}
          {tab === 'globe' && <GlobeTab onSelect={commit} />}
          {tab === 'eras' && <ErasTab onSelect={commit} />}
          {tab === 'responses' && (
            <ResponsesTab
              onPick={(type) => {
                onAddResponse?.(type);
                onOpenChange(false);
              }}
            />
          )}
        </ContentGate>
      </DialogContent>
    </Dialog>
  );
};
