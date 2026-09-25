export interface SceneProps {
  /** Index of the current step within this scene's tab. */
  stepIndex: number;
  /**
   * `auto`: the tour is driving (scene animates the current step).
   * `user`: the visitor took over (scene is freely interactive).
   * `static`: reduced motion (show each step's end state, no timers).
   */
  mode: 'auto' | 'user' | 'static';
  /** False while the tour is offscreen or the page is hidden (stop loops). */
  visible: boolean;
  /** Narrow layout (mobile). */
  compact: boolean;
  /** Tell the tour the visitor interacted (pauses auto-advance). */
  onUserAction: () => void;
  /** Play notes from a user gesture (enables sound on first use). */
  playNotes: (midis: number[], seconds?: number) => void;
}
