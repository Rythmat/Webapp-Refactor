import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Minimize2 } from 'lucide-react';

// ── PopOutOverlay ────────────────────────────────────────────────────────
// Reusable full-screen portal overlay for oversized channel strip components.
// Mirrors Ableton's plugin-window pattern: click Maximize2 on a device card
// to open it at full viewport size, click Minimize2 to close.

interface PopOutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  trackColor?: string;
  children: React.ReactNode;
}

export function PopOutOverlay({
  isOpen,
  onClose,
  title,
  trackColor,
  children,
}: PopOutOverlayProps) {
  if (!isOpen) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Minimal header */}
      <div
        className="flex shrink-0 items-center border-b px-3"
        style={{ borderColor: 'var(--color-border)', height: 36 }}
      >
        {trackColor && (
          <div
            className="mr-1.5 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: trackColor }}
          />
        )}
        {title && (
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {title}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
          title="Close"
        >
          <Minimize2 size={13} strokeWidth={1.8} />
        </button>
      </div>

      {/* Full-screen body */}
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </motion.div>,
    document.body,
  );
}
