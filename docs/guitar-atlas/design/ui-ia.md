# Guitar in Learn: UI, Notation and Navigation Sub-plan

> **Placement update (2026-09-29).** The guitar content now lives in **Learn → Theory → Ionian (Major)**, not in Technique as "Applied Theory Fundamentals". Where this plan says otherwise, this note wins.
>
> - Routes: `/learn/guitar/ionian` is the guitar overview (`GuitarModeOverview`: the piano `ModeOverview` page with the book's major-scale ScaleBox in place of the keyboard, key tiles in book order). `/learn/guitar/ionian/:key?section=A|B|D` is the lesson (`GuitarModeLesson`, replacing `GuitarAppliedTheoryFundamentalsLesson`). Bare `/learn/guitar` and any other mode go to `/learn?tab=Theory`.
> - Access follows Theory: the overview and the C lesson are free; the other 11 keys need Premium (`RequirePremium`, as the piano `LessonRoute`).
> - With Guitar selected, the Technique tab is hidden, and every Theory tile except Ionian (Major) is disabled with "Coming soon for guitar".
> - The old `/curriculum/guitar/applied-theory-fundamentals[/:key]` paths only redirect (replace) to the new ones, keeping the key and query. The guitar key picker is gone; `AppliedTheoryFundamentalsKeyPicker` is piano-only again.
> - Internal ids are unchanged (genre `guitar-applied-theory-fundamentals`, module, tags, builder), so saved progress carries over. The lesson breadcrumb reads Theory › Guitar · Ionian (Major), and the header shows the key ("C Major (Ionian)").

## Goals

1. Guitar lessons show TAB where piano lessons show the piano roll. A guitar toggle switches between **TAB | Notation**. Notation is a treble staff with an 8 under the clef. There is no piano-roll option for guitar.
2. The PianoKeyboard block is replaced, for guitar only, by three things:
   - a horizontal **Fretboard** showing targets, what is playing now, and right or wrong notes;
   - book-style **ChordBox** diagrams (for chord and Music Map steps);
   - a book-style **ScaleBox** diagram (for scale and melody steps).
3. The existing InstrumentSelector gets wired up. Choosing Guitar swaps Learn → Technique to guitar tiles. Bass and Ukulele are shown as disabled "Coming soon" items.
4. Guitar gets its own routes, key picker, breadcrumb, free access, and search and assistant entries.
5. The piano UI and flow do not change. Every new prop is optional and defaults to today's behaviour. No piano code path changes except extracting one pure helper with identical behaviour.

## Design decisions

1. **One lesson container, with a guitar branch.** `GenreLessonContainerV2` decides the instrument from the flow: `isGuitar = (flow.instrument ?? 'piano') === 'guitar'`. It branches in only about five places.
   - Rejected: a forked GuitarLessonContainer. That duplicates 2,265 lines of lesson logic and breaks "same logic".
2. **The TAB renderer is a new `TabStaffView`, not an extension of `StaffView`.** It uses VexFlow 5 `TabStave` and `TabNote`, which I checked in `node_modules/vexflow/build/esm/src/tabnote.js`, `tabstave.js`, `dot.js` and `beam.js`:

   - `TabNote(struct, drawStem)`; `positions: {str, fret}` where `str` 1 is the top line (high E);
   - Dot and Beam have TabNote support;
   - the TabStave default is 6 lines, 13 px apart.

   `TabStaffView` reuses these existing pieces: `buildScore` (quantising, rests, ties, voices), `loadVexFlow`, `playheadX`, the `StaffLayout` and `NoteStyle` types, `ChordSymbolOverlay`, `CountOff`, and the `grandStaff.css` theme classes.

   - Rejected: adding `'tab'` to `StaffId`. `Record<StaffId,…>` appears in buildScore, REST_KEY and drumMap, and StaffView's STAFF_SLOT and STAFF_BODY constants assume 5 lines 10 px apart. That puts piano and Studio at risk.
   - Rejected: a hand-rolled SVG tab. It would lose engraved rhythm (stems, beams, dots, rests), and the brief asks for VexFlow.

3. **Guitar notation uses the existing grand-staff path**, with written pitch = sounding + 12 and `staves:'treble'`.
   - I verified VexFlow 5 `Clef.setType(type,size,'8vb')` draws `gClef8vb` (U+E052) in `clef.js`.
   - `StaffView` gets an optional per-part `clefAnnotation`. When it is undefined, `addClef(staff, undefined, undefined)` does exactly what `addClef(staff)` does today.
   - Rejected: a `treble8vb` StaffId, for the same ripple reasons as above.
4. **The guitar view preference is a separate device setting.** `useGuitarView()` stores `'tab'|'notation'` under the key `musicAtlas:guitarView`, default `'tab'`. It copies the pattern in `viewPreference.ts`. The TAB face lives inside `GenrePianoRoll` (at lines 427-457), so the lesson clock and playhead stay where they are.
   - Rejected: widening `RollView`/`RollViewScope`. That type is shared by piano and Studio.
5. **The Fretboard and chord strip read the clock by polling.** In time, they poll the container's existing `currentTickRef` from their own requestAnimationFrame loop while a run is active, and only call setState when the selected value changes.
   - Rejected: lifting the tick into container state. That re-renders the 2,265-line container 60 times a second.
   - Rejected: an external store notified from `onTickChange`. That call runs inside GenrePianoRoll's `setPlayheadTick` updater, so React would warn about "update while rendering a different component".
6. **The Fretboard follows the keyboard's priority order**: demo, then the user's notes, then the practice guide, then the preview. Notes are mapped from MIDI to string and fret through the step's own positions. A wrong note goes to the nearest position inside the step's fret window and is drawn in `WRONG_NOTE_KEY_COLOR`.
   - Guitar-only addition: the current chord's shape is also drawn faintly, so the student can see where the fingers go.
   - The fret window is fixed for the whole step, from all of its positions (between 5 frets and fret 22). It does not jump around.
7. **One book-style `FretDiagram` primitive** matches the book pages I looked at (p-15 to p-19):

   - vertical diagram, string 6 on the left, 5 rows;
   - a fret number on every row, and a thick top line;
   - X/O above the strings, dots in the key colour, rounded barre bars;
   - the book's shape string (e.g. X-3-2-0-1-0) as a caption.

   `ChordBox` and `ScaleBox` are thin wrappers around it. The horizontal Fretboard puts string 1 at the top so it lines up with the TAB.

8. **Navigation:**
   - A zustand persisted `useInstrumentStore` (device-level, like `useSavedItemsStore`). Rejected: `useSettingsStore`, which holds audio and MIDI config.
   - Static routes `/curriculum/guitar/applied-theory-fundamentals[/:key]`. React Router 6 ranks static segments above `/:genre/:level`. Rejected: `?instrument=` query, because progress and the breadcrumb need a separate genre.
   - The progress key is kept apart by using `genre="guitar-applied-theory-fundamentals"`.
   - The saved-item id is kept apart with a new optional `ContentItem.savedId`.

## Contract with the other subsystems (data, input/eval, audio) — all fields optional

- `src/lib/guitar/types.ts` (new, shared):

```ts
export type GuitarStringNumber = 1 | 2 | 3 | 4 | 5 | 6; // 1 = high E (book & VexFlow)
export interface FretPosition {
  string: GuitarStringNumber;
  fret: number;
}
export type ShapeFret = number | null; // null = X, 0 = open
export interface GuitarBarre {
  fret: number;
  fromString: GuitarStringNumber;
  toString: GuitarStringNumber;
  finger?: 1 | 2 | 3 | 4;
}
export interface GuitarChordShape {
  id: string;
  name: string;
  symbol: string;
  frets: readonly [
    ShapeFret,
    ShapeFret,
    ShapeFret,
    ShapeFret,
    ShapeFret,
    ShapeFret,
  ]; // string 6→1
  baseFret: number;
  barres?: GuitarBarre[];
  fingers?: readonly (1 | 2 | 3 | 4 | null)[];
  rootPc?: number;
}
export interface GuitarScaleBox {
  id: string;
  name: string;
  fretStart: number;
  fretEnd: number;
  mutedStrings: GuitarStringNumber[];
  dots: (FretPosition & { midi: number; isRoot?: boolean })[];
}
export interface GuitarStepVisuals {
  scaleBox?: GuitarScaleBox;
  chordShapes?: GuitarChordShape[];
} // chordShapes[i] ↔ step.chordSymbols[i]
```

- `activity.v2.ts`:
  - `TargetNote` (lines 40-45) gains `string?`, `fret?`;
  - `ActivityStepV2` (55-75) gains `guitar?: GuitarStepVisuals`;
  - `ActivityFlowV2` (77-81) gains `instrument?: 'piano'|'guitar'`;
  - `ActivityVariant` gains `guitar?` (only if the data plan uses variants).
- `resolveStepContent.ts`:
  - `GenreNoteEvent` (16-22) gains `string?`, `fret?`;
  - `toPianoRollEvents` (251-266) adds `...(note.string!==undefined && note.fret!==undefined ? {string, fret} : {})`, so piano objects keep the same keys.
- Dependencies I am asking for:
  1. Guitar flows must skip `applyRegisterRules` (resolveStepContent line 157). Otherwise `midi` stops matching string and fret.
  2. The notes of a chord share one onset, with no strum stagger.
  3. Guitar notes carry no `hand`.
  4. The guitar flow should use `defaultScaleId:'ionian'`. `SCALE_TO_MODE` (container lines 101-116) has no `'major'` entry, so today's piano flow gets the dorian-shifted colour and would not match the picker tile or the book.
- Slots filled by input/eval: `GuitarLessonVisuals` takes `heardChord?: {label; confidence; matchesCurrent} | null` (from the `AudioChordResult` of the studio's AudioChordDetector) and `inputStatus?: ReactNode` (mic/MIDI source and level). The `LearnInputProvider` wrapper at container lines 2259-2265 belongs to input/eval.

## Exact file changes

### New files

- **`src/lib/guitar/fretboard.ts`**: `STANDARD_TUNING=[64,59,55,50,45,40]` (strings 1→6), plus:
  - `midiAt(string,fret)`
  - `positionsFor(midi, maxFret=22): FretPosition[]`
  - `nearestPosition(midi, window)`
  - `fretWindow(positions, {minSpan:5, maxFret:22}): {min,max}` (includes the nut when any string is open)
  - `resolveFretPositions<T extends {id;midi?;startTicks;string?;fret?}>(events, hints, window?): T[]` — keeps explicit positions; otherwise uses a hint with the same MIDI, keeping strings unique within one onset; otherwise the nearest position.
  - `shapePositions(shape)`
  - `shapeString(shape)` returns e.g. "X-3-2-0-1-0".
- **`src/lib/guitar/types.ts`**: the types above.
- **`src/lib/notation/buildTab.ts`**:
  - `buildTab(notes: (NotationNoteInput & FretPosition)[], {timeSignature, minMeasures, ticksPerQuarter?}): TabScore`
  - It calls `buildScore(..., {staves:'treble'})`, then looks up each key's `noteId` to get its position.
  - Items tied from the previous one become `ghost` (fret in parentheses).
  - A duplicate string at one onset is dropped with a dev warning.
  - Keys with no position become `hidden`.
  - Types: `TabItem {kind; startTick; durationTicks; value; dots; wholeMeasure?; hidden?; ghost; positions:{str,fret,noteId}[]}`, `TabMeasure {index; number; startTick; endTick; voices:{index:0|1; items}[]}`, `TabScore {timeSignature; ticksPerMeasure; beatTicks; originTick; measures}`.
- **`src/components/notation/TabStaffView.tsx`**, with props `{score: TabScore; noteStyles?; playheadTick?; fitHeight?; onLayout?(StaffLayout|null); overlay?; className?; style?}`.
  - `export function renderTabSystem(vf, host, score, width, height, opts): TabRendered` is pure DOM, exported for tests.
  - TabStave: `addClef('tab')` and a time signature on the first system; no key signature.
  - TabNote: stems down (`drawStem=true`); `Beam.generateBeams` with beat groups and `maintainStemDirections`; `Dot.buildAndAttach`; `setGhost` for ties.
  - Rests: `StaveNote({keys:['a/4'], duration:'Xr'})`, which sits on the middle of the 6 lines.
  - Voice index 1 has stems up.
  - Layout: `planSystems` with bars per system from width (about 150 px minimum per bar). Scale is 0.7–1.6 to fit the height, via `ctx.scale`, so the 9 pt fret digits are readable.
  - Linear playhead anchors, same as StaffView. Auto-scrolls to the playhead's system.
  - Paints `noteStyles` onto `vf-tabnote` groups.
  - Emits a `StaffLayout`-shaped layout (measures with partIndex 0 and y just above the top line; notes with tick and x) so `ChordSymbolOverlay` works unchanged.
  - Root class: `ma-grand-staff ma-tab-staff`.
- **`src/components/notation/tabStaff.css`**:
  - `.ma-tab-staff svg .vf-tabnote rect { fill: var(--ma-tab-gap,#141416); stroke:none }`. VexFlow's `clearRect` draws a white rect, and the theme rule `svg:not(.ma-marks) * {fill: currentColor}` would otherwise paint it over the digits. This rule has specificity (0,2,2), which beats the theme's (0,2,1).
  - A `.vf-tabnote` colour transition.
  - The TAB panel background is solid `#141416`.
- **`src/components/notation/GuitarViewToggle.tsx`**: a radiogroup "Guitar note view" with a "TAB" text-glyph button (aria "Tablature") and a lucide `Music` button (aria "Notation"). Same styling as `RollViewToggle`.
- **`src/lib/notation/guitarViewPreference.ts`**: `GuitarView='tab'|'notation'`, `getGuitarView`, `setGuitarView`, `useGuitarView()` (useSyncExternalStore, key `musicAtlas:guitarView`, default `'tab'`). Exported from `lib/notation/index.ts`.
- **`src/curriculum/components/learnNoteStyles.ts`**: the pure `learnNoteStyles(events,{inTime,performanceMeta,noteHoldMeta,playheadTick,keyColor}): Map<string,NoteStyle>`, extracted verbatim from `LearnNotationView` lines 104-127.
- **`src/curriculum/components/LearnTabView.tsx`**: the TAB face, with the same props as `LearnNotationView` minus `staves`.
  - Builds its memo on a signature that includes string and fret.
  - Calls `resolveFretPositions` defensively and runs a dev consistency check (`midiAt(string,fret)===midi`, warn otherwise).
  - Header toggle, `TabStaffView` with `learnNoteStyles`, `ChordSymbolOverlay`, `CountOff` (via `countOffBeatIndex`), and the same height and chrome as `LearnNotationView`.
- **`src/components/guitar/FretDiagram.tsx`**: pure SVG, `React.memo`.
  - Props: `{rows; startFret; muted:number[]; open:number[]; dots:{string,fret,label?,isRoot?,state?:'idle'|'next'|'done'}[]; barres?; color; caption?; title?; size?:'sm'|'md'; state?:'idle'|'current'|'done'|'heard'; emphasizeRoot?}`.
  - Each dot and barre carries `data-string`, `data-fret`, `data-state`; `role="img"` with an aria-label.
- **`src/components/guitar/ChordBox.tsx`**: `{shape: GuitarChordShape; color; showFingers?=true; state?; size?; label?}`. Fingers are drawn in the dots; the caption is `shapeString`; there are 5 rows starting at `baseFret`.
- **`src/components/guitar/ScaleBox.tsx`**: `{box: GuitarScaleBox; color; activePositions?: FretPosition[]}`.
- **`src/components/guitar/Fretboard.tsx`**: horizontal SVG with a viewBox (`meet`).
  - Props: `{window:{min,max}; markers: FretMarker[]; keyColor; wrongColor?; showNoteNames?=true; height?}`.
  - Draws a nut when `min=0`, open-string markers left of the nut, inlays at 3/5/7/9/15/17/19/21 and a double at 12, and fret numbers underneath.
  - `FretMarker {string; fret; midi; label; role:'hint'|'next'|'done'|'hit'|'wrong'; isRoot?}`. When two markers share a spot, the priority is wrong/hit > next > done > hint.
  - `index.ts` barrel.
- **`src/curriculum/components/guitar/fretboardMarkers.ts`**: pure `fretboardMarkers({events, segment, currentIds, demoMidis, isPlayingDemo, activeMidis, practiceMidis, isActive, isPracticing, targetMidiSet, window, keyRoot, rootPc})`. It follows the keyboard ternary at container lines 1949-1982.
- **`src/curriculum/components/guitar/chordTimeline.ts`**:
  - `chordShapeTimeline(labels, placeOpts): {startTick, shapeIndex}[]` reuses `placeLessonChords`. The shape index is `bar % labels.length` in per-bar mode and the label index in across-content mode.
  - `chordIndexAt(timeline, tick)`.
- **`src/curriculum/components/guitar/useTickRefSelector.ts`**: `useTickRefSelector<T>(ref, select, active): T` — a requestAnimationFrame loop that sets state only when the value changes (`Object.is`).
- **`src/curriculum/components/guitar/GuitarChordStrip.tsx`**: a scrollable row of `ChordBox` (current one highlighted and scrolled into view; `heard` ring when `heardChord.matchesCurrent`), headed by hybrid degree labels via `formatChord(parseChord(sym),'hybrid',chordContext)`.
- **`src/curriculum/components/guitar/GuitarLessonVisuals.tsx`**: props `{events; step; chordTimeline?; chordContext; keyColor; keyRoot; activityState; inTime; currentTickRef; activeMidis; demoHighlightMidis; isPlayingDemo; practiceHighlightMidis; targetMidiSet; noteHoldMeta?; heardChord?; inputStatus?}`.
  - Layout: a flex row that wraps — [ChordStrip, or ScaleBox, or nothing] | Fretboard (flex 1) with the chips overlaid.
  - The current chord segment comes from the tick selector (in time) or from `noteHoldMeta.isCurrentChord` (out of time). Index 0 in preview.
  - Exports `GUITAR_VISUALS_HEIGHT = 176`.
- **`src/features/learn/useInstrumentStore.ts`**:
  - `LearnInstrument='piano'|'guitar'`
  - `INSTRUMENT_OPTIONS: readonly {id:'piano'|'guitar'|'bass'|'ukulele'; label; available}[]`
  - store `{instrument; setInstrument}` persisted as `music-atlas-learn-instrument`, `version:1`, with a `merge` that turns unknown values into `'piano'`.
- **`src/components/learn/techniqueCatalog.ts`**:
  - `PIANO_TECHNIQUE_DATA` (moved verbatim from LearnInlet lines 506-519)
  - `GUITAR_TECHNIQUE_DATA=[{title:'Applied Theory Fundamentals', savedId:'guitar:applied-theory-fundamentals', route: CurriculumRoutes.guitarAppliedTheoryFundamentals(), image:'/learn-tiles/beginner-hex.svg', interactive:true}]`
  - `techniqueDataFor(instrument)`
- **`src/curriculum/pages/GuitarAppliedTheoryFundamentalsLesson.tsx`** (lazy):
  - the key param goes through the same `urlParamToKeyLabel` → ASCII conversion as routes.tsx lines 55-58;
  - `useMemo(buildGuitarAppliedTheoryFundamentalsFlow(keyName))` (the builder comes from the data subsystem);
  - `useEffect(setInstrument('guitar'))`;
  - renders `<GenreLessonContainerV2 flow genre="guitar-applied-theory-fundamentals" level={1} displayName="Guitar · Applied Theory Fundamentals" overviewRoute={CurriculumRoutes.guitarAppliedTheoryFundamentals()}/>`;
  - no `RequirePremium`.

### Modified files

- **`GenrePianoRoll.tsx`**
  - `NoteEvent` (22-31): add `string?: GuitarStringNumber; fret?: number`.
  - Props (40-107): add `instrument?: 'piano'|'guitar'` (default `'piano'`).
  - After line 428, call `useGuitarView()` unconditionally.
  - Before `if (view==='notation')` (436), add the guitar branch. It returns `LearnTabView` or `LearnNotationView` with `staves='treble'`, `writtenOctaveShift={1}`, `clefAnnotation='8vb'`, and `toggle=<GuitarViewToggle/>`.
  - The guitar branch ignores `staves` and `notationToggle`. It passes the same `playheadTick`, `countOffTicks`, `musicStartTick` and height as lines 438-455.
- **`LearnNotationView.tsx`**
  - Props (23-50): add `writtenOctaveShift?: number` (default 0) and `clefAnnotation?: '8vb'`.
  - Score memo (78-102): `midi + 12*shift`, and `name` shifted with `shiftPitchNameOctave`. With shift 0 the input is identical.
  - Pass `clefAnnotation` to `GrandStaff`.
  - Replace lines 104-127 with `learnNoteStyles(...)`.
- **`GrandStaff.tsx`**: optional `clefAnnotation` prop, spread into the parts memo only when set.
- **`StaffView.tsx`**
  - `ScorePart` (68-73): add `clefAnnotation?: '8va'|'8vb'`.
  - `headerWidth` line 544 and `render` line 932: `addClef(staff, undefined, staff==='percussion' ? undefined : part.clefAnnotation)`.
- **`GenreLessonContainerV2.tsx`**
  - Add imports.
  - Near line 250: `instrument`, `isGuitar`, plus a `guitarHints` memo (scale-box dots and chord-shape positions from `resolvedStep.guitar`).
  - Lines 300-308: merge `activeVariant.guitar` only when present.
  - Lines 357-365: inside the memo, `isGuitar ? resolveFretPositions(events', guitarHints) : events'`. The piano path returns the same arrays as today.
  - Line 391: `isDualStaff = !isGuitar && …`.
  - Next to `chordSymbolsForStaff` (about line 1023): `guitarChordTimeline`, only when `isGuitar`, using the same `placeLessonChords` options.
  - GenrePianoRoll JSX (1899-1925): add `instrument={instrument}`.
  - Keyboard block (1932-1990): the outer div's `height` becomes `isGuitar ? GUITAR_VISUALS_HEIGHT : '120px'`; the inner `flex:1` child is `isGuitar ? <GuitarLessonVisuals…/> : <PianoKeyboard…/>`. `MetronomeToggle` and `LessonVolumeDial` stay.
  - Step-dot row (about line 1628): add `flexWrap: isGuitar ? 'wrap' : undefined` (React drops undefined).
  - Optional, guitar only: the right-hand header (1571-1573) shows "Guitar · Level 1".
  - No change is needed to the `KEYBOARD` overhead (line 473). `pianoRollMaxHeight` is only used by the dual staff, and guitar never uses the dual staff.
- **`src/constants/routes.ts`** (`CurriculumRoutes`, 626-654): add `guitarAppliedTheoryFundamentals` (`/guitar/applied-theory-fundamentals`) and `guitarAppliedTheoryFundamentalsLesson<{key}>` (`/guitar/applied-theory-fundamentals/:key`).
- **`src/curriculum/routes.tsx`**
  - Add a lazy import of the guitar lesson page.
  - Children (124-157) gain `{path: guitarAppliedTheoryFundamentals.definition, element: <AppliedTheoryFundamentalsKeyPicker instrument="guitar"/>}` and the lesson route.
  - Optional: `/curriculum/guitar` redirects to the picker, instead of landing on the premium `GenreOverviewRoute` with the slug "guitar".
- **`AppliedTheoryFundamentalsKeyPicker.tsx`** (32-84):
  - `({ instrument='piano' }: {instrument?: LearnInstrument})`.
  - A `COPY` record holds title, blurb and route builder. The piano entry is today's text and route, character for character.
  - Guitar: title "Applied Theory Fundamentals — Guitar", blurb citing The Guitar Atlas: Book One.
- **`InstrumentSelector.tsx`**
  - Read and write `useInstrumentStore`.
  - Map `INSTRUMENT_OPTIONS`; unavailable items get `disabled` and a "Coming soon" pill.
  - Optional `onChange?(i)` prop.
  - `aria-label` becomes `Instrument: ${label}`. The trigger markup and classes are unchanged.
- **`LearnTabBar.tsx`** (64-67): pass an `onChange` that navigates to `?tab=Technique` when you are not already there (see open question 2). `QuickStartSection.tsx` line 65 needs no change (the store is used directly).
- **`LearnInlet.tsx`**
  - `ContentItem` (162-172): add `savedId?`.
  - Replace the local `TECHNIQUE_DATA` with `techniqueDataFor(useInstrumentStore(s=>s.instrument))`, used by `filteredTechnique` (1410-1419, with `instrument` added to the deps) and the expand effect (1507-1521).
  - `savedPropsFor` (1581-1582) and the saved filter (1415) use `item.savedId ?? item.title`.
  - `isLearnItemFree` (1024-1029) needs no code change: Technique is already free. Only its doc comment is updated.
- **`src/features/search/sources/staticIndex.ts`** (PAGES, 301-351): add a guitar applied-theory entry with keywords guitar, tab, chords, scales, guitar atlas.
- **`useAssistantMatcher.ts`** (318-331): add a matching "Guitar Applied Theory" entry.

## Reuse list

- `buildScore` and `resolveStaves` (`src/lib/notation`), and `planSystems` (`systemPlan.ts`).
- `loadVexFlow`, `playheadX`, `StaffLayout`, `NoteStyle` (`src/components/notation/StaffView.tsx`), and `GrandStaff`.
- `ChordSymbolOverlay`, `lessonChordSymbols`, `placeLessonChords` (`src/curriculum/notation/*`).
- `CountOff` and `countOffBeatIndex` (`src/components/notation/CountOff.tsx`).
- `grandStaff.css` classes (`ma-grand-staff`, `ma-note-glow`, `ma-playhead`).
- `useRollView` pattern (`src/lib/notation/viewPreference.ts`) and `RollViewToggle` styling.
- `WRONG_NOTE_KEY_COLOR` (`src/components/Games/PianoRollPlay.tsx:23`).
- `colorForKeyMode`, `formatChord`/`parseChord` (`src/lib/chordNotation`), `formatAccidentalsForDisplay`, and `midiToPitchName`/`spellMidi` (enharmonicEngine).
- `keyLabelToUrlParam`/`urlParamToKeyLabel` (`src/lib/musicKeyUrl.ts`).
- Radix `DropdownMenuItem` `disabled` (`src/components/ui/dropdown-menu.tsx` already styles `data-[disabled]`).
- zustand `persist` pattern (`src/features/learn/useSavedItemsStore.ts`).
- `MetronomeToggle` and `LessonVolumeDial`.

## Risks and mitigations

- **Fret digits hidden behind a painted rect** (clearRect plus the theme CSS). Fixed by the tabStaff.css override on a solid panel background. Needs a manual visual check; the render test asserts the rect is present.
- **Rest and beam placement on TabStave.** Rest key `'a/4'` is centred on the 6 lines; this needs to be seen in the browser. If it looks wrong, rests fall back to `GhostNote` and flags replace beams.
- **Scoring and TAB disagreeing** if `applyRegisterRules` shifts guitar MIDI, or a strum is staggered. Covered by the dependency above and a dev warning in LearnTabView.
- **Piano regressions.** All props are optional; the StaffView clef call is unchanged when no annotation is set; a test pins that `PIANO_TECHNIQUE_DATA` equals the old literal; a test checks that GenrePianoRoll's default render still shows the roll.
- **Performance.** Fretboard and ChordBox are memoised, markers are built in a `useMemo`, and the tick is read by polling a ref rather than through container state.
- **Step dots overflowing** once the book's extra steps are added: wrapping is turned on for guitar only.
- **Progress and saved-item collisions:** separate genre slug and `savedId`.
- **Route shadowing:** a matchRoutes test.
- **Bundle size:** the lesson page is lazy-loaded (the dashboard shell's Suspense at `ClassroomDashboard.tsx:43` covers it), and VexFlow is already lazy.
- **jsdom limits.** The global ResizeObserver stub never fires, so the render function is tested directly. The Radix menu is mocked in its test.

## Tests (vitest; jsdom where needed, with `// @vitest-environment jsdom` and the canvas `getContext` mock from `drumRender.test.ts`)

- **`src/lib/guitar/__tests__/fretboard.test.ts`**:
  - `midiAt(6,3)=43`, `midiAt(1,0)=64`;
  - the positions for C4 (60);
  - `fretWindow` for open C (starts at 0), Dm7 X-5-7-5-6-X (4–8), and the 22-fret clamp;
  - `resolveFretPositions` keeps explicit positions, uses hints, and keeps strings unique per onset.
- **`src/lib/notation/__tests__/buildTab.test.ts`**:
  - a whole-note open C gives one item with 5 positions;
  - `half+half` rhythm;
  - an IT count-in bar gives a whole-measure rest;
  - a tie gives a ghost fret;
  - a duplicate string is dropped.
- **`src/components/notation/__tests__/tabRender.test.ts`**: `renderTabSystem` with real VexFlow:
  - output contains U+E06D (tab clef);
  - `vf-tabnote` groups and `vf-stem` are present;
  - the fret text is there;
  - layout measures and notes have ticks;
  - anchors increase with time.
- **`src/components/guitar/__tests__/ChordBox.test.tsx`**:
  - C major has X on string 6, O on strings 3 and 1, dots at (5,3), (4,2), (2,1);
  - F major has one barre element;
  - Dm7 has fret labels 4–8;
  - dots use the key colour; aria-label is present.
- **`Fretboard.test.tsx`**: fret labels for the window, marker `data-*` attributes, the wrong-note colour, the open-string marker, the inlays.
- **`src/curriculum/components/guitar/__tests__/fretboardMarkers.test.ts`**: the priority order, mapping a wrong note to the nearest position, hints.
- **`chordTimeline.test.ts`**: per-bar looping versus across-content placement; `chordIndexAt`.
- **`src/lib/notation/__tests__/guitarViewPreference.test.ts`**, following `clefPreference.test.ts`.
- **`GuitarViewToggle.test.tsx`**: labels and `aria-checked`.
- **`learnNoteStyles.test.ts`**: pins today's behaviour for in-time, hold, done and current. Also tests `shiftPitchNameOctave` ('B♭3'→'B♭4', '-1' octaves).
- **`src/curriculum/components/__tests__/genrePianoRollInstrument.test.tsx`**: the default shows the "Piano roll" radio; `instrument="guitar"` renders the mocked LearnTabView, and after switching to Notation renders LearnNotationView with `writtenOctaveShift=1`.
- **`src/features/learn/__tests__/useInstrumentStore.test.ts`**: defaults to piano; a garbage persisted value becomes piano.
- **`src/components/ClassroomLayout/dashboard/__tests__/InstrumentSelector.test.tsx`** (dropdown-menu mocked to render inline): shows the stored value; selecting Guitar updates the store and calls `onChange`; Bass and Ukulele are disabled with "Coming soon".
- **`techniqueCatalog.test.ts`**: the piano list is unchanged; the guitar list routes to the guitar picker; `savedId` is set.
- **`AppliedTheoryFundamentalsKeyPicker.test.tsx`**: the piano heading and route are unchanged; the guitar F♯ tile goes to `/curriculum/guitar/applied-theory-fundamentals/fsharp`.
- **`src/curriculum/__tests__/routes.test.ts`**: `matchRoutes` sends `/curriculum/guitar/applied-theory-fundamentals[/c]` to the guitar routes, and `/curriculum/funk/1` still goes to `:genre/:level`.
- Finish with `npx tsc -b` and the full vitest run.

## Open questions

1. **Guitar tile.** Name it "Applied Theory Fundamentals" to mirror piano, or something like "Guitar Atlas: Key Centers"? And should there be a disabled "Guitar Fundamentals — coming soon" tile, given that chapter is missing from the PDF? My default is the same title and no placeholder tile.
2. **Switching instrument in the Learn tab bar.** Should it jump to the Technique tab, since the other tabs don't change? My default is yes in the Learn tab bar, and no on the Home Quick Start.
3. **Where the instrument choice is stored.** Device-only (localStorage), or also synced to the profile (`bio.instruments`)? And should opening a guitar lesson from a link set the preference to guitar? My default is device-only and yes.
4. **Artwork.** Is a dedicated guitar tile image (`guitar-hex.svg`) wanted, and should the book's hand illustrations be reproduced? My default is to reuse `beginner-hex.svg` and show finger numbers inside the dots instead of the hand drawings.

### Critical Files for Implementation

- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/pages/GenreLessonContainerV2.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/components/GenrePianoRoll.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/notation/StaffView.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/components/LearnNotationView.tsx
- /Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/learn/LearnInlet.tsx
