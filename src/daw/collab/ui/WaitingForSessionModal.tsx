// ── WaitingForSessionModal ───────────────────────────────────────────────
// Shown to a jam→studio joiner who reached PartyKit before the host created
// the room. The join silently retries (see CollabProvider.joinRoomAwaitingHost)
// and this loading popup stays up until the room appears or the retry times out.

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/daw/store/index';

export function WaitingForSessionModal() {
  const waiting = useStore((s) => s.awaitingSessionCreation);

  return createPortal(
    <AnimatePresence>
      {waiting && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Centering wrapper */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex w-[340px] flex-col items-center gap-4 rounded-xl p-6 shadow-2xl"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Spinner */}
              <div
                className="size-6 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: 'var(--color-accent)',
                  borderTopColor: 'transparent',
                }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Waiting on session creation...
              </span>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
