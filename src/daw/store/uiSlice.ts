import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { MidiClip, AudioClip } from './tracksSlice';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import type { RackTarget } from './effectRack';
import type { AllGridSize } from '@/daw/utils/quantize';
import { clampZoom, fitZoom, zoomAround } from '@/daw/editor/zoom';
import type { ClipNoteSelection } from '@/daw/utils/insightSelection';
import type { SectionMark } from '@/daw/model/sections';
import type { ScoreTextMark } from '@/daw/components/Score/scoreText';
import { toggledFavourites } from '@/daw/shell/inspector/browser/favourites';
import {
  clampInspectorPx,
  DOCK_MAX_FRAC,
  INSPECTOR_DEFAULT_PX,
  resolveInspectorOpen,
  type DockHeights,
  type DockSlotId,
  type InspectorOpenByView,
  type InspectorPanelId,
  type ReadoutMode,
} from '@/daw/shell/layout/layoutModel';

// ── UI Slice ──────────────────────────────────────────────────────────────
// Global UI state: active tool, selected clip, timeline zoom/scroll/grid.

export type ToolType = 'cursor' | 'pencil' | 'scissors' | 'layout';
export type ViewType =
  | 'arrange'
  | 'studio'
  | 'score'
  | 'leadsheet'
  | 'practice';

/**
 * One scale the practice keyboard can light, as its switcher offers it.
 */
export interface PracticeSessionScale {
  id: string;
  /** Without the tonic: 'Dorian', 'Minor Blues'. */
  title: string;
  intervals: number[];
  /** Scale degrees, display-ready: ['1','2','♭3','4','5','6','♭7']. */
  degrees: string[];
  /** Note names in the key: ['A','B','C','D','E','F♯','G']. */
  names: string[];
  /** Its own tonic, when a level teaches in two keys (Latin L1: E minor, G major). */
  tonicPc?: number;
  /** That tonic as a student reads it: 'G'. */
  tonicLabel?: string;
}

/**
 * A Practice Track opened from a Theory lesson (Learn ▸ Theory): a mode and a
 * key, from which the whole track is reproducible. Saved with its draft
 * (milestone 1.15), so a refresh comes back to the practice screen.
 */
export interface TheoryPracticeSession {
  kind: 'theory';
  /** Prism mode key, e.g. 'ionian'. */
  mode: string;
  /** The lesson's key URL param, e.g. 'bflat'. */
  rootParam: string;
  level: 1 | 2 | 3;
  openTrack: 'melody' | 'chords';
  /** The track the student plays and records on (see practiceStudentTrack). */
  studentTrackId?: string;
}

/**
 * A Practice Track opened from a genre activity flow. It carries more than the
 * Theory one because a genre backing is not reproducible from parameters — the
 * generator jitters timing and picks drum phrases at random — so everything the
 * practice screen needs to name the task, light the right scales and send the
 * student back travels with the session rather than being re-derived.
 */
export interface GenrePracticeSession {
  kind: 'genre';
  /** Genre slug, e.g. 'funk'. */
  genre: string;
  /** As a student reads it, e.g. 'Funk'. */
  genreLabel: string;
  level: number;
  section: 'A' | 'B' | 'C' | 'D';
  /** The section's own name: 'Melody', 'Chords', 'Bass', 'Performance'. */
  sectionName: string;
  /** Note letter of the tonic, e.g. 'A'. */
  keyLabel: string;
  /** Every scale this level teaches, its default first. */
  scales: PracticeSessionScale[];
  /** Chord symbols of one turn of the progression, as the chart draws them. */
  chordCycle: string[];
  /**
   * For a Chords track, the lesson's own voicings the keyboard can show — one
   * set per switch option beside Root Position, each chord of `chordCycle` as
   * that activity voiced it (null where none does). A Performance track has
   * one set, its chord hand's. Null on the others.
   */
  voicingSets:
    | { id: string; label: string; voicings: (number[] | null)[] }[]
    | null;
  /** Which of `voicingSets` the keyboard opens on. */
  defaultVoicing: string | null;
  /** The lowest bass note the section writes, where bass notes are lit. */
  bassFloor: number | null;
  /** What the student plays; two parts means a two-hand Performance track. */
  studentParts: ('melody' | 'chords' | 'bass')[];
  /** The keyboard the screen draws, in PianoKeyboard's C-octave numbering. */
  keyboard: { startC: number; endC: number };
  /** Where the scale is lit: the MIDI note its tonic sounds at. */
  scaleTonic: number;
  /** Things to try, the section's own instruction first. */
  prompts: string[];
  /** Back to the lesson this came from. */
  returnTo: string;
  /** The track the student plays and records on (see practiceStudentTrack). */
  studentTrackId?: string;
  /**
   * The groove toggle (D-088): the level's styles (empty when it teaches one)
   * and the one playing; the level's progressions and the one playing.
   */
  styles?: { id: string; name: string }[];
  styleId?: string | null;
  progressions?: {
    id: string;
    /** As built, raw symbols: the screen writes `chords` in the notation. */
    label: string;
    chords: string[];
    /** The groove the progression comes with, when the level has several. */
    styleName?: string;
  }[];
  progressionId?: string;
  /**
   * A guitar lesson's track: the screen draws the scale position and chord
   * shapes on a fretboard in place of the keyboard. Absent on piano.
   */
  guitar?: GuitarPracticeInfo;
  /**
   * Music Literacy's Hear It with Your Band: a Band playing the student's
   * own chart. Its styles are the band's, its progressions the student's,
   * and switching keeps the band (bandPracticeTrack.ts). Absent on a
   * lesson's own Practice Track.
   */
  literacy?: LiteracyBandPractice;
}

/** A chart as Music Literacy saves it (chart.ts LiteracyChart). */
export interface LiteracyPracticeChart {
  /** Scale degrees of the mode, one a bar: ['1', '4', '5', '6']. */
  chords: string[];
  harmony: 'triads' | 'sevenths';
  /** The 1, as Part 2 spells it: 'D', 'Bb'. */
  tonic: string;
  mode: 'major' | 'minor';
}

/** The band and the chart a Hear It with Your Band session plays. */
export interface LiteracyBandPractice {
  band: string;
  /** 'Latin Band 1'. */
  bandName: string;
  /** The band's variation playing (its style is `styleId`). */
  variation: string;
  /** The style without its level: 'Cumbia'. */
  styleName: string;
  chart: LiteracyPracticeChart;
  /** 'D Minor'. */
  keyName: string;
  /** The student's charts, by the id the progression switch gives them. */
  charts: { id: string; chart: LiteracyPracticeChart }[];
}

/**
 * What a guitar Practice Track draws, as ids into the guitar book so a
 * refreshed session can draw it again: the key center, the scale position the
 * level plays from, and the chord shapes the section plays.
 */
export interface GuitarPracticeInfo {
  /** 'C', or 'D:dorian' (curriculum/data/guitar/centers). */
  keyCenter: string;
  /** 'major' | 'pentatonic' | 'pentatonic2'; null when the level has none. */
  scalePosition: string | null;
  shapeIds: string[];
}

/** A Practice Track in progress, from either kind of lesson. */
export type PracticeSession = TheoryPracticeSession | GenrePracticeSession;

/** What the practice keyboard lights: the scale, the chord now, the bass note. */
export type PracticeKeyboardView = 'scales' | 'chords' | 'bass';

/**
 * The student's choices on the practice keyboard, kept while the screen is
 * away (the Studio, a refresh). null fields are the track's own defaults.
 */
export interface PracticeKeyboard {
  view: PracticeKeyboardView | null;
  scaleId: string | null;
}
/** The editor dock's tabs (shell/dock/dockTabs.ts). Kept here so the
 *  tutorial system can read and open a tab from the store. */
export type ChannelStripTabId = 'controls' | 'fx' | 'prism' | 'piano-roll';
export type LeadSheetChordFormat = 'jazz' | 'hybrid' | 'numbers';

/**
 * A song section as the Lead Sheet marks it: the bar it starts at and its
 * name. The sections themselves live in the sections slice (milestone 2.13);
 * the Lead Sheet reads them as these marks (leadSheetSectionsOf).
 */
export type LeadSheetSection = SectionMark;

export interface LeadSheetRepeat {
  startMeasure: number;
  endMeasure: number;
}

export interface UiSlice {
  /**
   * Whether letter, digit and symbol keys with no ⌘ or ⌥ are shortcuts (R,
   * M, L, 1–4, ?). The student can turn them off (WCAG 2.1.4); the keys'
   * other shortcuts and the buttons still work. A per-user pref.
   */
  singleKeyShortcuts: boolean;
  setSingleKeyShortcuts: (on: boolean) => void;
  /**
   * The Score's note input (MuseScore's N): a click on a staff, or a letter
   * A–G, writes a note instead of selecting. Shared by the Score and a lead
   * sheet's melody, which edit with the same tools.
   */
  scoreNoteInput: boolean;
  setScoreNoteInput: (on: boolean) => void;
  /**
   * The tracks the Score leaves off its staves (its Staves menu, 2026-10-21).
   * With every instrument track off, the page is the chord chart. The view's
   * own choice, not the song's, so it isn't saved with the project.
   */
  scoreHiddenTrackIds: string[];
  setScoreHiddenTrackIds: (ids: string[]) => void;
  activeTool: ToolType;
  selectedClipId: string | null;
  selectedClipTrackId: string | null;
  clipboardClips: MidiClip[];
  clipboardAudioClip: { clip: AudioClip; bufferId: string } | null;

  // ── Timeline zoom / scroll / grid ──
  timelineZoom: number;
  timelineScrollLeft: number;
  timelineGridSize: AllGridSize;
  timelineSnapEnabled: boolean;
  timelineTripletMode: boolean;
  /**
   * Whether the timeline follows the playhead by pages while playing
   * (editor/follow). A per-user pref, on by default.
   */
  followPlayhead: boolean;

  setActiveTool: (tool: ToolType) => void;
  setSelectedClip: (clipId: string | null, trackId: string | null) => void;
  setClipboard: (clips: MidiClip[]) => void;
  setAudioClipboard: (clip: AudioClip, bufferId: string) => void;

  // ── Timeline actions ──
  setTimelineZoom: (zoom: number) => void;
  setTimelineScrollLeft: (px: number) => void;
  setTimelineGridSize: (size: AllGridSize) => void;
  toggleTimelineSnap: () => void;
  toggleTripletMode: () => void;
  setFollowPlayhead: (on: boolean) => void;
  /** Zoom centered on cursor — keeps tick under anchorPx visually fixed. */
  zoomAtPoint: (delta: number, anchorPx: number) => void;
  /** Zoom to fit all content in the viewport. */
  zoomToFit: (viewportWidth: number, projectLengthTicks: number) => void;

  // ── View switcher ──
  currentView: ViewType;
  /**
   * Switching to another view puts the clip selection, which only Create
   * shows, away in `parkedClipSelection`, and coming back to Create restores
   * it. The selected track stays.
   */
  setCurrentView: (view: ViewType) => void;
  /**
   * The clip selected in Create while another view is showing. Selecting or
   * clearing a clip meanwhile drops it.
   */
  parkedClipSelection: { clipId: string; trackId: string } | null;
  practiceSession: PracticeSession | null;
  setPracticeSession: (session: PracticeSession | null) => void;
  /** The practice keyboard's view and scale; null until the student picks. */
  practiceKeyboard: PracticeKeyboard | null;
  setPracticeKeyboard: (patch: Partial<PracticeKeyboard>) => void;

  // ── The Inspector column (LibraryPanel until 2.8) ──
  /**
   * Whether the Inspector is open in the view showing. It follows the
   * student's choice for each view (inspectorOpenByView) when the view
   * changes or a project opens; a lesson step or an automatic open sets it
   * for the moment only.
   */
  libraryOpen: boolean;
  /** The student's open or close: kept for the view showing. */
  toggleLibrary: () => void;
  /** Open or close for now, leaving the student's choice as it is. */
  setLibraryOpen: (open: boolean) => void;
  /** The student's choice for `view`, applied at once if it is showing. */
  setInspectorOpenFor: (view: ViewType, open: boolean) => void;
  /** Per-user: whether the Inspector is open in each view (milestone 2.4). */
  inspectorOpenByView: InspectorOpenByView;
  /** Per-user: the Inspector column's width in px. */
  inspectorWidth: number;
  /** Per-user: the side rail's panel the Inspector shows (B4a). */
  inspectorPanel: InspectorPanelId;
  /**
   * A side rail icon: shows its panel, opening the Inspector (the student's
   * choice for the view); on the panel already open, closes it.
   */
  toggleInspectorPanel: (panel: InspectorPanelId) => void;
  /** Shows `panel` and opens the Inspector for now (an analysis, a lesson). */
  showInspectorPanel: (panel: InspectorPanelId) => void;
  setInspectorWidth: (px: number) => void;
  /**
   * Per-user: the Library items the student marked ♡ (2.14), by item id,
   * sorted (shell/inspector/browser/favourites.ts).
   */
  libraryFavourites: string[];
  /** ♡ on a Library row or a groove: marks the item, or unmarks it. */
  toggleLibraryFavourite: (id: string) => void;

  // ── The Add effect picker and the dock's chain ──
  /**
   * The Add effect picker shows (shell/dock/EffectPicker.tsx, after Suno's
   * "Add a track plugin" modal): a pick adds to the rack in front of the
   * student and closes it.
   */
  effectPickerOpen: boolean;
  /** Add effect: opens the picker. */
  openEffectsLibrary: () => void;
  /** Closes the picker without adding. */
  cancelEffectsLibrary: () => void;
  /** The effect whose controls the dock's chain shows. */
  dockEffect: EffectSlotType | null;
  setDockEffect: (effect: EffectSlotType | null) => void;

  /** Per-user: the dock's height for each tab, as a share of the editor body. */
  dockHeights: DockHeights;
  /** null forgets the tab's height: it opens at the default again. */
  setDockHeight: (slot: DockSlotId, frac: number | null) => void;
  /** Per-user: the position readout in bars and beats, or minutes. */
  readoutMode: ReadoutMode;
  setReadoutMode: (mode: ReadoutMode) => void;

  // ── The editor dock (milestone 2.9) ──
  // The open tab, in the store so tutorials can open one (e.g. Prism).
  // null: the dock is shut to its tab bar.
  channelStripTab: ChannelStripTabId | null;
  setChannelStripTab: (tab: ChannelStripTabId | null) => void;
  /**
   * The dock shows Master (gain, the master chain, the output) in its slot
   * instead of the selected track; the bottom rail's Master opens it.
   */
  dockMaster: boolean;
  setDockMaster: (open: boolean) => void;
  /** The dock grown over the canvas (Maximize; Escape restores it). */
  dockMaximized: boolean;
  setDockMaximized: (on: boolean) => void;
  /** Notes picked in the dock's piano roll, which Analyze sends to Insight. */
  dockNoteSelection: ClipNoteSelection | null;
  setDockNoteSelection: (selection: ClipNoteSelection | null) => void;

  // ── The Mix view (milestone 2.10) ──
  /**
   * The rack the Mix view's RackDock shows: a track's chain, a return's or
   * the master's (null: the rack is shut to its bar). The side rail's
   * Effects library adds to it while Mix shows. Its shown effect is
   * dockEffect, as in Create's dock: the two never show at once.
   */
  mixRack: RackTarget | null;
  setMixRack: (rack: RackTarget | null) => void;
  /**
   * The tracks Mute All muted, so pressing it again unmutes those and no
   * others (null: Mute All isn't on).
   */
  muteAllSet: string[] | null;
  setMuteAllSet: (ids: string[] | null) => void;
  /** Per-user: the bottom rail says what the control under the pointer does. */
  hoverHints: boolean;
  setHoverHints: (on: boolean) => void;

  // ── Clip color mode ──
  clipColorMode: 'track' | 'prism';
  setClipColorMode: (mode: 'track' | 'prism') => void;

  // ── Settings modal ──
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // ── Recording-limit modal ──
  // Opened when an audio recording auto-stops at the per-track 5-minute cap.
  recordingLimitModalOpen: boolean;
  setRecordingLimitModalOpen: (open: boolean) => void;

  // ── Project ──
  // Set when the project has been saved to the cloud; null for unsaved or
  // local-only projects. First save calls POST; subsequent saves call PUT.
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  composerName: string;
  setComposerName: (name: string) => void;
  // Timestamp (ms) of the last successful audio export/bounce. Session-only:
  // deliberately NOT persisted or collab-synced — it's a local UI event used by
  // the tutorial engine to detect that the learner completed a mixdown.
  lastAudioExportAt: number | null;
  markAudioExported: () => void;
  // Which track's automation lane is disclosed in the arrange timeline (null =
  // none), and which paramId that lane is editing. Per-project view state,
  // like channelStripTab: the draft keeps it (decision D5), never the cloud
  // copy or collab. MASTER_AUTOMATION_ID (automationParams.ts) opens the
  // Master bus lane.
  automationOpenTrackId: string | null;
  automationParamId: string;
  setAutomationOpenTrackId: (trackId: string | null) => void;
  setAutomationParamId: (paramId: string) => void;

  // ── Lead sheet ──
  leadSheetChordFormat: LeadSheetChordFormat;
  setLeadSheetChordFormat: (format: LeadSheetChordFormat) => void;
  leadSheetSelectedChordIdx: string | null;
  setLeadSheetSelectedChordIdx: (id: string | null) => void;
  // What Insight's "Analyze" button analyzes: chords selected in the
  // timeline's chord lane (ChordRegion ids, timeline order), or notes selected
  // inside clips (⌘-drag in the timeline, or the piano roll). Selecting one
  // kind clears the other.
  selectedChordIds: string[];
  setSelectedChordIds: (ids: string[]) => void;
  selectedNotes: ClipNoteSelection[];
  setSelectedNotes: (selection: ClipNoteSelection[]) => void;
  leadSheetRepeats: LeadSheetRepeat[];
  setLeadSheetRepeats: (repeats: LeadSheetRepeat[]) => void;
  addLeadSheetRepeat: (repeat: LeadSheetRepeat) => void;
  removeLeadSheetRepeat: (startMeasure: number) => void;
  leadSheetShowRepeats: boolean;
  setLeadSheetShowRepeats: (show: boolean) => void;
  /** Draw the melody track's notes on the lead sheet staff, over the slashes. */
  leadSheetShowMelody: boolean;
  setLeadSheetShowMelody: (show: boolean) => void;
  /**
   * The tracks the lead sheet writes as its melody, a staff each, stacked in
   * track order (leadSheetMelody.ts, pickMelodyTracks). Empty is Auto: the
   * track whose role is melody, else the first MIDI track with notes. An id
   * whose track has gone is skipped, not cleared, so undoing the delete
   * brings its staff back; a load drops it.
   */
  leadSheetMelodyTrackIds: string[];
  /**
   * Make these tracks the melody, in place of any before; an empty list goes
   * back to Auto. With `show`, Melody is switched on too: what a caller that
   * hands the student a track to read (the Learn hand-off) wants.
   */
  setLeadSheetMelodyTrackIds: (
    trackIds: readonly string[],
    options?: { show?: boolean },
  ) => void;
  /**
   * Tick or untick one track in the lead sheet's melody picker. Ticking also
   * switches Melody on, since it asks to see that track; unticking the last
   * one goes back to Auto.
   */
  toggleLeadSheetMelodyTrack: (trackId: string) => void;
  /**
   * Score view: track ids whose part shows chord symbols. The symbols are the
   * lead sheet's own chords; this only says which parts display them.
   */
  scoreChordTracks: string[];
  toggleScoreChordTrack: (trackId: string) => void;
  setScoreChordTracks: (trackIds: string[]) => void;
  /**
   * Chords taken off one part, keyed `trackId:regionId`. Hiding one here
   * never touches the lead sheet or any other part.
   */
  scoreChordHidden: string[];
  setScoreChordHidden: (hidden: string[]) => void;
  /** Articulations written in the Score, as `noteId|kind`. */
  scoreArticulations: string[];
  setScoreArticulations: (marks: string[]) => void;
  /** Slurs written in the Score, as `fromNoteId|toNoteId`. */
  scoreSlurs: string[];
  /**
   * Spellings pinned by writing an accidental, as `noteId|name`. Without this
   * a note sharpened to 61 would be respelled by the key — D♭ in a flat key —
   * and the sharp the user asked for would not appear.
   */
  scoreSpellings: string[];
  setScoreSpellings: (spellings: string[]) => void;
  /**
   * Layout marks on bars: which start a system, which start a page, and which
   * open a system of an exact length ("make into system"). Marks rather than
   * row sizes, so a break early on leaves the rest of the score alone.
   */
  scoreSystemBreaks: number[];
  setScoreSystemBreaks: (bars: number[]) => void;
  scorePageBreaks: number[];
  setScorePageBreaks: (bars: number[]) => void;
  /** `[startBar, barCount]` for each system made by hand. */
  scoreSystemRuns: Array<[number, number]>;
  setScoreSystemRuns: (runs: Array<[number, number]>) => void;
  /** Free text, segno and coda signs, and the jumps that point at them. */
  scoreTextMarks: ScoreTextMark[];
  setScoreTextMarks: (marks: ScoreTextMark[]) => void;
  setScoreSlurs: (slurs: string[]) => void;
  /** Notes written as rhythmic slashes, by note id. */
  scoreSlashNotes: string[];
  setScoreSlashNotes: (ids: string[]) => void;
}

export const createUiSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  UiSlice
> = (set, get) => ({
  singleKeyShortcuts: true,
  setSingleKeyShortcuts: (on) => set({ singleKeyShortcuts: on }),
  scoreNoteInput: false,
  setScoreNoteInput: (on) => set({ scoreNoteInput: on }),
  scoreHiddenTrackIds: [],
  setScoreHiddenTrackIds: (ids) => set({ scoreHiddenTrackIds: ids }),
  activeTool: 'cursor',
  selectedClipId: null,
  selectedClipTrackId: null,
  clipboardClips: [],
  clipboardAudioClip: null,

  // ── Timeline defaults ──
  timelineZoom: 1.0,
  timelineScrollLeft: 0,
  timelineGridSize: '1/4',
  timelineSnapEnabled: true,
  timelineTripletMode: false,
  followPlayhead: true,

  setActiveTool: (tool) => set({ activeTool: tool }),

  // A selection made (or cleared) while away from Create replaces the one
  // parked there.
  setSelectedClip: (clipId, trackId) =>
    set({
      selectedClipId: clipId,
      selectedClipTrackId: trackId,
      parkedClipSelection: null,
    }),

  setClipboard: (clips) => set({ clipboardClips: clips }),

  setAudioClipboard: (clip, bufferId) =>
    set({ clipboardAudioClip: { clip, bufferId } }),

  // ── Timeline actions ──

  setTimelineZoom: (zoom) => set({ timelineZoom: clampZoom(zoom) }),

  setTimelineScrollLeft: (px) => set({ timelineScrollLeft: Math.max(0, px) }),

  setTimelineGridSize: (size) => set({ timelineGridSize: size }),

  toggleTimelineSnap: () =>
    set((s) => ({ timelineSnapEnabled: !s.timelineSnapEnabled })),

  toggleTripletMode: () =>
    set((s) => ({ timelineTripletMode: !s.timelineTripletMode })),
  setFollowPlayhead: (on) => set({ followPlayhead: on }),

  zoomAtPoint: (delta, anchorPx) =>
    set((s) => {
      const next = zoomAround(
        { zoom: s.timelineZoom, scrollLeft: s.timelineScrollLeft },
        delta,
        anchorPx - s.timelineScrollLeft,
      );
      return { timelineZoom: next.zoom, timelineScrollLeft: next.scrollLeft };
    }),

  zoomToFit: (viewportWidth, projectLengthTicks) =>
    set({
      timelineZoom: fitZoom(viewportWidth, projectLengthTicks),
      timelineScrollLeft: 0,
    }),

  // ── View switcher ──
  currentView: 'arrange' as ViewType,
  practiceSession: null,
  setPracticeSession: (session) => set({ practiceSession: session }),
  practiceKeyboard: null,
  setPracticeKeyboard: (patch) =>
    set((s) => ({
      practiceKeyboard: {
        view: s.practiceKeyboard?.view ?? null,
        scaleId: s.practiceKeyboard?.scaleId ?? null,
        ...patch,
      },
    })),
  setCurrentView: (asked) =>
    set((s) => {
      // The Lead sheet is the Score's one editor since 2026-10-21: a draft,
      // a link or a lesson that asks for it gets the Score.
      const view = asked === 'leadsheet' ? 'score' : asked;
      const next: Partial<UiSlice> = { currentView: view };
      // Lesson steps re-assert the view they are already on: not a switch,
      // so the Inspector stays as the step left it.
      if (view === s.currentView) return next;
      // The dock is Create's: coming back finds it at its own height.
      next.dockMaximized = false;
      // Each view opens the Inspector as the student last had it there
      // (2.4); switching no longer forces it open in Create (ia-flows-21).
      next.libraryOpen = resolveInspectorOpen(view, s.inspectorOpenByView);
      if (view !== 'arrange') {
        // A clip selected in Create is out of sight in the other views, so
        // nothing done there may act on it: it is parked until the student
        // comes back. selectedTrackId stays, since lessons and Prism follow
        // the selected track across views.
        next.selectedClipId = null;
        next.selectedClipTrackId = null;
        if (s.currentView === 'arrange') {
          next.parkedClipSelection =
            s.selectedClipId && s.selectedClipTrackId
              ? { clipId: s.selectedClipId, trackId: s.selectedClipTrackId }
              : null;
        }
        return next;
      }
      // Back in Create, the timeline and the docked editor pick up the clip
      // they had, unless it has been deleted meanwhile (or a clip is
      // selected already).
      const parked = s.parkedClipSelection;
      if (parked && s.selectedClipId === null) {
        const track = s.tracks.find((t) => t.id === parked.trackId);
        const stillThere =
          track?.midiClips.some((c) => c.id === parked.clipId) ||
          track?.audioClips.some((c) => c.id === parked.clipId);
        if (stillThere) {
          next.selectedClipId = parked.clipId;
          next.selectedClipTrackId = parked.trackId;
        }
      }
      next.parkedClipSelection = null;
      return next;
    }),
  parkedClipSelection: null,

  // ── The Inspector column ──
  libraryOpen: true,
  toggleLibrary: () => {
    const s = get();
    s.setInspectorOpenFor(s.currentView, !s.libraryOpen);
  },
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  setInspectorOpenFor: (view, open) =>
    set((s) => ({
      inspectorOpenByView: { ...s.inspectorOpenByView, [view]: open },
      ...(view === s.currentView ? { libraryOpen: open } : {}),
    })),
  inspectorOpenByView: {},
  inspectorWidth: INSPECTOR_DEFAULT_PX,
  setInspectorWidth: (px) => set({ inspectorWidth: clampInspectorPx(px) }),
  inspectorPanel: 'insight',
  toggleInspectorPanel: (panel) => {
    const s = get();
    const open = !(s.libraryOpen && s.inspectorPanel === panel);
    set({ inspectorPanel: panel });
    s.setInspectorOpenFor(s.currentView, open);
  },
  showInspectorPanel: (panel) =>
    set({ inspectorPanel: panel, libraryOpen: true }),
  libraryFavourites: [],
  toggleLibraryFavourite: (id) =>
    set((s) => ({
      libraryFavourites: toggledFavourites(s.libraryFavourites, id),
    })),

  effectPickerOpen: false,
  openEffectsLibrary: () => set({ effectPickerOpen: true }),
  cancelEffectsLibrary: () => set({ effectPickerOpen: false }),
  dockEffect: null,
  setDockEffect: (effect) => set({ dockEffect: effect }),
  dockHeights: {},
  setDockHeight: (tab, frac) =>
    set((s) => {
      if (frac === null) {
        const rest = { ...s.dockHeights };
        delete rest[tab];
        return { dockHeights: rest };
      }
      return {
        dockHeights: {
          ...s.dockHeights,
          [tab]: Math.min(DOCK_MAX_FRAC, Math.max(0.05, frac)),
        },
      };
    }),
  readoutMode: 'bars',
  setReadoutMode: (mode) => set({ readoutMode: mode }),

  // ── The editor dock ──
  channelStripTab: null,
  // Shutting the dock shuts Master and a maximized dock with it.
  setChannelStripTab: (tab) =>
    set(
      tab === null
        ? { channelStripTab: null, dockMaster: false, dockMaximized: false }
        : { channelStripTab: tab },
    ),
  dockMaster: false,
  setDockMaster: (open) => set({ dockMaster: open }),
  dockMaximized: false,
  setDockMaximized: (on) => set({ dockMaximized: on }),
  dockNoteSelection: null,
  setDockNoteSelection: (selection) => set({ dockNoteSelection: selection }),

  // ── The Mix view ──
  mixRack: null,
  setMixRack: (rack) => set({ mixRack: rack }),
  muteAllSet: null,
  setMuteAllSet: (ids) => set({ muteAllSet: ids }),
  hoverHints: true,
  setHoverHints: (on) => set({ hoverHints: on }),

  // ── Clip color mode ──
  clipColorMode: 'track',
  setClipColorMode: (mode) => set({ clipColorMode: mode }),

  // ── Settings modal ──
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  recordingLimitModalOpen: false,
  setRecordingLimitModalOpen: (open) => set({ recordingLimitModalOpen: open }),

  // ── Project ──
  projectId: null,
  setProjectId: (id) => set({ projectId: id }),
  projectName: 'Untitled Project',
  setProjectName: (name) => {
    // In a collab session only the host owns the (synced) project title. A
    // non-host's change is ignored here; remote title updates arrive via the
    // Yjs observer (setState), which bypasses this action.
    const { isCollabActive, collabRole } = get();
    if (isCollabActive && collabRole !== 'owner') return;
    set({ projectName: name });
  },
  composerName: '',
  setComposerName: (name) => set({ composerName: name }),
  lastAudioExportAt: null,
  markAudioExported: () => set({ lastAudioExportAt: Date.now() }),
  automationOpenTrackId: null,
  automationParamId: 'volume',
  setAutomationOpenTrackId: (trackId) =>
    set({ automationOpenTrackId: trackId }),
  setAutomationParamId: (paramId) => set({ automationParamId: paramId }),

  // ── Lead sheet ──
  leadSheetChordFormat: 'hybrid' as LeadSheetChordFormat,
  setLeadSheetChordFormat: (format) => set({ leadSheetChordFormat: format }),
  leadSheetSelectedChordIdx: null,
  setLeadSheetSelectedChordIdx: (idx) =>
    set({ leadSheetSelectedChordIdx: idx }),
  selectedChordIds: [],
  setSelectedChordIds: (ids) =>
    set(
      ids.length > 0
        ? { selectedChordIds: ids, selectedNotes: [] }
        : { selectedChordIds: ids },
    ),
  selectedNotes: [],
  setSelectedNotes: (selection) =>
    set(
      selection.length > 0
        ? { selectedNotes: selection, selectedChordIds: [] }
        : { selectedNotes: selection },
    ),
  leadSheetRepeats: [],
  setLeadSheetRepeats: (repeats) => set({ leadSheetRepeats: repeats }),
  addLeadSheetRepeat: (repeat) =>
    set((s) => ({
      leadSheetRepeats: [
        ...s.leadSheetRepeats.filter(
          (r) => r.startMeasure !== repeat.startMeasure,
        ),
        repeat,
      ].sort((a, b) => a.startMeasure - b.startMeasure),
    })),
  removeLeadSheetRepeat: (startMeasure) =>
    set((s) => ({
      leadSheetRepeats: s.leadSheetRepeats.filter(
        (r) => r.startMeasure !== startMeasure,
      ),
    })),
  leadSheetShowRepeats: false,
  setLeadSheetShowRepeats: (show) => set({ leadSheetShowRepeats: show }),
  leadSheetShowMelody: false,
  setLeadSheetShowMelody: (show) => set({ leadSheetShowMelody: show }),
  leadSheetMelodyTrackIds: [],
  setLeadSheetMelodyTrackIds: (trackIds, { show = false } = {}) =>
    set({
      leadSheetMelodyTrackIds: [...new Set(trackIds)],
      ...(show ? { leadSheetShowMelody: true } : {}),
    }),
  toggleLeadSheetMelodyTrack: (trackId) =>
    set((s) => {
      const picked = new Set(s.leadSheetMelodyTrackIds);
      const adding = !picked.has(trackId);
      if (adding) picked.add(trackId);
      else picked.delete(trackId);
      return {
        // Kept in track order, and only for tracks the project still has.
        leadSheetMelodyTrackIds: s.tracks
          .filter((track) => picked.has(track.id))
          .map((track) => track.id),
        ...(adding ? { leadSheetShowMelody: true } : {}),
      };
    }),
  scoreChordTracks: [],
  toggleScoreChordTrack: (trackId) =>
    set((s) => ({
      scoreChordTracks: s.scoreChordTracks.includes(trackId)
        ? s.scoreChordTracks.filter((id) => id !== trackId)
        : [...s.scoreChordTracks, trackId],
    })),
  setScoreChordTracks: (trackIds) => set({ scoreChordTracks: trackIds }),
  scoreChordHidden: [],
  setScoreChordHidden: (hidden) => set({ scoreChordHidden: hidden }),
  scoreArticulations: [],
  setScoreArticulations: (marks) => set({ scoreArticulations: marks }),
  scoreSlurs: [],
  setScoreSlurs: (slurs) => set({ scoreSlurs: slurs }),
  scoreSpellings: [],
  setScoreSpellings: (spellings) => set({ scoreSpellings: spellings }),
  scoreSystemBreaks: [],
  setScoreSystemBreaks: (bars) => set({ scoreSystemBreaks: bars }),
  scorePageBreaks: [],
  setScorePageBreaks: (bars) => set({ scorePageBreaks: bars }),
  scoreSystemRuns: [],
  setScoreSystemRuns: (runs) => set({ scoreSystemRuns: runs }),
  scoreTextMarks: [],
  setScoreTextMarks: (marks) => set({ scoreTextMarks: marks }),
  scoreSlashNotes: [],
  setScoreSlashNotes: (ids) => set({ scoreSlashNotes: ids }),
});
