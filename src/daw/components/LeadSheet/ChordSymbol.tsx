import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatChordSymbol, type ChordFormat } from '@/daw/midi/leadSheetUtils';
import { showWarning } from '@/components/utils/toast';
import type { ChordRegionIdentity } from '@/daw/harmony/chordIdentity';
import {
  CHORD_INPUT_HINT,
  chordInputText,
  typedChord,
  type TypedChord,
} from '@/daw/harmony/chordInput';
import { ChordInputHint, chordBoxBorder } from '@/daw/harmony/ChordInputHint';
import { keyFrameOf } from '@/daw/harmony/keyFrame';
import { formatChordRegion } from '@/daw/utils/chordRegionNotation';
import type { ChordNotation } from '@/lib/chordNotation';
import type { LeadSheetItem } from './leadSheetSelection';

interface ChordSymbolProps {
  noteName: string;
  degreeName?: string;
  /** Long degree key of the region ("2 minor7"), when it has one. */
  degreeKey?: string;
  /** The region's chord as pitch classes, when it has one. */
  identity?: ChordRegionIdentity;
  format: ChordFormat;
  /** Global chord notation; jazz / roman override `format`. Default hybrid. */
  notation?: ChordNotation;
  /** Key tonic pitch class and mode, for jazz / roman. */
  keyRootPc?: number | null;
  keyMode?: string;
  x: number;
  y: number;
  isSelected: boolean;
  regionId: string;
  isDragging?: boolean;
  onSelect: (regionId: string) => void;
  /** Write the chord typed over this one (harmony/chordInput reads it). */
  onRename: (regionId: string, chord: TypedChord) => void;
  /** The edit box closed without a chord: Escape, nothing typed, or text
   * that names no chord. A chord that was only pending goes. */
  onCancelEdit?: (regionId: string) => void;
  onDragStart?: (regionId: string, startClientX: number) => void;
  onMarkAsMelody?: (regionId: string) => void;
  onDelete?: (regionId: string) => void;
  /** Freshly inserted: open straight into the edit box so it can be typed. */
  autoEdit?: boolean;
  /** Selection-aware click, so Shift and ⌘ reach the sheet's selection. */
  onSelectItem?: (item: LeadSheetItem, event: React.MouseEvent) => void;
}

/**
 * Interactive chord symbol displayed above the staff.
 * - Click to select
 * - Double-click to edit inline
 */
export const ChordSymbol = memo(function ChordSymbol({
  noteName,
  degreeName,
  degreeKey,
  identity,
  format,
  notation = 'hybrid',
  keyRootPc,
  keyMode,
  x,
  y,
  isSelected,
  regionId,
  isDragging,
  onSelect,
  onRename,
  onCancelEdit,
  onDragStart,
  onMarkAsMelody,
  onDelete,
  autoEdit,
  onSelectItem,
}: ChordSymbolProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  // The last Enter found no chord in the text: the box stays and says so.
  const [refused, setRefused] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerOriginRef = useRef<{ x: number; moved: boolean } | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(regionId);
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [onSelect, regionId],
  );

  const formattedText = formatChordSymbol(noteName, format, degreeName);
  const displayText =
    notation === 'hybrid'
      ? formattedText
      : formatChordRegion(
          { name: degreeName ?? noteName, noteName, degreeKey, identity },
          notation,
          { keyRootPc, mode: keyMode },
          formattedText,
        );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditing) return;
      e.stopPropagation();
      pointerOriginRef.current = { x: e.clientX, moved: false };
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [isEditing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = pointerOriginRef.current;
      if (!origin) return;
      if (!origin.moved && Math.abs(e.clientX - origin.x) > 4) {
        origin.moved = true;
        onDragStart?.(regionId, origin.x);
      }
    },
    [onDragStart, regionId],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const origin = pointerOriginRef.current;
      pointerOriginRef.current = null;
      if (!origin?.moved) {
        // Was a click, not a drag
        e.stopPropagation();
        if (onSelectItem) onSelectItem({ kind: 'chord', regionId }, e);
        else onSelect(regionId);
      }
    },
    [onSelect, onSelectItem, regionId],
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const frame = keyFrameOf(keyRootPc, keyMode);
  // What a rename opens on: the chord as a symbol the box reads back.
  const currentText = chordInputText(
    { name: degreeName ?? noteName, noteName, degreeKey, identity },
    frame,
  );

  const startEditing = useCallback((text: string) => {
    setEditValue(text);
    setRefused(false);
    setIsEditing(true);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing(currentText);
    },
    [currentText, startEditing],
  );

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    setRefused(false);
  }, []);

  /**
   * Write the typed chord. Text that names no chord stays in the box with
   * the hint (`leaving` false, Enter), or goes with a toast that says why
   * (`leaving`, the box lost focus). Empty or unchanged text writes nothing.
   */
  const commitEdit = useCallback(
    (leaving: boolean) => {
      const trimmed = editValue.trim();
      if (!trimmed || (trimmed === currentText && !autoEdit)) {
        stopEditing();
        if (!trimmed) onCancelEdit?.(regionId);
        return;
      }
      const chord = typedChord(trimmed, frame);
      if (chord) {
        onRename(regionId, chord);
        stopEditing();
      } else if (!leaving) {
        setRefused(true);
      } else {
        showWarning(`"${trimmed}": ${CHORD_INPUT_HINT}`);
        stopEditing();
        onCancelEdit?.(regionId);
      }
    },
    [
      editValue,
      currentText,
      autoEdit,
      frame,
      onRename,
      onCancelEdit,
      regionId,
      stopEditing,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitEdit(false);
      } else if (e.key === 'Escape') {
        stopEditing();
        onCancelEdit?.(regionId);
      }
    },
    [commitEdit, stopEditing, onCancelEdit, regionId],
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // A chord just added by double-click or ⌘K opens empty, ready to type;
  // nothing is written until it names a chord.
  const openedRef = useRef(false);
  useEffect(() => {
    if (autoEdit && !openedRef.current) {
      openedRef.current = true;
      startEditing('');
    }
    if (!autoEdit) openedRef.current = false;
  }, [autoEdit, startEditing]);

  if (isEditing) {
    return (
      <>
        <foreignObject x={x - 4} y={y - 20} width={120} height={24}>
          <input
            ref={inputRef}
            value={editValue}
            placeholder="_"
            aria-label="Chord symbol"
            aria-invalid={refused || undefined}
            onChange={(e) => {
              setEditValue(e.target.value);
              setRefused(false);
            }}
            onBlur={() => commitEdit(true)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: '100%',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily:
                "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: chordBoxBorder(refused),
              borderRadius: '3px',
              padding: '0 4px',
              outline: 'none',
            }}
          />
        </foreignObject>
        {refused && (
          <foreignObject x={x - 4} y={y + 8} width={300} height={24}>
            <ChordInputHint
              style={{ position: 'static', display: 'inline-block' }}
            />
          </foreignObject>
        )}
      </>
    );
  }

  return (
    <>
      <text
        x={x}
        y={y}
        fontSize={16}
        fontWeight="bold"
        fontFamily="'Glacial Indifference', 'Haskoy', system-ui, sans-serif"
        fill="currentColor"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          opacity: isDragging ? 0.4 : 1,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {isSelected && (
          <tspan
            style={{
              stroke: 'var(--color-accent, #8b5cf6)',
              strokeWidth: 0.5,
            }}
          >
            {displayText}
          </tspan>
        )}
        {!isSelected && displayText}
      </text>

      {/* Context menu — rendered via portal to escape SVG */}
      {contextMenu &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 9999,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '4px 0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              minWidth: 140,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {onMarkAsMelody && (
              <button
                onClick={() => {
                  onMarkAsMelody(regionId);
                  setContextMenu(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--color-surface-3)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
              >
                Mark as Melody
              </button>
            )}
            <button
              onClick={() => {
                startEditing(currentText);
                setContextMenu(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--color-text)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--color-surface-3)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Rename
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(regionId);
                  setContextMenu(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--color-surface-3)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'none')
                }
              >
                Delete
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
});
