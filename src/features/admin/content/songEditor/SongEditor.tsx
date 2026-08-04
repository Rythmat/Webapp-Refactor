import { Clock, Gauge, Signal } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  getKeyColor,
  GENRE_DISPLAY_LABELS,
} from '@/components/common/CircleOfFifthsSvg';
import {
  ChordChart,
  type ChordChartEditable,
  type ChordChartLoc,
} from '@/components/songLibrary/ChordChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Song } from '@/curriculum/types/songLibrary';
import type { StructuredEditorProps } from '../editorTypes';
import {
  addChordAt,
  addSection,
  insertBar,
  MAX_BARS_PER_ROW,
  moveSection,
  removeBar,
  removeChord,
  removeSection,
  updateChord,
  updateSection,
} from '../songChart/chartOps';
import { AdvancedFields } from './AdvancedFields';
import { ArtistImageUpload } from './ArtistImageUpload';
import { ChordEditorPopup } from './ChordEditorPopup';
import { KeyPicker } from './KeyPicker';
import { YouTubeField } from './YouTubeField';
import { slugify } from './songDefaults';

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: "'Glacial Indifference', 'Fraunces', system-ui, sans-serif",
  fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
  fontWeight: 600,
  lineHeight: 1.1,
};

const ACTION_ICONS = [
  { label: 'Open in Lesson', src: '/icons/learn-icon.svg' },
  { label: 'Open in Studio', src: '/icons/studio-icon.svg' },
  { label: 'Open in Globe', src: '/icons/globe-icon.svg' },
];

/**
 * WYSIWYG song editor — an editable replica of the published SongDetailPage.
 * Every visible element is an input over the same layout, so "what you edit is
 * what students see." Owns the entire `Song` body; the chord chart reuses the
 * real ChordChart (click-to-select) plus the shared chart-ops/inspector.
 */
export const SongEditor = ({ body, onChange }: StructuredEditorProps) => {
  const song = body as unknown as Song;
  const [selection, setSelection] = useState<ChordChartLoc | null>(null);
  const initialHadId = useRef(!!song.id);
  const [idTouched, setIdTouched] = useState(false);

  const patch = (p: Partial<Song>) =>
    onChange({ ...(body as Record<string, unknown>), ...p });

  const patchWithId = (p: Partial<Song>) => {
    if ('id' in p) setIdTouched(true);
    patch(p);
  };

  const setTitle = (title: string) => {
    const autoSlug = !initialHadId.current && !idTouched;
    patch(autoSlug ? { title, id: slugify(title) } : { title });
  };

  const [ts0, ts1] = song.timeSignature ?? [4, 4];
  const [kr, kg, kb] = getKeyColor(song);

  const sections = song.sections ?? [];
  const setSections = (next: typeof sections) => patch({ sections: next });
  const selectedChord = selection
    ? (sections[selection.sectionIdx]?.bars[selection.barIdx]?.chords[
        selection.chordIdx
      ] ?? null)
    : null;

  const genre = song.genreTags?.[0] ?? '';
  const setGenre = (value: string) => {
    const rest = (song.genreTags ?? []).slice(1);
    patch({ genreTags: value.trim() ? [value.trim(), ...rest] : rest });
  };

  // Grow a row to fit its bars (capped), so the editor and the published chart
  // render identically. Authored per-section, so existing songs are untouched.
  const fitRow = (secs: typeof sections, si: number) =>
    updateSection(secs, si, {
      measuresPerRow: Math.max(
        1,
        Math.min(MAX_BARS_PER_ROW, secs[si].bars.length),
      ),
    });

  // Direct-manipulation callbacks for the editable chart.
  const editable: ChordChartEditable = {
    onAddChordAtBeat: (si, bi, beat) => {
      const next = addChordAt(sections, si, bi, beat);
      setSections(next);
      const chordIdx = next[si].bars[bi].chords.findIndex(
        (c) => c.beat === beat,
      );
      setSelection({ sectionIdx: si, barIdx: bi, chordIdx });
    },
    onMoveChord: (loc, toBeat) =>
      setSections(
        updateChord(sections, loc.sectionIdx, loc.barIdx, loc.chordIdx, {
          beat: toBeat,
        }),
      ),
    onInsertBar: (si, atIdx) =>
      setSections(fitRow(insertBar(sections, si, atIdx), si)),
    onRemoveBar: (si, bi) => {
      const next = removeBar(sections, si, bi);
      setSections(next[si] ? fitRow(next, si) : next);
      if (selection?.sectionIdx === si && selection.barIdx === bi)
        setSelection(null);
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
    sectionCount: sections.length,
  };

  return (
    <div className="flex min-w-0 flex-col" style={{ background: '#101012' }}>
      {/* ── Header hero ── */}
      <header className="relative flex-shrink-0 overflow-hidden px-6 py-4 md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(${kr},${kg},${kb},0.12) 0%, rgba(${kr},${kg},${kb},0) 70%)`,
          }}
        />
        <div className="relative z-10 flex items-start gap-4 md:gap-5">
          <ArtistImageUpload song={song} onPatch={patch} />

          {/* Identity + metadata */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
            <div
              className="flex min-w-0 items-baseline text-white"
              style={TITLE_STYLE}
            >
              <span className="text-white/70">“</span>
              <input
                value={song.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title"
                className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/25"
                style={TITLE_STYLE}
              />
              <span className="text-white/70">”</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                value={song.artist}
                onChange={(e) => patch({ artist: e.target.value })}
                placeholder="Artist"
                className="min-w-0 flex-1 bg-transparent text-white/55 outline-none placeholder:text-white/25"
              />
              <span className="text-white/25">·</span>
              <input
                type="number"
                value={song.year ?? ''}
                onChange={(e) =>
                  patch({
                    year: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Year"
                className="w-16 bg-transparent text-white/35 outline-none placeholder:text-white/25"
              />
            </div>

            {/* Metadata stat row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <KeyPicker song={song} onPatch={patch} />
              <span aria-hidden className="text-white/20">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Gauge size={15} />
                <input
                  type="number"
                  value={song.tempo}
                  onChange={(e) => patch({ tempo: Number(e.target.value) })}
                  className="w-12 bg-transparent text-white/90 outline-none"
                />
                <span className="text-white/50">BPM</span>
              </span>
              <span aria-hidden className="text-white/20">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Clock size={15} />
                <input
                  type="number"
                  value={ts0}
                  onChange={(e) =>
                    patch({
                      timeSignature: [Number(e.target.value), ts1] as [
                        number,
                        number,
                      ],
                    })
                  }
                  className="w-8 bg-transparent text-center text-white/90 outline-none"
                />
                <span className="text-white/90">/</span>
                <input
                  type="number"
                  value={ts1}
                  onChange={(e) =>
                    patch({
                      timeSignature: [ts0, Number(e.target.value)] as [
                        number,
                        number,
                      ],
                    })
                  }
                  className="w-8 bg-transparent text-center text-white/90 outline-none"
                />
              </span>
              <span aria-hidden className="text-white/20">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Signal size={15} />
                <span className="text-white/90">Lvl.</span>
                <Select
                  value={String(song.difficulty)}
                  onValueChange={(v) =>
                    patch({ difficulty: Number(v) as Song['difficulty'] })
                  }
                >
                  <SelectTrigger className="h-7 w-[56px] px-2">
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

            {/* Action icons (shown to students; not editable) */}
            <div
              className="flex items-center gap-2 pt-1"
              title="Shown to students"
            >
              {ACTION_ICONS.map(({ label, src }) => (
                <span
                  key={label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg opacity-40"
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
          </div>

          <YouTubeField song={song} onPatch={patch} />
        </div>
      </header>

      {/* ── Chord chart (direct-manipulation editor) ── */}
      <div className="min-w-0 px-6 pb-6 pt-4 md:px-10">
        <p className="mb-3 text-xs text-muted-foreground">
          Click a beat to add a chord · drag a chord to move it · +/− above a
          bar to add or remove bars · click a chord to edit it.
        </p>
        <ChordChart
          song={song}
          onSelectChord={setSelection}
          selection={selection}
          editable={editable}
        />

        {selectedChord && selection && (
          <ChordEditorPopup
            chord={selectedChord}
            keyRoot={song.keyRoot}
            mode={song.mode}
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

        <div className="mt-8">
          <AdvancedFields song={song} onPatch={patchWithId} />
        </div>
      </div>
    </div>
  );
};
