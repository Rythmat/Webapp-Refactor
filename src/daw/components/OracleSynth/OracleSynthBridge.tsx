import type { ReactNode } from 'react';

// ── Component ────────────────────────────────────────────────────────────
// Passthrough wrapper that will eventually manage the synchronisation
// between Oracle Synth's internal Zustand store and the SynthEngine
// (via useSyncStoreToEngine).  For now it simply renders its children.

interface OracleSynthBridgeProps {
  children: ReactNode;
}

export function OracleSynthBridge({ children }: OracleSynthBridgeProps) {
  // Phase 4 placeholder: will manage useSyncStoreToEngine when real
  // SynthLayout is embedded.
  return <>{children}</>;
}
