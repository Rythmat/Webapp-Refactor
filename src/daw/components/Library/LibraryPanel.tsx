import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, X, Library, Search, Lightbulb } from 'lucide-react';
import {
  Gauge, ShieldCheck, SlidersHorizontal, Waves, Timer,
  AudioWaveform, Music, Drum, Zap, Layers, TrendingUp,
  Mic, Cloud, Sparkles, AudioLines, Flame,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import { LIBRARY_ITEMS, LIBRARY_CATEGORIES, DRAG_MIME, searchLibraryItems } from '@/daw/data/libraryItems';
import type { LibraryItem, LibraryCategory } from '@/daw/data/libraryItems';
import type { LucideIcon } from 'lucide-react';
import { InsightContent } from './InsightContent';

// ── Icon lookup ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Gauge, ShieldCheck, SlidersHorizontal, Waves, Timer,
  AudioWaveform, Music, Drum, Zap, Layers, TrendingUp,
  Mic, Cloud, Library, Sparkles, AudioLines, Flame,
};

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

// ── LibraryPanel ────────────────────────────────────────────────────────

type PanelTab = 'library' | 'insight';

export function LibraryPanel() {
  const libraryOpen = useStore((s) => s.libraryOpen);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PanelTab>('insight');

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
                color: activeTab === 'insight' ? 'var(--color-text)' : 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'insight' ? '1px solid var(--color-accent)' : '1px solid transparent',
              }}
            >
              <Lightbulb size={11} strokeWidth={1.5} style={{ color: activeTab === 'insight' ? 'var(--color-accent)' : undefined }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Insight</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-1 px-3 h-full cursor-pointer"
              style={{
                color: activeTab === 'library' ? 'var(--color-text)' : 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'library' ? '1px solid var(--color-accent)' : '1px solid transparent',
              }}
            >
              <Library size={11} strokeWidth={1.5} style={{ color: activeTab === 'library' ? 'var(--color-accent)' : undefined }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Library</span>
            </button>
            <div className="flex-1" />
            <button
              onClick={toggleLibrary}
              className="flex items-center justify-center w-5 h-5 rounded cursor-pointer mr-1.5"
              style={{ color: 'var(--color-text-dim)', border: 'none', background: 'none' }}
            >
              <X size={11} strokeWidth={2} />
            </button>
          </div>

          {activeTab === 'library' && (
            <>
              {/* Search */}
              <div className="px-2 py-1.5 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div
                  className="flex items-center gap-1.5 rounded px-2 py-1"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <Search size={11} strokeWidth={1.5} style={{ color: 'var(--color-text-dim)', flexShrink: 0 }} />
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
                      style={{ color: 'var(--color-text-dim)', border: 'none', background: 'none', flexShrink: 0 }}
                    >
                      <X size={9} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {LIBRARY_CATEGORIES.map((cat) => {
                  const items = filteredLibraryItems.filter((i) => i.category === cat);
                  if (searchQuery && items.length === 0) return null;
                  return <CategorySection key={cat} category={cat} items={items} />;
                })}

                {searchQuery && filteredLibraryItems.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
                      No results for &ldquo;{searchQuery}&rdquo;
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'insight' && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <InsightContent />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Category Section ────────────────────────────────────────────────────

function CategorySection({ category, items }: { category: LibraryCategory; items: LibraryItem[] }) {
  const [open, setOpen] = useState(true);
  const [confirmTemplateId, setConfirmTemplateId] = useState<string | null>(null);
  const loadProjectTemplate = useStore((s) => s.loadProjectTemplate);

  const confirmLabel = confirmTemplateId
    ? items.find((i) => i.dragPayload.kind === 'project-template' && (i.dragPayload as { templateId: string }).templateId === confirmTemplateId)?.label ?? ''
    : '';

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
        style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
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
              <LibraryItemRow
                key={item.id}
                item={item}
                onRequestConfirm={(templateId) => setConfirmTemplateId(templateId)}
              />
            ))}
            {confirmTemplateId && (
              <ConfirmReplaceDialog
                templateLabel={confirmLabel}
                onConfirm={() => {
                  loadProjectTemplate(confirmTemplateId);
                  setConfirmTemplateId(null);
                }}
                onCancel={() => setConfirmTemplateId(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confirmation Dialog ─────────────────────────────────────────────────

function ConfirmReplaceDialog({
  templateLabel,
  onConfirm,
  onCancel,
}: {
  templateLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="px-3 py-2 mx-2 mb-2 rounded-lg"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-[10px] mb-2" style={{ color: 'var(--color-text)' }}>
        Replace current project with <strong>{templateLabel}</strong> template?
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onConfirm}
          className="flex-1 py-1 rounded text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#000',
            border: 'none',
          }}
        >
          Replace
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1 rounded text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Library Item Row ────────────────────────────────────────────────────

function LibraryItemRow({
  item,
  onRequestConfirm,
}: {
  item: LibraryItem;
  onRequestConfirm?: (templateId: string) => void;
}) {
  const tracks = useStore((s) => s.tracks);
  const loadProjectTemplate = useStore((s) => s.loadProjectTemplate);

  const isProjectTemplate = item.dragPayload.kind === 'project-template';

  const handleClick = useCallback(() => {
    if (!isProjectTemplate) return;
    const templateId = (item.dragPayload as { kind: 'project-template'; templateId: string }).templateId;
    if (tracks.length > 0 && onRequestConfirm) {
      onRequestConfirm(templateId);
    } else {
      loadProjectTemplate(templateId);
    }
  }, [isProjectTemplate, item.dragPayload, tracks.length, onRequestConfirm, loadProjectTemplate]);

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
      onDragStart={item.disabled || isProjectTemplate ? undefined : handleDragStart}
      onClick={isProjectTemplate ? handleClick : undefined}
      className="flex items-center gap-2 px-4 py-1 text-[11px] transition-colors"
      style={{
        color: item.disabled ? 'var(--color-text-dim)' : 'var(--color-text)',
        opacity: item.disabled ? 0.5 : 1,
        cursor: item.disabled ? 'default' : isProjectTemplate ? 'pointer' : 'grab',
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
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
