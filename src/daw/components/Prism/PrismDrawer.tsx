import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { PrismPanel } from './PrismPanel';

// ── Props ────────────────────────────────────────────────────────────────

interface PrismDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function PrismDrawer({ open, onClose }: PrismDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* ── Overlay ──────────────────────────────────────── */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* ── Content ──────────────────────────────────────── */}
            <Dialog.Content asChild>
              <motion.div
                className="fixed top-0 left-0 z-50 flex h-full w-80 flex-col glass-panel"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRight: 'var(--glass-border-light)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {/* ── Header ───────────────────────────────────── */}
                <div
                  className="flex h-14 shrink-0 items-center justify-between px-4"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <span className="text-sm font-bold brand-gradient-text">
                    Prism
                  </span>

                  <Dialog.Close asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
                      style={{ color: 'var(--color-text-dim)' }}
                      aria-label="Close drawer"
                    >
                      <X size={16} strokeWidth={2} />
                    </motion.button>
                  </Dialog.Close>
                </div>

                {/* ── Body ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                  <PrismPanel />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
