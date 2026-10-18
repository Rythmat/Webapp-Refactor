import { useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/components/utilities';
import { shortKeyLabel } from '@/daw/harmony/clipKey';
import { onSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { getTrackLimitMessage } from '@/daw/store/tracksSlice';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { BrowserChips, BrowserFilters, BrowserSearch } from './BrowserFilters';
import { BrowserRow } from './BrowserRow';
import { useBrowserStore } from './browserStore';
import { metaOf, TYPES, TYPE_LABEL, type BrowserItem } from './items';
import { moveForSong } from './partInSong';
import { releasePreviewVoices, startPreview, stopPreview } from './preview';
import { chipTags, facetCounts, isEmptyQuery, matchItems } from './query';
import {
  fitsYourSong,
  songContextOf,
  type SongContext,
  type SongRole,
} from './songFit';
import { TempoQuestion } from './TempoQuestion';
import { useCatalog } from './useCatalog';

// ── The Library: the browser (milestone 2.14; decision 16, ST5) ────────────
//
// The side rail's Library, laid out like Soundtrap's Sound library: one
// search, Instrument / Genre / Type filters with counts, tag chips, and rows
// with ▶ · ♡ · +, where + makes a new track holding the item at bar 1. It
// lists what Music Atlas has: parts (which left the dock in 2.9), grooves,
// drum kits, presets and templates, and every row says its key, tempo and
// length (a part its chords too), which Soundtrap's don't.
//
// "Fits your song" sits on top while nothing narrows the list: what the
// song lacks, in its key and tempo (songFit.ts). It replaces Soundtrap's
// "Top picks", which show locked items.
//
// The panel's body is its own chunk (lazyParts BrowserPart): the parts,
// grooves and presets load with it, not with the editor.

/** Tag chips: two rows at the Inspector's 300 px. */
const CHIPS = 6;

const ROLE_WORD: Record<SongRole, string> = {
  drums: 'drums',
  bass: 'bass',
  chords: 'chords',
};

function reasonOf(ctx: SongContext, missing: SongRole[]): string {
  const key = ctx.key
    ? shortKeyLabel(ctx.key.rootPc, ctx.key.mode)
    : 'No key yet';
  const lack = missing.length
    ? `no ${ROLE_WORD[missing[0]]} yet`
    : 'more in its key and tempo';
  if (!ctx.key) return `No key yet: the first part you add sets it · ${lack}`;
  return `${key} · ${ctx.bpm} BPM · ${lack}`;
}

export function BrowserPanel() {
  const items = useCatalog();
  const query = useBrowserStore((s) => s.query);
  const preview = useBrowserStore((s) => s.preview);
  const adding = useBrowserStore((s) => s.adding);
  const favouritesList = useStore((s) => s.libraryFavourites);
  const favourites = useMemo(() => new Set(favouritesList), [favouritesList]);
  const inRoom = useStore((s) => s.roomId !== null);
  const addBlocked = useStore((s) => getTrackLimitMessage(s.tracks, 'midi'));
  // The song as the picks read it, as a string so unrelated edits don't
  // re-render the list.
  const ctxKey = useStore((s) => JSON.stringify(songContextOf(s)));
  const ctx = useMemo(() => JSON.parse(ctxKey) as SongContext, [ctxKey]);

  // A preview stops when the song plays or records, when the session
  // changes, and when the panel goes.
  useEffect(() => {
    const stopOnPlay = useStore.subscribe(
      (s) => s.isPlaying || s.isRecording,
      (on) => {
        if (on) stopPreview();
      },
    );
    // A new session also takes down a tempo question: its groove was for
    // the song before.
    const stopOnSession = onSessionGeneration(() => {
      releasePreviewVoices();
      const { question, dismissQuestion } = useBrowserStore.getState();
      if (question) {
        dismissQuestion();
        question.answer(null);
      }
    });
    return () => {
      stopOnPlay();
      stopOnSession();
      releasePreviewVoices();
    };
  }, []);

  const onPreview = useCallback(
    (item: BrowserItem) => {
      const now = useBrowserStore.getState().preview;
      if (now?.itemId === item.id) stopPreview();
      else void startPreview(item, ctx.key, useStore.getState().bpm);
    },
    [ctx.key],
  );

  // Parts with whether they fit the song once moved, for the picks.
  const fitted = useMemo(
    () =>
      items.map((item) =>
        item.type === 'part'
          ? { ...item, keyFits: moveForSong(item.part, ctx.key).fits }
          : item,
      ),
    [items, ctx.key],
  );
  const matched = useMemo(
    () => matchItems(fitted, query, favourites),
    [fitted, query, favourites],
  );
  const counts = useMemo(
    () => ({
      instrument: facetCounts(fitted, query, favourites, 'instrument'),
      genre: facetCounts(fitted, query, favourites, 'genre'),
      type: facetCounts(fitted, query, favourites, 'type'),
    }),
    [fitted, query, favourites],
  );
  const tags = useMemo(() => chipTags(matched, query, CHIPS), [matched, query]);
  const fits = useMemo(
    () => (isEmptyQuery(query) ? fitsYourSong(fitted, ctx, favourites) : null),
    [fitted, ctx, favourites, query],
  );

  const metaFor = (item: BrowserItem) =>
    item.type === 'part'
      ? metaOf(item, moveForSong(item.part, ctx.key).key)
      : metaOf(item);

  const row = (item: BrowserItem) => (
    <BrowserRow
      key={item.id}
      item={item}
      meta={metaFor(item)}
      favourite={favourites.has(item.id)}
      preview={preview?.itemId === item.id ? preview.status : null}
      addBlocked={addBlocked}
      busy={adding.includes(item.id)}
      inRoom={inRoom}
      onPreview={onPreview}
    />
  );

  return (
    <div
      data-testid="library-browser"
      className="relative flex min-h-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && useBrowserStore.getState().preview) {
          e.stopPropagation();
          stopPreview();
        }
      }}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-daw-hairline p-2">
        <BrowserSearch />
        <BrowserFilters
          query={query}
          counts={counts}
          favouriteCount={favouritesList.length}
        />
        <BrowserChips tags={tags} active={query.tags} />
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {fits && fits.picks.length > 0 ? (
          <section
            data-testid="library-fits"
            aria-labelledby="library-fits-title"
            className="border-b border-daw-hairline pb-1 pt-2"
          >
            <h3
              id="library-fits-title"
              className={cn(TYPE_CLASS.micro, 'px-3 text-daw-text-2')}
            >
              Fits your song
            </h3>
            <p
              data-testid="library-fits-reason"
              className={cn(TYPE_CLASS.label, 'px-3 pb-1 text-daw-text-3')}
            >
              {reasonOf(ctx, fits.missing)}
            </p>
            <ul aria-label="Fits your song">{fits.picks.map(row)}</ul>
          </section>
        ) : null}
        {matched.length === 0 ? (
          <EmptyState
            data-testid="library-empty"
            title="Nothing matches"
            description="Try fewer words, or clear the filters."
            actions={
              <Button
                size="sm"
                onClick={() => useBrowserStore.getState().clearQuery()}
              >
                Clear
              </Button>
            }
          />
        ) : (
          TYPES.map((type) => {
            const ofType = matched.filter((item) => item.type === type);
            if (ofType.length === 0) return null;
            return (
              <section
                key={type}
                data-testid="library-section"
                data-type={type}
                aria-labelledby={`library-section-${type}`}
                className="pt-2"
              >
                <h3
                  id={`library-section-${type}`}
                  data-count={ofType.length}
                  className={cn(TYPE_CLASS.micro, 'px-3 pb-1 text-daw-text-2')}
                >
                  {TYPE_LABEL[type]} · {ofType.length}
                </h3>
                {type === 'template' ? (
                  <p
                    className={cn(
                      TYPE_CLASS.label,
                      'px-3 pb-1 text-daw-text-3',
                    )}
                  >
                    {inRoom
                      ? 'Leave the shared session to open a template.'
                      : 'Opens as a new project. What you have open now is kept, with a Restore.'}
                  </p>
                ) : null}
                <ul aria-label={TYPE_LABEL[type]}>{ofType.map(row)}</ul>
              </section>
            );
          })
        )}
      </div>
      <TempoQuestion />
    </div>
  );
}
