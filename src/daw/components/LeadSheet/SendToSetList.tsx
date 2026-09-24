import { ListMusic } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showSuccess } from '@/components/utils/toast';
import { useStore } from '@/daw/store';
import { listTree, roleList } from '@/features/setlists/setListsStore';
import {
  useProjectSetListEntries,
  useSetLists,
} from '@/features/setlists/useSetLists';
import { chartFromStudio, type StudioChartSource } from './toSetListChart';

/**
 * Sending a Studio lead sheet to a set list, and keeping it honest afterwards.
 *
 * Sending is printing: the set gets a page of its own, and the project can be
 * renamed, rewritten or deleted without the page moving. What the link buys is
 * the offer — when the project is saved with different chords, the Studio asks
 * whether the sets that carry this chart should get the new one. Saying no is
 * a real answer; the sets keep the page they have.
 */

/** Fires after every successful cloud save, from all save paths. */
export const PROJECT_SAVED_EVENT = 'ma-studio-project-saved';
/** Fires after a cloud project is deleted, from all delete paths. */
export const PROJECT_DELETED_EVENT = 'ma-studio-project-deleted';

/** Everything the chart is built from, straight off the store. */
export function useStudioChartSource(): StudioChartSource {
  const projectName = useStore((s) => s.projectName);
  const composerName = useStore((s) => s.composerName);
  const chordRegions = useStore((s) => s.chordRegions);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const measuresPerLine = useStore((s) => s.measuresPerLine);
  const measureRowSizes = useStore((s) => s.measureRowSizes);
  const measureRestMap = useStore((s) => s.measureRestMap);
  const measureFermatas = useStore((s) => s.measureFermatas);
  const leadSheetSections = useStore((s) => s.leadSheetSections);
  const leadSheetRepeats = useStore((s) => s.leadSheetRepeats);
  return useMemo(
    () => ({
      projectName,
      composerName,
      chordRegions,
      rootNote,
      mode,
      bpm,
      measuresPerLine,
      measureRowSizes,
      measureRestMap,
      measureFermatas,
      leadSheetSections,
      leadSheetRepeats,
    }),
    [
      projectName,
      composerName,
      chordRegions,
      rootNote,
      mode,
      bpm,
      measuresPerLine,
      measureRowSizes,
      measureRestMap,
      measureFermatas,
      leadSheetSections,
      leadSheetRepeats,
    ],
  );
}

const NEW_LIST = '__new__';

/* ── Sending ──────────────────────────────────────────────────────────── */

export const SendToSetListButton: FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className, style }) => {
  const [open, setOpen] = useState(false);
  const chordRegions = useStore((s) => s.chordRegions);
  const empty = chordRegions.length === 0;
  return (
    <>
      <button
        className={className}
        style={{ ...style, opacity: empty ? 0.4 : 1 }}
        onClick={() => setOpen(true)}
        disabled={empty}
        title="Send this chart to a set list"
      >
        <ListMusic size={13} strokeWidth={2} />
        Set List
      </button>
      {open && <SendDialog open={open} onOpenChange={setOpen} />}
    </>
  );
};

const SendDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const source = useStudioChartSource();
  const projectId = useStore((s) => s.projectId);
  const { blob, status, actions, flush } = useSetLists();
  const chart = useMemo(() => chartFromStudio(source), [source]);

  const [title, setTitle] = useState(chart.title);
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const inbox = roleList(blob, 'inbox');
  const options = useMemo(
    () =>
      listTree(blob).flatMap(({ artist, shows }) =>
        shows.flatMap(({ show, setLists }) =>
          setLists.map((list) => ({
            id: list.id,
            label: list.role
              ? list.title
              : `${artist.title} ▸ ${show.title} ▸ ${list.title}`,
          })),
        ),
      ),
    [blob],
  );
  const chosen = destination || inbox?.id || NEW_LIST;
  const barCount = chart.sections.reduce((n, s) => n + s.bars.length, 0);

  const send = () => {
    const setListId =
      chosen === NEW_LIST
        ? actions.createSetList(newTitle.trim() || 'New Set List')
        : chosen;
    if (!setListId) return;
    actions.addProjectChart(setListId, {
      ...(projectId ? { projectId } : {}),
      title: title.trim() || chart.title,
      chart,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    void flush();
    onOpenChange(false);
    showSuccess(
      `Sent to ${
        chosen === NEW_LIST
          ? newTitle.trim() || 'New Set List'
          : (options.find((o) => o.id === chosen)?.label ?? 'your set list')
      }`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#161618] text-white">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Send this chart to a set list
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-white/45">
            The set gets its own copy — {barCount}{' '}
            {barCount === 1 ? 'bar' : 'bars'} in {chart.key}. Edit this project
            later and you will be asked whether to send the new version too.
          </p>

          <label className="block">
            <span className="text-xs text-white/50">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-white/35"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="count in 4 · cut last chorus"
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/35"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50">Set list</span>
            <select
              value={chosen}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#161618] px-3 py-1.5 text-sm outline-none focus:border-white/35"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
              <option value={NEW_LIST}>New set list…</option>
            </select>
          </label>

          {chosen === NEW_LIST && (
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Name the new set list"
              className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/35"
            />
          )}

          {status === 'signedOut' && (
            <p className="text-xs text-amber-300/80">
              You are not signed in, so this will not be kept.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            className="rounded-full bg-[#7ecfcf] px-4 py-1.5 text-sm font-semibold text-[#191919]"
          >
            Send
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── The offer, on save ───────────────────────────────────────────────── */

/**
 * Mounted once in the Studio. After a save, if any set carries an older print
 * of this chart, it offers to send the new one. It never updates on its own:
 * a page on a stand does not change under a player's hands.
 */
export const SetListUpdatePrompt: FC = () => {
  const projectId = useStore((s) => s.projectId);
  const source = useStudioChartSource();
  const { staleFor, actions, flush } = useProjectSetListEntries(
    projectId ?? undefined,
  );
  const [asking, setAsking] = useState(false);

  const chart = useMemo(() => chartFromStudio(source), [source]);
  // Read at the moment of the save, not on every render, so editing after
  // dismissing the offer doesn't bring it back unasked.
  const [stale, setStale] = useState<ReturnType<typeof staleFor>>([]);

  const onSaved = useCallback(() => {
    const behind = staleFor(chart);
    if (behind.length === 0) return;
    setStale(behind);
    setAsking(true);
  }, [chart, staleFor]);

  useEffect(() => {
    window.addEventListener(PROJECT_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PROJECT_SAVED_EVENT, onSaved);
  }, [onSaved]);

  // The project is gone. The pages stay where they are; only the link goes.
  useEffect(() => {
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (id) actions.unlinkProject(id);
    };
    window.addEventListener(PROJECT_DELETED_EVENT, onDeleted);
    return () => window.removeEventListener(PROJECT_DELETED_EVENT, onDeleted);
  }, [actions]);

  const update = () => {
    for (const { setListId, entry } of stale) {
      actions.replaceProjectChart(setListId, entry.id, chart, chart.title);
    }
    void flush();
    setAsking(false);
    showSuccess(
      stale.length === 1
        ? `Updated the chart in ${stale[0].setListTitle}`
        : `Updated the chart in ${stale.length} set lists`,
    );
  };

  if (!asking || stale.length === 0) return null;

  return (
    <Dialog open onOpenChange={() => setAsking(false)}>
      <DialogContent className="max-w-md border-white/10 bg-[#161618] text-white">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Update the Set List chart?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-white/60">
          This lead sheet is on{' '}
          {stale.length === 1 ? (
            <span className="text-white/85">{stale[0].setListTitle}</span>
          ) : (
            `${stale.length} of your set lists`
          )}
          , and the copy there is the one you sent before these edits. Send the
          new version?
        </p>
        {stale.length > 1 && (
          <ul className="mt-1 space-y-0.5 text-xs text-white/45">
            {stale.map(({ setListId, entry, setListTitle }) => (
              <li key={`${setListId}:${entry.id}`}>{setListTitle}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30"
          >
            Keep the old one
          </button>
          <button
            type="button"
            onClick={update}
            className="rounded-full bg-[#7ecfcf] px-4 py-1.5 text-sm font-semibold text-[#191919]"
          >
            Update
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
