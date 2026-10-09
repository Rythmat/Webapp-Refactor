/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  ChevronRight,
  ChevronDown,
  X,
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
  Timer,
  AudioWaveform,
  Music,
  Drum,
  Zap,
  Layers,
  TrendingUp,
  Mic,
  Cloud,
  Library,
  Search,
  Lightbulb,
  Sparkles,
  AudioLines,
  Flame,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  LIBRARY_ITEMS,
  LIBRARY_CATEGORIES,
  DRAG_MIME,
  searchLibraryItems,
  type LibraryItem,
  type LibraryCategory,
} from '@/daw/data/libraryItems';
import { InsightContent } from './InsightContent';
import { openSession } from '@/daw/session/openSession';

// ── Icon lookup ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
  Timer,
  AudioWaveform,
  Music,
  Drum,
  Zap,
  Layers,
  TrendingUp,
  Mic,
  Cloud,
  Library,
  Sparkles,
  AudioLines,
  Flame,
};

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

// ── LibraryPanel ────────────────────────────────────────────────────────

type PanelTab = 'library' | 'insight';

export function LibraryPanel() {
  const libraryOpen = useStore((s) => s.libraryOpen);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PanelTab>('insight');

  // Analyzing a selection (e.g. from the piano roll) brings Insight forward.
  const selectionAnalysis = useStore((s) => s.selectionAnalysis);
  useEffect(() => {
    if (selectionAnalysis) setActiveTab('insight');
  }, [selectionAnalysis]);

  const filteredLibraryItems = useMemo(
    () => (searchQuery ? searchLibraryItems(searchQuery) : LIBRARY_ITEMS),
    [searchQuery],
  );

  return (
    <AnimatePresence>
      {libraryOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={SPRING}
          className="shrink-0 flex flex-col overflow-hidden border-l"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Tab header */}
          <div
            className="flex items-center shrink-0 border-b"
            style={{ height: 28, borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setActiveTab('insight')}
              className="flex items-center gap-1 px-3 h-full cursor-pointer"
              style={{
                color:
                  activeTab === 'insight'
                    ? 'var(--color-text)'
                    : 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'insight'
                    ? '1px solid var(--color-accent)'
                    : '1px solid transparent',
              }}
            >
              <Lightbulb
                size={11}
                strokeWidth={1.5}
                style={{
                  color:
                    activeTab === 'insight' ? 'var(--color-accent)' : undefined,
                }}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Insight
              </span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-1 px-3 h-full cursor-pointer"
              style={{
                color:
                  activeTab === 'library'
                    ? 'var(--color-text)'
                    : 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'library'
                    ? '1px solid var(--color-accent)'
                    : '1px solid transparent',
              }}
            >
              <Library
                size={11}
                strokeWidth={1.5}
                style={{
                  color:
                    activeTab === 'library' ? 'var(--color-accent)' : undefined,
                }}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Library
              </span>
            </button>
            <div className="flex-1" />
            <button
              onClick={toggleLibrary}
              className="flex items-center justify-center w-5 h-5 rounded cursor-pointer mr-1.5"
              style={{
                color: 'var(--color-text-dim)',
                border: 'none',
                background: 'none',
              }}
            >
              <X size={11} strokeWidth={2} />
            </button>
          </div>

          {activeTab === 'library' && (
            <>
              {/* Search */}
              <div
                className="px-2 py-1.5 shrink-0 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div
                  className="flex items-center gap-1.5 rounded px-2 py-1"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Search
                    size={11}
                    strokeWidth={1.5}
                    style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-[10px] bg-transparent outline-none w-full"
                    style={{ color: 'var(--color-text)', border: 'none' }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="flex items-center justify-center cursor-pointer"
                      style={{
                        color: 'var(--color-text-dim)',
                        border: 'none',
                        background: 'none',
                        flexShrink: 0,
                      }}
                    >
                      <X size={9} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable body */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {LIBRARY_CATEGORIES.map((cat) => {
                  const items = filteredLibraryItems.filter(
                    (i) => i.category === cat,
                  );
                  if (searchQuery && items.length === 0) return null;
                  return (
                    <CategorySection key={cat} category={cat} items={items} />
                  );
                })}

                {searchQuery && filteredLibraryItems.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      No results for &ldquo;{searchQuery}&rdquo;
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'insight' && (
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <InsightContent />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Category Section ────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
}: {
  category: LibraryCategory;
  items: LibraryItem[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
        style={{
          color: 'var(--color-text-dim)',
          background: 'none',
          border: 'none',
        }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="ml-1">{category}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            {items.map((item) => (
              <LibraryItemRow key={item.id} item={item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Library Item Row ────────────────────────────────────────────────────

/**
 * Open a template in place of the project, as the dashboard's template tile
 * does (decision D10), through openSession: no question first (owner
 * decision 6), the work it replaces is kept with a Restore, a take still
 * recording is stopped and kept first, and the template is a new project,
 * so a Save makes a new cloud project rather than writing over the one it
 * replaced. Never in a shared session (E15: membership is the room id),
 * where it would replace the room's project for everyone.
 */
function openTemplate(templateId: string): void {
  if (useStore.getState().roomId !== null) return;
  void openSession({ kind: 'template', templateId }, { source: 'library' });
}

function LibraryItemRow({ item }: { item: LibraryItem }) {
  const isProjectTemplate = item.dragPayload.kind === 'project-template';
  const inRoom = useStore((s) => isProjectTemplate && s.roomId !== null);
  const disabled = item.disabled || inRoom;

  const handleClick = useCallback(() => {
    if (!isProjectTemplate) return;
    const templateId = (
      item.dragPayload as { kind: 'project-template'; templateId: string }
    ).templateId;
    openTemplate(templateId);
  }, [isProjectTemplate, item.dragPayload]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isProjectTemplate) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item.dragPayload));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [item.dragPayload, isProjectTemplate],
  );

  const Icon = ICON_MAP[item.icon];

  return (
    <div
      draggable={!item.disabled && !isProjectTemplate}
      onDragStart={
        item.disabled || isProjectTemplate ? undefined : handleDragStart
      }
      onClick={isProjectTemplate && !disabled ? handleClick : undefined}
      aria-disabled={isProjectTemplate && disabled ? true : undefined}
      title={inRoom ? 'Leave the shared session to open a template' : undefined}
      className="flex items-center gap-2 px-4 py-1 text-[11px] transition-colors"
      style={{
        color: disabled ? 'var(--color-text-dim)' : 'var(--color-text)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : isProjectTemplate ? 'pointer' : 'grab',
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ color: item.color }}>
        {Icon ? <Icon size={14} strokeWidth={1.5} /> : null}
      </span>
      {item.label}
      {item.disabled && (
        <span
          className="ml-auto text-[8px] uppercase font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Soon
        </span>
      )}
    </div>
  );
}
