import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatChordSymbol, type ChordFormat } from '@/daw/midi/leadSheetUtils';

interface ChordSymbolProps {
  noteName: string;
  degreeName?: string;
  format: ChordFormat;
  x: number;
  y: number;
  isSelected: boolean;
  regionId: string;
  isDragging?: boolean;
  onSelect: (regionId: string) => void;
  onRename: (regionId: string, newNoteName: string) => void;
  onDragStart?: (regionId: string, startClientX: number) => void;
  onMarkAsMelody?: (regionId: string) => void;
  onDelete?: (regionId: string) => void;
}

/**
 * Interactive chord symbol displayed above the staff.
 * - Click to select
 * - Double-click to edit inline
 */
export const ChordSymbol = memo(function ChordSymbol({
  noteName,
  degreeName,
  format,
  x,
  y,
  isSelected,
  regionId,
  isDragging,
  onSelect,
  onRename,
  onDragStart,
  onMarkAsMelody,
  onDelete,
}: ChordSymbolProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
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

  const displayText = formatChordSymbol(noteName, format, degreeName);

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
        onSelect(regionId);
      }
    },
    [onSelect, regionId],
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(noteName);
      setIsEditing(true);
    },
    [noteName],
  );

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== noteName) {
      onRename(regionId, trimmed);
    }
    setIsEditing(false);
  }, [editValue, noteName, onRename, regionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    },
    [commitEdit],
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <foreignObject x={x - 4} y={y - 20} width={120} height={24}>
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'serif',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-accent, #8b5cf6)',
            borderRadius: '3px',
            padding: '0 4px',
            outline: 'none',
          }}
        />
      </foreignObject>
    );
  }

  return (
    <>
      <text
        x={x}
        y={y}
        fontSize={16}
        fontWeight="bold"
        fontFamily="serif"
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
                setEditValue(noteName);
                setIsEditing(true);
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
