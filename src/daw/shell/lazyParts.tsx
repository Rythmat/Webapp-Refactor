import { useEffect } from 'react';
import {
  getTutorial,
  type TutorialStep,
} from '@/daw/components/Tutorial/tutorials';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId, ViewType } from '@/daw/store/uiSlice';
import { lazyPart, PartPlaceholder, useOpenedOnce } from './lazyPart';

// ── The editor's lazily loaded parts (milestone 1.12a) ─────────────────────
//
// Every part of the editor that loads on first use, in one place, so the
// shell, the dock and the lessons preload the same chunks: the views other
// than Create, the dock's tabs, the instrument views and the dialogs that
// open on demand. What stays in the editor's chunk is what a session shows
// on first paint: the transport, the timeline and its headers, the library
// column, the dock's tab bar and the session, draft and save machinery.
// bundle.mjs checks that chunk against its 150 kB gzip budget.

const view = (label: string) => <PartPlaceholder label={label} />;

// ── Views ───────────────────────────────────────────────────────────────────

export const ScoreViewPart = lazyPart(
  () => import('@/daw/components/Score/ScoreView').then((m) => m.ScoreView),
  { name: 'Score', fallback: view('Loading the Score') },
);

export const StudioViewPart = lazyPart(
  () => import('@/daw/shell/mix/MixView').then((m) => m.MixView),
  { name: 'Mix view', fallback: view('Loading the Mix view') },
);

export const PracticeTrackViewPart = lazyPart(
  () =>
    import('@/daw/components/Practice/PracticeTrackView').then(
      (m) => m.PracticeTrackView,
    ),
  { name: 'Practice view', fallback: view('Loading Practice') },
);

/** The chunk of each view but Create (arrange), which is always loaded. */
const VIEW_PARTS: Partial<Record<ViewType, { preload(): Promise<unknown> }>> = {
  score: ScoreViewPart,
  // The Lead sheet is the Score's one editor (2026-10-21).
  leadsheet: ScoreViewPart,
  studio: StudioViewPart,
  practice: PracticeTrackViewPart,
};

/**
 * Fetch a view's chunk ahead of a switch to it (a hover on its tab), and
 * for the notation views VexFlow and its font too (score-21).
 */
export function preloadView(id: ViewType): void {
  VIEW_PARTS[id]?.preload().catch(() => {});
  if (id === 'score' || id === 'leadsheet') {
    import('@/components/notation/StaffView')
      .then((m) => m.loadVexFlow())
      .catch(() => {});
  }
}

// ── Dock tabs ───────────────────────────────────────────────────────────────

const dock = (label: string) => <PartPlaceholder label={label} />;

export const EffectsPanelPart = lazyPart(
  () => import('@/daw/shell/dock/DockEffects').then((m) => m.DockEffects),
  { name: 'FX panel', fallback: dock('Loading FX') },
);

/** The side rail's Library: the browser (milestone 2.14). */
export const BrowserPart = lazyPart(
  () =>
    import('@/daw/shell/inspector/browser/BrowserPanel').then(
      (m) => m.BrowserPanel,
    ),
  { name: 'Library', fallback: dock('Loading the Library') },
);

export const PrismPanelPart = lazyPart(
  () => import('@/daw/components/Prism/PrismPanel').then((m) => m.PrismPanel),
  { name: 'Prism panel', fallback: dock('Loading Prism') },
);

export const ClipPianoRollPart = lazyPart(
  () =>
    import('@/daw/components/PianoRoll/ClipPianoRoll').then(
      (m) => m.ClipPianoRoll,
    ),
  { name: 'piano roll', fallback: dock('Loading the piano roll') },
);

// The Instrument tab's frame (TrackControlsPanel) is small and stays in the
// editor's chunk; the instrument view inside it loads (below), so opening
// the tab is one fetch, not two in a row.
const TAB_PARTS: Partial<
  Record<ChannelStripTabId, { preload(): Promise<unknown> }>
> = {
  fx: EffectsPanelPart,
  prism: PrismPanelPart,
  'piano-roll': ClipPianoRollPart,
};

/**
 * Fetch a dock tab's chunk ahead of opening it (a hover on the tab). Notes
 * on drums is the drum grid.
 */
export function preloadDockTab(
  id: ChannelStripTabId,
  instrument?: string,
): void {
  const part =
    id === 'piano-roll' && instrument === 'drum-machine'
      ? DrumMachineViewPart
      : TAB_PARTS[id];
  part?.preload().catch(() => {});
}

// ── Instrument views (the Controls tab) ─────────────────────────────────────

const instrument = () => <PartPlaceholder label="Loading the instrument" />;

export const GuitarBassViewPart = lazyPart(
  () =>
    import('@/daw/components/Controls/GuitarBassView').then(
      (m) => m.GuitarBassView,
    ),
  { name: 'audio track', fallback: instrument() },
);

export const OracleSynthInlinePart = lazyPart(
  () =>
    import('@/daw/components/Controls/OracleSynthInline').then(
      (m) => m.OracleSynthInline,
    ),
  { name: 'Oracle Synth', fallback: instrument() },
);

export const OracleSynthViewPart = lazyPart(
  () =>
    import('@/daw/components/Controls/OracleSynthView').then(
      (m) => m.OracleSynthView,
    ),
  { name: 'Oracle Synth', fallback: instrument() },
);

export const SoundFontViewPart = lazyPart(
  () =>
    import('@/daw/components/Controls/SoundFontView').then(
      (m) => m.SoundFontView,
    ),
  { name: 'SoundFont', fallback: instrument() },
);

export const DrumMachineViewPart = lazyPart(
  () =>
    import('@/daw/components/Controls/DrumMachineView').then(
      (m) => m.DrumMachineView,
    ),
  { name: 'drum grid', fallback: instrument() },
);

/** Drums' Instrument tab: the kit and its pads (2.9). */
export const DrumPadsViewPart = lazyPart(
  () => import('@/daw/shell/dock/DrumPadsView').then((m) => m.DrumPadsView),
  { name: 'drum kit', fallback: instrument() },
);

/** The view each instrument's Controls tab shows (TrackControlsPanel). */
function instrumentPart(
  instrumentId: string,
): { preload(): Promise<unknown> } | null {
  switch (instrumentId) {
    case 'audio-input':
      return GuitarBassViewPart;
    case 'oracle-synth':
      return OracleSynthInlinePart;
    case 'soundfont':
      return SoundFontViewPart;
    case 'drum-machine':
      return DrumPadsViewPart;
    default:
      return null;
  }
}

/** Fetch the Controls tab's chunks for these instruments. */
export function preloadInstrumentViews(instrumentIds: Iterable<string>): void {
  const parts = new Set<{ preload(): Promise<unknown> }>();
  for (const id of instrumentIds) {
    const part = instrumentPart(id);
    if (part) parts.add(part);
  }
  for (const part of parts) part.preload().catch(() => {});
}

// ── Dialogs, mounted when first opened ──────────────────────────────────────

export const SettingsModalPart = lazyPart(
  () =>
    import('@/daw/components/Transport/SettingsModal').then(
      (m) => m.SettingsModal,
    ),
  { name: 'Settings' },
);

export const PrismSuggestionModalPart = lazyPart(
  () =>
    import('@/daw/components/Prism/PrismSuggestionModal').then(
      (m) => m.PrismSuggestionModal,
    ),
  { name: 'Prism suggestion' },
);

export const ChordAnalysisPromptPart = lazyPart(
  () =>
    import('@/daw/components/Library/ChordAnalysisPrompt').then(
      (m) => m.ChordAnalysisPrompt,
    ),
  { name: 'chord analysis' },
);

/** The Export dialog (2.15): Audio | Notation. */
export const ExportDialogPart = lazyPart(
  () => import('@/daw/shell/export/ExportDialog').then((m) => m.ExportDialog),
  { name: 'Export dialog' },
);

export const ProjectsDialogPart = lazyPart(
  () =>
    import('@/daw/shell/projects/ProjectsDialog').then((m) => m.ProjectsDialog),
  { name: 'Projects dialog' },
);

export const ShortcutSheetPart = lazyPart(
  () => import('@/daw/shell/help/ShortcutSheet').then((m) => m.ShortcutSheet),
  { name: 'shortcut sheet' },
);

/** The command palette (2.15): cmdk loads with it, on the first ⌘K. */
export const CommandPalettePart = lazyPart(
  () => import('@/daw/shell/help/CommandPalette').then((m) => m.CommandPalette),
  { name: 'command palette' },
);

export const TutorialLayerPart = lazyPart(
  () =>
    import('@/daw/components/Tutorial/TutorialLayer').then(
      (m) => m.TutorialLayer,
    ),
  { name: 'lesson' },
);

/** Settings, mounted once first opened. */
export function SettingsModalHost() {
  const opened = useOpenedOnce(useStore((s) => s.settingsOpen));
  return opened ? <SettingsModalPart /> : null;
}

/** Prism's suggestion preview, mounted once first opened. */
export function PrismSuggestionModalHost({
  audioReady,
}: {
  audioReady: boolean;
}) {
  const opened = useOpenedOnce(useStore((s) => s.prismSuggestOpen));
  return opened ? <PrismSuggestionModalPart audioReady={audioReady} /> : null;
}

/** The offer to read a project's chords, mounted once first offered. */
export function ChordAnalysisPromptHost() {
  const opened = useOpenedOnce(useStore((s) => s.chordAnalysisPromptOpen));
  return opened ? <ChordAnalysisPromptPart /> : null;
}

/**
 * The lesson overlay (coach card, spotlight, step checks), mounted while a
 * lesson runs. A lesson starting fetches what its steps open.
 */
export function TutorialLayerHost() {
  const activeId = useStore((s) => s.activeTutorialId);
  useEffect(() => {
    const tutorial = getTutorial(activeId);
    if (!tutorial) return;
    const instruments = useStore.getState().tracks.map((t) => t.instrument);
    preloadForLesson(tutorial.steps, instruments);
  }, [activeId]);
  return activeId ? <TutorialLayerPart /> : null;
}

// ── Lessons ─────────────────────────────────────────────────────────────────

/**
 * Fetch what a lesson's steps open (their views and dock tabs, and the
 * Controls tab's view for each instrument in the project), so a step that
 * switches to one shows it at once rather than a placeholder.
 */
export function preloadForLesson(
  steps: readonly TutorialStep[],
  instrumentIds: Iterable<string>,
): void {
  TutorialLayerPart.preload().catch(() => {});
  const instruments = [...instrumentIds];
  for (const step of steps) {
    const { view: stepView, channelStripTab } = step.requires ?? {};
    if (stepView) preloadView(stepView);
    if (channelStripTab === 'controls') preloadInstrumentViews(instruments);
    else if (channelStripTab === 'piano-roll') {
      // Notes is the drum grid on drums.
      preloadDockTab(channelStripTab);
      for (const id of instruments) preloadDockTab(channelStripTab, id);
    } else if (channelStripTab) preloadDockTab(channelStripTab);
  }
}
