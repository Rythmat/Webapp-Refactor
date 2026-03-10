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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="flex flex-col overflow-hidden rounded-lg"
        style={{
          backgroundColor: '#191919',
          width: '70vw',
          height: '70vh',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal header */}
        <div
          className="flex shrink-0 items-center border-b px-3"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', height: 36 }}
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
          <button
            onClick={onClose}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
            style={{
              color: '#6b6b80',
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

        {/* Body */}
        <div className="relative flex-1 overflow-hidden">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
