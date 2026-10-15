import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { POP_OUT_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { THEMES } from '@/daw/constants/themes';

// ── PopOutOverlay ────────────────────────────────────────────────────────
// Reusable full-screen portal overlay for oversized channel strip components.
// Mirrors Ableton's plugin-window pattern: click Maximize2 on a device card
// to open it at full viewport size, click the X (or hit Esc) to close.

interface PopOutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  trackColor?: string;
  /** Fill (nearly) the whole window — for fixed-canvas views like the
   *  Oracle synth that benefit from maximum area. Default 70vw×70vh. */
  fullScreen?: boolean;
  children: React.ReactNode;
}

export function PopOutOverlay({
  isOpen,
  onClose,
  title,
  trackColor,
  fullScreen = false,
  children,
}: PopOutOverlayProps) {
  // ── Esc closes the overlay ──────────────────────────────────────────────
  // A dialog in the key precedence (the popOut scope), so Escape closes it
  // rather than stopping the music. A field, a menu or a dialog inside it
  // (the preset save dialog, a rename) gets Escape first. Every other key
  // still reaches the editor: the transport and the computer keyboard work
  // over the synth.
  useKeymap(
    POP_OUT_SCOPE.id,
    { 'popOut.close': () => onClose() },
    {
      active: isOpen,
    },
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="flex flex-col overflow-hidden rounded-lg"
        style={{
          // The portal mounts in <body>, outside .daw-root where useTheme sets
          // the Studio palette — re-apply it here or the panel and the
          // instrument inside it render see-through.
          ...(THEMES.dark as React.CSSProperties),
          backgroundColor: 'var(--color-surface)',
          width: fullScreen ? 'calc(100vw - 24px)' : '70vw',
          height: fullScreen ? 'calc(100vh - 24px)' : '70vh',
          border: 'var(--glass-border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal header */}
        <div
          className="flex shrink-0 items-center border-b px-3"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', height: 40 }}
        >
          {trackColor && (
            <div
              className="mr-1.5 size-2 shrink-0 rounded-full"
              style={{ backgroundColor: trackColor }}
            />
          )}
          {title && (
            <span className="text-xs font-medium" style={{ color: '#6b6b80' }}>
              {title}
            </span>
          )}
          <div className="flex-1" />
          {/* Close — a labelled, high-contrast button so it can't be mistaken
              for part of the instrument painted right below this bar. */}
          <button
            onClick={onClose}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors"
            style={{
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.12)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.24)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')
            }
            aria-label="Close"
            title="Close (Esc)"
          >
            <X size={15} strokeWidth={2.25} />
            Close
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-hidden">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
