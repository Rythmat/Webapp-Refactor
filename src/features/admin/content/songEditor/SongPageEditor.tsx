import { Clock, Gauge, Signal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GENRE_DISPLAY_LABELS } from '@/components/common/CircleOfFifthsSvg';
import {
  ChordChart,
  type ChordChartEditable,
  type ChordChartLoc,
} from '@/components/songLibrary/ChordChart';
import { SongDetailView } from '@/components/songLibrary/SongDetailView';
import { LightDot } from '@/components/songLibrary/SongLight';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/utilities';
import { songTonic } from '@/curriculum/songLibrary/hybridDegree';
import { sectionMeters } from '@/curriculum/songLibrary/performance';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  ScorePalettes,
  type PaletteAction,
} from '@/daw/components/Score/ScorePalettes';
import type { NotePaletteOptions } from '@/daw/components/Score/notePalettes';
import type { SongLight } from '@/features/songs/songGate';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import type { BarRef } from '@/lib/chartEditor/selection';
import type { StructuredEditorProps } from '../editorTypes';
import { useRepoMode } from '../repo/useRepoMode';
import {
  addChordOnBeat,
  addSection,
  coerceSongDraft,
  duplicateSection,
  insertBar,
  insertSection,
  moveSection,
  removeBar,
  removeChord,
  removeSection,
  updateChord,
  updateSection,
} from '../songChart/chartOps';
import { AdvancedFields } from './AdvancedFields';
import { ArtistImageUpload } from './ArtistImageUpload';
import { BarInspector } from './BarInspector';
import { ChordEditorPopup } from './ChordEditorPopup';
import { ConnectionsPanel } from './ConnectionsPanel';
import { KeyPicker } from './KeyPicker';
import { YouTubeField } from './YouTubeField';
import { CHART_PALETTE_ACTIONS, applyPaletteMark } from './paletteMarks';
import { slugify } from './songDefaults';
import { useChartEditing } from './useChartEditing';
import { useChartRhythm } from './useChartRhythm';

/** A chart's rhythm is slashes and rests, tied or not: no pitches. */
const CHART_NOTE_OPTIONS: NotePaletteOptions = {
  layers: ['slashes', 'rests'],
  articulations: 'tie',
  accidentals: false,
};

/**
 * The song editor: the song page itself (`SongDetailView`), with its fields
 * as inputs.
 *
 * The page is the one students get — its tint, layout, credits line and chart
 * frame — and each region the author changes is swapped for its input in
 * place: the artwork takes a drop, the title and byline are typed where they
 * sit, the stat row holds the key, tempo, metre, level and genre pickers, the
 * video takes a link. The credits line stays the real one, drawn from the
 * draft, so a credit typed below appears on it as students will see it.
 * Below the header come the song's connections (`ConnectionsPanel`: each
 * name linked to its record) and the chart editor.
 *
 * Everything patches the raw body (`onChange`); the page renders a coerced
 * copy (`coerceSongDraft`) so a half-authored song still draws, without the
 * coercion's defaults ever being saved.
 */

const TITLE_STYLE: React.CSSProperties = {
  fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
  fontWeight: 600,
  lineHeight: 1.1,
};

const TOOL =
  'rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 transition-colors enabled:hover:bg-white/[0.08] enabled:hover:text-white disabled:opacity-30';

const ACTION_ICONS = [
  { label: 'Open in Lesson', src: '/icons/learn-icon.svg' },
  { label: 'Open in Studio', src: '/icons/studio-icon.svg' },
  { label: 'Open in Globe', src: '/icons/globe-icon.svg' },
];

export const SongPageEditor = ({ body, onChange }: StructuredEditorProps) => {
  // One coerced copy per body, so the chart editor sees a stable song.
  const song = useMemo(() => coerceSongDraft(body), [body]);
  const initialHadId = useRef(typeof body.id === 'string' && !!body.id);
  const [idTouched, setIdTouched] = useState(false);

  const patch = (p: Partial<Song>) => onChange({ ...body, ...p });
  const patchWithId = (p: Partial<Song>) => {
    if ('id' in p) setIdTouched(true);
    patch(p);
  };
  const setTitle = (title: string) => {
    const autoSlug = !initialHadId.current && !idTouched;
    patch(autoSlug ? { title, id: slugify(title) } : { title });
  };

  return (
    <SongDetailView
      song={song}
      layout="document"
      slots={{
        artwork: <ArtistImageUpload song={song} onPatch={patch} />,
        title: (
          <span className="flex min-w-0 items-baseline" style={TITLE_STYLE}>
            <span className="text-white/70">“</span>
            <input
              aria-label="Title"
              value={typeof body.title === 'string' ? body.title : ''}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/25"
              style={TITLE_STYLE}
            />
            <span className="text-white/70">”</span>
          </span>
        ),
        byline: <Byline song={song} body={body} onPatch={patch} />,
        stats: <Stats song={song} body={body} onPatch={patch} />,
        actions: (
          <div
            className="flex items-center gap-2 pt-1"
            title="Shown to students; not editable"
          >
            {ACTION_ICONS.map(({ label, src }) => (
              <span
                key={label}
                className="flex size-10 items-center justify-center rounded-lg opacity-40"
              >
                <img
                  src={src}
                  alt=""
                  width={28}
                  height={28}
                  draggable={false}
                />
              </span>
            ))}
          </div>
        ),
        video: <YouTubeField song={song} onPatch={patch} />,
        chart: (
          <>
            <div className="min-w-0 px-6 pt-4 md:px-10">
              <ConnectionsPanel song={song} onPatch={patch} />
            </div>
            <ChartEditor
              song={song}
              onPatch={patch}
              light={<ChartLight body={body} onChange={onChange} />}
            />
            <div className="min-w-0 px-6 pb-8 md:px-10">
              <AdvancedFields song={song} onPatch={patchWithId} />
            </div>
          </>
        ),
      }}
    />
  );
};

interface FieldProps {
  song: Song;
  body: Record<string, unknown>;
  onPatch(p: Partial<Song>): void;
}

const Byline = ({ body, onPatch }: FieldProps) => (
  <div className="flex items-center gap-2 text-sm">
    <input
      aria-label="Artist"
      value={typeof body.artist === 'string' ? body.artist : ''}
      onChange={(e) => onPatch({ artist: e.target.value })}
      placeholder="Artist"
      className="min-w-0 flex-1 bg-transparent text-white/55 outline-none placeholder:text-white/25"
    />
    <span className="text-white/25">·</span>
    <input
      aria-label="Year"
      type="number"
      value={typeof body.year === 'number' ? body.year : ''}
      onChange={(e) =>
        onPatch({ year: e.target.value ? Number(e.target.value) : undefined })
      }
      placeholder="Year"
      className="w-16 bg-transparent text-white/35 outline-none placeholder:text-white/25"
    />
    <span className="text-white/25">·</span>
    <span className="text-white/35">Written by</span>
    <input
      aria-label="Written by"
      value={typeof body.composer === 'string' ? body.composer : ''}
      onChange={(e) => onPatch({ composer: e.target.value || undefined })}
      placeholder="Writers"
      className="min-w-0 flex-1 bg-transparent text-white/35 outline-none placeholder:text-white/25"
    />
  </div>
);

const Divider = () => (
  <span aria-hidden className="text-white/20">
    ·
  </span>
);

const Stats = ({ song, onPatch }: FieldProps) => {
  const [ts0, ts1] = song.timeSignature;
  const genre = song.genreTags[0] ?? '';
  const setGenre = (value: string) => {
    const rest = song.genreTags.slice(1);
    onPatch({ genreTags: value.trim() ? [value.trim(), ...rest] : rest });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <KeyPicker song={song} onPatch={onPatch} />
      <Divider />
      <span className="inline-flex items-center gap-1.5 text-white/50">
        <Gauge size={15} />
        <input
          aria-label="Tempo"
          type="number"
          value={song.tempo}
          onChange={(e) => onPatch({ tempo: Number(e.target.value) })}
          className="w-12 bg-transparent text-white/90 outline-none"
        />
        <span className="text-white/50">BPM</span>
      </span>
      <Divider />
      <span className="inline-flex items-center gap-1.5 text-white/50">
        <Clock size={15} />
        <input
          aria-label="Beats per bar"
          type="number"
          value={ts0}
          onChange={(e) =>
            onPatch({ timeSignature: [Number(e.target.value), ts1] })
          }
          className="w-8 bg-transparent text-center text-white/90 outline-none"
        />
        <span className="text-white/90">/</span>
        <input
          aria-label="Beat unit"
          type="number"
          value={ts1}
          onChange={(e) =>
            onPatch({ timeSignature: [ts0, Number(e.target.value)] })
          }
          className="w-8 bg-transparent text-center text-white/90 outline-none"
        />
      </span>
      <Divider />
      <span className="inline-flex items-center gap-1.5 text-white/50">
        <Signal size={15} />
        <span className="text-white/90">Lvl.</span>
        <Select
          value={String(song.difficulty)}
          onValueChange={(v) =>
            onPatch({ difficulty: Number(v) as Song['difficulty'] })
          }
        >
          <SelectTrigger aria-label="Level" className="h-7 w-14 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
      <span className="ml-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
        <input
          aria-label="Genre"
          list="song-genre-options"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="genre"
          className="w-24 bg-transparent outline-none placeholder:text-white/30"
        />
        <datalist id="song-genre-options">
          {Object.keys(GENRE_DISPLAY_LABELS).map((slug) => (
            <option key={slug} value={slug} />
          ))}
        </datalist>
      </span>
    </div>
  );
};

const LIGHT_BUTTON: Record<SongLight, string> = {
  green:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20',
  red: 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
};

/**
 * The chart's light (songGate.ts), the gate it passes before students use
 * it: green, ready and open to them; red, not ready, and Coming soon in the
 * app. One click turns it. It is the song's `comingSoon`, saved with the
 * song like any other edit, so it goes out with the next publish (or, in
 * repo mode, the next commit and deploy). A new song starts red.
 */
export const ChartLight = ({ body, onChange }: StructuredEditorProps) => {
  const caps = useCapabilities();
  // The literal DEV gate lets the build drop the repo branch (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const ready = body.comingSoon !== true;
  const light: SongLight = ready ? 'green' : 'red';
  const turn = () => {
    if (ready) {
      onChange({ ...body, comingSoon: true });
      return;
    }
    // Green is the light's absence, so a ready song's file says nothing.
    const green = { ...body };
    delete green.comingSoon;
    onChange(green);
  };
  // `comingSoon` came with song schema v3: a content API below it refuses
  // a red song outright, as it refuses any field it does not know.
  const refused =
    !ready && !repo && !!caps.capabilities && caps.songSchemaLevel < 3;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={turn}
        aria-pressed={ready}
        aria-label={`Chart light: ${ready ? 'green, ready for students' : 'red, not ready'}. Turn it ${ready ? 'red' : 'green'}.`}
        title={
          ready
            ? 'Green: ready, and students can open it. Click to turn it red.'
            : 'Red: not ready. Students see it greyed out as Coming soon. Click when it is ready.'
        }
        data-chart-light={light}
        className={cn(
          'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          LIGHT_BUTTON[light],
        )}
      >
        <LightDot light={light} className="size-2.5 ring-0" />
        {ready ? 'Ready for students' : 'Not ready · Coming soon'}
      </button>
      {refused && (
        <span role="status" className="text-xs text-amber-300/80">
          This content API is on song schema v{caps.songSchemaLevel}, and a red
          light needs v3: it won’t save here until the API runs it.
        </span>
      )}
    </span>
  );
};

/** The chart, as a direct-manipulation editor, with its tools stuck above it. */
const ChartEditor = ({
  song,
  onPatch,
  light,
}: {
  song: Song;
  onPatch(p: Partial<Song>): void;
  /** The chart's light, first in its tools. */
  light?: React.ReactNode;
}) => {
  const [selection, setSelection] = useState<ChordChartLoc | null>(null);
  const sections = song.sections;
  const setSections = (next: typeof sections) => onPatch({ sections: next });
  // Undo, the bar selection, the clipboard and the keys. The operations
  // themselves live in lib/chartEditor and are shared with the Studio; this
  // is only the part that has to own state.
  const editing = useChartEditing(song, setSections);
  // The spelled tonic the chart's chords are written against, so auto-derived
  // degrees match the song-library convention (see songTonic).
  const tonic = songTonic(
    song.key ?? '',
    sections.flatMap((s) =>
      s.bars.flatMap((b) => b.chords.map((c) => c.chordName)),
    ),
  );
  const selectedChord = selection
    ? (sections[selection.sectionIdx]?.bars[selection.barIdx]?.chords[
        selection.chordIdx
      ] ?? null)
    : null;

  // The tools' height, which grows when the bar inspector opens: the
  // palettes stick just under it.
  const toolsRef = useRef<HTMLDivElement>(null);
  const [toolsHeight, setToolsHeight] = useState(56);
  useEffect(() => {
    const el = toolsRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      setToolsHeight(el.getBoundingClientRect().height),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A chord on a beat, from the chord lane, a double-click on a slash or
  // the palettes' chord symbol: the one there, or a new one lasting to the
  // next chord or the barline. Either way its popup opens.
  const meters = useMemo(() => sectionMeters(song), [song]);
  const onChordAt = (si: number, bi: number, beat: number) => {
    const beatsInBar = meters[si]?.[bi]?.[0] ?? song.timeSignature?.[0] ?? 4;
    const next = addChordOnBeat(sections, si, bi, beat, beatsInBar);
    if (next !== sections) editing.apply(next, 'Add chord');
    const chordIdx = (next[si]?.bars[bi]?.chords ?? []).findIndex(
      (c) => Math.abs(c.beat - beat) < 1e-6,
    );
    if (chordIdx >= 0) setSelection({ sectionIdx: si, barIdx: bi, chordIdx });
  };
  // The rhythm in slashes, with the Score's palettes.
  const rhythm = useChartRhythm({
    song,
    sections,
    apply: editing.apply,
    onChordAt,
  });
  // A mark from the palettes goes on the picked bars, or else on the bar of
  // the picked slash.
  const markTargets: BarRef[] =
    editing.selectedBars.length > 0
      ? editing.selectedBars
      : rhythm.slash
        ? [{ section: rhythm.slash.section, bar: rhythm.slash.bar }]
        : [];
  const onPaletteMark = (action: PaletteAction) => {
    if (markTargets.length === 0) return;
    if (action === 'text.staffText') {
      // Staff text is typed: pick the bar so the inspector opens on it.
      if (editing.selectedBars.length === 0)
        editing.pickBar(markTargets[0], { shift: false, toggle: false });
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>('[data-staff-text]')?.focus(),
      );
      return;
    }
    const mark = applyPaletteMark(sections, markTargets, action);
    if (mark) editing.apply(mark.sections, mark.label);
  };

  const editable: ChordChartEditable = {
    onAddChordAtBeat: onChordAt,
    onMoveChord: (loc, toBeat) =>
      setSections(
        updateChord(sections, loc.sectionIdx, loc.barIdx, loc.chordIdx, {
          beat: toBeat,
        }),
      ),
    onInsertBar: (si, atIdx) => setSections(insertBar(sections, si, atIdx)),
    onRemoveBar: (si, bi) => {
      setSections(removeBar(sections, si, bi));
      if (selection?.sectionIdx === si && selection.barIdx === bi) {
        setSelection(null);
      }
    },
    onRenameSection: (si, label) =>
      setSections(updateSection(sections, si, { label })),
    onSetRepeat: (si, repeatCount) =>
      setSections(updateSection(sections, si, { repeatCount })),
    onRemoveSection: (si) => {
      setSections(removeSection(sections, si));
      if (selection?.sectionIdx === si) setSelection(null);
    },
    onMoveSection: (si, dir) =>
      setSections(moveSection(sections, si, si + dir)),
    onAddSection: () => setSections(addSection(sections)),
    onDuplicateSection: (si) => setSections(duplicateSection(sections, si)),
    onInsertSectionAfter: (si) => setSections(insertSection(sections, si + 1)),
    sectionCount: sections.length,
  };

  return (
    <div className="min-w-0 px-6 pb-6 pt-4 md:px-10">
      {/* The tools stay put. They used to sit under the chart, which on a
          128-bar song like Paranoid Android put them a screen and a half
          below the bar you were editing — you had to scroll away from your
          own selection to act on it. Sticky, so the chart scrolls under
          them and the selection and the controls are never apart. */}
      <div
        ref={toolsRef}
        className="sticky top-[var(--full-editor-bar-h,0px)] z-20 -mx-6 mb-3 border-b border-white/10 bg-[#101012]/95 px-6 py-2 backdrop-blur md:-mx-10 md:px-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {light}
            <p className="text-xs text-muted-foreground">
              Click a slash for its rhythm, above it for a chord · drag a chord
              to move it · click the rail under a bar to select it, shift-click
              for a run
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!editing.canUndo}
              title={
                editing.undoLabel
                  ? `Undo ${editing.undoLabel}`
                  : 'Nothing to undo'
              }
              onClick={editing.undo}
              className={TOOL}
            >
              ⌘Z Undo
            </button>
            <button
              type="button"
              disabled={!editing.canRedo}
              title={
                editing.redoLabel
                  ? `Redo ${editing.redoLabel}`
                  : 'Nothing to redo'
              }
              onClick={editing.redo}
              className={TOOL}
            >
              ⇧⌘Z Redo
            </button>
            <button
              type="button"
              disabled={editing.selectedBars.length === 0}
              onClick={editing.copy}
              title="Copy the selected bars, roadmap and all"
              className={TOOL}
            >
              ⌘C
            </button>
            <button
              type="button"
              disabled={!editing.clipboard || editing.selectedBars.length === 0}
              onClick={() => editing.paste()}
              title={editing.pasteLabel ?? 'Nothing copied'}
              className={TOOL}
            >
              ⌘V
            </button>
          </div>
        </div>

        {/* Only once bars are picked, so an unselected chart keeps its
            room and the bar stays one line tall. */}
        {editing.selectedBars.length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-2">
            <BarInspector
              sections={sections}
              refs={editing.selectedBars}
              onChange={editing.apply}
            />
          </div>
        )}
      </div>

      {/* The keys belong to the chart, not to the window: a person typing
          in a field upstairs is not addressing the bars. The palettes are
          inside the same group, so a key still reaches the chart after a
          click on a cell. */}
      <div
        role="group"
        aria-label="Chord chart"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (!rhythm.onKey(e)) editing.onKeyDown(e);
        }}
        className="flex items-start gap-4 outline-none"
      >
        <div className="min-w-0 flex-1">
          <ChordChart
            song={song}
            onSelectChord={setSelection}
            selection={selection}
            editable={editable}
            barSelection={editing.selection}
            onPickBar={editing.pickBar}
            slashSelection={rhythm.slash}
            onPickSlash={(ref, index) => rhythm.pick(ref, index)}
          />
        </div>
        {/* The Studio Score's palettes (owner, 2026-11-12): Rhythmic and
            Rests for the slashes, the tie, the chord symbol, and the marks.
            Beside the chart, under the tools, as the Score has them. */}
        <aside
          aria-label="Palettes"
          className="sticky hidden w-56 shrink-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#141417] lg:flex"
          style={{
            top: `calc(var(--full-editor-bar-h, 0px) + ${toolsHeight + 12}px)`,
            height: `calc(100vh - var(--full-editor-bar-h, 0px) - ${toolsHeight + 28}px)`,
          }}
        >
          <ScorePalettes
            hasSelection={markTargets.length > 0}
            onApply={onPaletteMark}
            notes={rhythm.tools}
            noteOptions={CHART_NOTE_OPTIONS}
            actions={CHART_PALETTE_ACTIONS}
            hint={
              rhythm.slash
                ? '2–7 lengths · . dot · T tie · X stem · / standard slash · K chord · 0 rest · ←→'
                : 'Pick a slash on the staff for its rhythm, or a bar’s rail for marks, then click a cell.'
            }
          />
        </aside>
      </div>

      {selectedChord && selection && (
        <ChordEditorPopup
          chord={selectedChord}
          keyRoot={song.keyRoot}
          mode={song.mode}
          tonic={tonic}
          onChange={(p) =>
            setSections(
              updateChord(
                sections,
                selection.sectionIdx,
                selection.barIdx,
                selection.chordIdx,
                p,
              ),
            )
          }
          onRemove={() => {
            setSections(
              removeChord(
                sections,
                selection.sectionIdx,
                selection.barIdx,
                selection.chordIdx,
              ),
            );
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
};
