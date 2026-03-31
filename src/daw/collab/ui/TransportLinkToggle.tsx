// ── TransportLinkToggle ──────────────────────────────────────────────────
// A small toggle button in the transport bar that links/unlinks the local
// transport from remote collaborators' play/pause/seek commands.

import { motion } from 'framer-motion';
import { Link, Unlink } from 'lucide-react';
import { useStore } from '@/daw/store/index';

export function TransportLinkToggle() {
  const isActive = useStore((s) => s.isCollabActive);
  const linked = useStore((s) => s.transportLinked);
  const setLinked = useStore((s) => s.setTransportLinked);

  if (!isActive) return null;

  const Icon = linked ? Link : Unlink;

  return (
    <motion.button
      onClick={() => setLinked(!linked)}
      whileTap={{ scale: 0.85 }}
      className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
      style={{
        color: linked ? 'var(--color-accent)' : 'var(--color-text-dim)',
      }}
      title={
        linked
          ? 'Transport linked — click to unlink'
          : 'Transport unlinked — click to link'
      }
    >
      <Icon size={11} strokeWidth={2} />
    </motion.button>
  );
}
