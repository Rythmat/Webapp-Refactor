import { LearnRoutes } from '@/constants/routes';

// Where each Anatomy lesson was before it moved into Audio (2026-11-01), so old
// links and saved bookmarks still open it. `to` is a function so the catalog's
// helpers stay the one place a lesson's path is written.

export const ANATOMY_MOVES: readonly { from: string; to: () => string }[] = [
  {
    from: '/learn/keyboard/technique/anatomy',
    to: () => LearnRoutes.pianoAnatomy(),
  },
  {
    from: '/learn/keyboard/technique/keyboard-anatomy',
    to: () => LearnRoutes.keyboardAnatomy(),
  },
  {
    from: '/learn/keyboard/technique/synth-anatomy',
    to: () => LearnRoutes.synthAnatomy(),
  },
  {
    from: '/learn/guitar/technique/anatomy',
    to: () => LearnRoutes.guitarAnatomy(),
  },
  {
    from: '/learn/bass/technique/anatomy',
    to: () => LearnRoutes.bassAnatomy(),
  },
  {
    from: '/learn/ukulele/technique/anatomy',
    to: () => LearnRoutes.ukuleleAnatomy(),
  },
  { from: '/learn/gear/headphones', to: () => LearnRoutes.headphoneAnatomy() },
  { from: '/learn/gear/microphone', to: () => LearnRoutes.microphoneAnatomy() },
  { from: '/learn/gear/combo-amp', to: () => LearnRoutes.comboAmpAnatomy() },
];
