import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Combine,
  FileDown,
  ChevronRight,
  CornerDownLeft,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import { loadVexFlow } from '@/components/notation/StaffView';

// ── Palettes ───────────────────────────────────────────────────────────────
// The Score's editing tools, following MuseScore's Palettes panel: collapsible
// palettes of cells, each cell a real music glyph drawn over a dummy staff.
// Select something in the score, then single-click a cell to apply it — with
// nothing selected a click does nothing, exactly as it does there.

/** SMuFL codepoints, drawn in Bravura (the font VexFlow already loads). */
const GLYPH = {
  barlineSingle: '',
  repeatLeft: '',
  repeatRight: '',
} as const;

export type PaletteAction =
  | 'barline.normal'
  | 'repeat.start'
  | 'repeat.end'
  | 'layout.systemBreak'
  | 'layout.pageBreak'
  | 'layout.makeSystem'
  | 'text.rehearsalMark'
  | 'text.staffText'
  | 'jump.segno'
  | 'jump.coda'
  | 'jump.dc'
  | 'jump.ds'
  | 'jump.dcAlCoda'
  | 'jump.dsAlCoda';

export interface PaletteItem {
  action: PaletteAction;
  /** MuseScore's own name for the element; shown as the tooltip. */
  name: string;
  glyph?: string;
  /** Drawn as boxed text, the way a rehearsal mark reads. */
  boxed?: string;
  /** Drawn as small italic words, the way a jump or a directive is set. */
  words?: string;
  icon?: ReactNode;
}

export interface Palette {
  id: string;
  name: string;
  /** Cells sit over a five-line staff, except action icons. */
  staff: boolean;
  items: PaletteItem[];
}

/** Named and ordered after MuseScore's palettes (Text, then Barlines, Layout). */
export const SCORE_PALETTES: Palette[] = [
  {
    id: 'text',
    name: 'Text',
    staff: true,
    items: [
      { action: 'text.rehearsalMark', name: 'Rehearsal mark', boxed: 'B1' },
      {
        action: 'text.staffText',
        name: 'Staff text',
        // Type your own directive — "poco rit.", "swing", a cue, anything.
        words: 'Text',
      },
    ],
  },
  {
    id: 'barlines',
    name: 'Barlines',
    staff: true,
    items: [
      {
        action: 'barline.normal',
        name: 'Single barline',
        glyph: GLYPH.barlineSingle,
      },
      {
        action: 'repeat.start',
        name: 'Left (start) repeat sign',
        glyph: GLYPH.repeatLeft,
      },
      {
        action: 'repeat.end',
        name: 'Right (end) repeat sign',
        glyph: GLYPH.repeatRight,
      },
    ],
  },
  {
    id: 'layout',
    name: 'Layout',
    staff: false,
    items: [
      {
        action: 'layout.systemBreak',
        name: 'System break',
        icon: <CornerDownLeft className="size-4" />,
      },
      {
        action: 'layout.pageBreak',
        name: 'Page break',
        icon: <FileDown className="size-4" />,
      },
      {
        action: 'jump.segno',
        name: 'Segno',
        glyph: '\uE047',
      },
      {
        action: 'jump.coda',
        name: 'Coda',
        glyph: '\uE048',
      },
      { action: 'jump.dc', name: 'Da Capo', words: 'D.C.' },
      { action: 'jump.ds', name: 'Dal Segno', words: 'D.S.' },
      { action: 'jump.dcAlCoda', name: 'D.C. al Coda', words: 'D.C. al Coda' },
      { action: 'jump.dsAlCoda', name: 'D.S. al Coda', words: 'D.S. al Coda' },
      {
        action: 'layout.makeSystem',
        name: 'Make into system',
        // Bars drawn together onto one line.
        icon: <Combine className="size-4" />,
      },
    ],
  },
];

const STAFF_LINE_GAP = 6;
const STAFF_HEIGHT = STAFF_LINE_GAP * 4;

/** A cell's five-line staff, as MuseScore draws behind each element. */
function CellStaff() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 m-auto"
      width="100%"
      height={STAFF_HEIGHT + 1}
      style={{ opacity: 0.5 }}
      aria-hidden
    >
      {[0, 1, 2, 3, 4].map((line) => (
        <line
          key={line}
          x1={2}
          x2="100%"
          y1={line * STAFF_LINE_GAP + 0.5}
          y2={line * STAFF_LINE_GAP + 0.5}
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

export interface ScorePalettesProps {
  /** What the score has selected; without one, a cell click does nothing. */
  hasSelection: boolean;
  onApply: (action: PaletteAction) => void;
}

export function ScorePalettes({ hasSelection, onApply }: ScorePalettesProps) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SCORE_PALETTES.map((p) => [p.id, true])),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [singleClickOpens, setSingleClickOpens] = useState(true);
  const [oneAtATime, setOneAtATime] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cells are drawn in Bravura; make sure it is loaded even before a staff is.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadVexFlow().then(
      () => alive && setFontReady(true),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (searching) searchRef.current?.focus();
  }, [searching]);

  const palettes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SCORE_PALETTES;
    return SCORE_PALETTES.map((palette) => ({
      ...palette,
      items: palette.items.filter((item) =>
        item.name.toLowerCase().includes(needle),
      ),
    })).filter((palette) => palette.items.length > 0);
  }, [query]);

  const togglePalette = (id: string) => {
    setOpen((current) =>
      current[id]
        ? { ...current, [id]: false }
        : oneAtATime
          ? {
              ...Object.fromEntries(SCORE_PALETTES.map((p) => [p.id, false])),
              [id]: true,
            }
          : { ...current, [id]: true },
    );
  };

  const setAll = (value: boolean) =>
    setOpen(Object.fromEntries(SCORE_PALETTES.map((p) => [p.id, value])));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-1 pl-3 pr-1"
        style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}
      >
        {searching ? (
          <>
            <Search
              className="size-3.5 shrink-0"
              style={{ color: 'var(--color-text-dim)' }}
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('');
                  setSearching(false);
                }
              }}
              placeholder="Search palettes"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              style={{ color: 'var(--color-text)' }}
            />
            <button
              onClick={() => {
                setQuery('');
                setSearching(false);
              }}
              title="Close search"
              className="rounded p-1 hover:bg-white/10"
              style={{ color: 'var(--color-text-dim)' }}
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <span
              className="flex-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Palettes
            </span>
            <button
              onClick={() => setSearching(true)}
              title="Search palettes"
              className="rounded p-1 hover:bg-white/10"
              style={{ color: 'var(--color-text-dim)' }}
            >
              <Search className="size-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title="Palette options"
                className="rounded p-1 hover:bg-white/10"
                style={{ color: 'var(--color-text-dim)' }}
              >
                <MoreHorizontal className="size-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-7 z-50 w-56 rounded border py-1 text-xs shadow-lg"
                    style={{
                      background: 'var(--color-surface-2)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {[
                      {
                        label: 'Single-click to open a palette',
                        checked: singleClickOpens,
                        run: () => setSingleClickOpens((v) => !v),
                      },
                      {
                        label: 'Open only one palette at a time',
                        checked: oneAtATime,
                        run: () => setOneAtATime((v) => !v),
                      },
                      {
                        label: 'Collapse all palettes',
                        run: () => setAll(false),
                      },
                      { label: 'Expand all palettes', run: () => setAll(true) },
                    ].map((entry) => (
                      <button
                        key={entry.label}
                        onClick={() => {
                          entry.run();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-white/10"
                      >
                        <span className="w-3">
                          {entry.checked === undefined
                            ? ''
                            : entry.checked
                              ? '✓'
                              : ''}
                        </span>
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        {palettes.map((palette) => {
          const expanded = !!open[palette.id] || query.trim().length > 0;
          return (
            <div key={palette.id}>
              <button
                onClick={() => singleClickOpens && togglePalette(palette.id)}
                onDoubleClick={() =>
                  !singleClickOpens && togglePalette(palette.id)
                }
                className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text)' }}
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? (
                  <ChevronDown className="size-3.5 opacity-60" />
                ) : (
                  <ChevronRight className="size-3.5 opacity-60" />
                )}
                {palette.name}
              </button>
              {expanded && (
                <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                  {palette.items.map((item) => {
                    const live = hasSelection;
                    return (
                      <button
                        key={item.action}
                        onClick={() => live && onApply(item.action)}
                        title={item.name}
                        className="relative flex aspect-square items-center justify-center overflow-hidden rounded border transition-colors hover:bg-white/10"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-text)',
                          opacity: live ? 1 : 0.55,
                          cursor: live ? 'pointer' : 'default',
                        }}
                      >
                        {palette.staff && <CellStaff />}
                        {item.glyph ? (
                          <span
                            className="relative"
                            style={{
                              fontFamily: fontReady ? 'Bravura' : 'serif',
                              fontSize: STAFF_HEIGHT,
                              lineHeight: 1,
                            }}
                          >
                            {item.glyph}
                          </span>
                        ) : item.words ? (
                          <span
                            className="relative px-0.5 text-center text-[8px] font-semibold italic leading-tight"
                            style={{ marginBottom: STAFF_HEIGHT / 2 }}
                          >
                            {item.words}
                          </span>
                        ) : item.boxed ? (
                          <span
                            className="relative rounded-[1px] border px-0.5 text-[10px] font-bold"
                            style={{
                              borderColor: 'currentColor',
                              marginBottom: STAFF_HEIGHT,
                              background: 'var(--color-surface-2)',
                            }}
                          >
                            {item.boxed}
                          </span>
                        ) : (
                          item.icon
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="shrink-0 px-3 py-2 text-[10px] leading-snug"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-dim)',
        }}
      >
        {hasSelection
          ? 'Click a cell to apply it. ↵ system break · ⌘M rehearsal mark · ⌫ clear'
          : 'Select a barline in the score, then click a palette cell.'}
      </div>
    </div>
  );
}
