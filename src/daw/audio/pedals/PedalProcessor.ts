// ── PedalProcessor ─────────────────────────────────────────────────────────
// Common interface for all guitar/bass pedal effect processors.
// Each processor manages its own internal Web Audio graph and bypass logic.

export interface PedalProcessor {
  readonly type: string;

  /** Native AudioNode accepting signal into this processor. */
  getInputNode(): AudioNode;

  /** Native AudioNode emitting the processed (or bypassed) signal. */
  getOutputNode(): AudioNode;

  /** Toggle bypass. When disabled, input passes directly to output. */
  setEnabled(enabled: boolean): void;

  /** Update effect parameters (0-1 normalized knob values). */
  updateParams(params: Record<string, number>): void;

  /** Disconnect and release all internal nodes. */
  dispose(): void;
}

/** Block descriptor passed from the UI to syncChain(). */
export interface PedalBlockDescriptor {
  type: string;
  enabled: boolean;
  params: Record<string, number>;
  namModelId?: string | null;
}
