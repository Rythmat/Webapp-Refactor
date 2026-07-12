// ── KickedModal ──────────────────────────────────────────────────────────
// Shown after the host removes the local user from a collaborative session.
// The session is already torn down (the user is back in a local studio); this
// just explains why.

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserX } from 'lucide-react';
import { useStore } from '@/daw/store/index';

export function KickedModal() {
  const kicked = useStore((s) => s.kickedNotice);
  const setKicked = useStore((s) => s._setKickedNotice);

  return createPortal(
    <AnimatePresence>
      {kicked && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setKicked(false)}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Centering wrapper — flex (not translate) so the scale animation
              can't clobber the centering transform. */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex w-[340px] flex-col gap-4 rounded-xl p-5 shadow-2xl"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div className="flex items-center gap-2">
                <UserX
                  size={14}
                  strokeWidth={2}
                  style={{ color: 'var(--color-record)' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Removed from session
                </span>
              </div>

              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-dim)' }}
              >
                You have been kicked from the studio session.
              </p>

              <button
                onClick={() => setKicked(false)}
                className="rounded-md py-2 text-xs font-medium transition-colors hover:brightness-110"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                OK
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
