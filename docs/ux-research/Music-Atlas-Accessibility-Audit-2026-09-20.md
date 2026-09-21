# Music Atlas: WCAG 2.1 AA accessibility audit (pre-VPAT)

Date: 2026-09-20 · Build: dev server `localhost:5180` (auth bypass), branch `Peter` · Auditor: automated agent (axe-core 4.x + Playwright/Chromium, headless)

**This is a list of what fails, not a conformance claim.** It covers only the Learn path and the Studio, listed in Scope below. Nothing here was checked with a real screen reader. The accessibility tree stood in for one.

Scope walked: `/learn`, `/learn?tab=Theory` (plus an expanded card), `/learn/ionian`, `/learn/ionian/c` (Overview, the Melody tab, the "Ready to start?" dialog for `asc-nh`/`desc-nh`/`asc-pa`, Play Now, the "Great job!" completion dialog), `/studio?tab=Demos`, then `/studio/editor` with the Sunset Keys demo (Create, Master, Score and Lead Sheet views; the Insight panel; the Controls, Grooves, Prism and Piano Roll bottom tabs), plus the global sidebar and top bar.

### Verification against source (added after the audit)

Before this report was handed over, its highest-stakes claims were checked against the code:

| Claim | Result |
|---|---|
| Theory key and chapter rows are clickable `div`s (finding 1) | **Confirmed.** `LearnInlet.tsx`: `<div … cursor-pointer … onClick={() => handleKeySelect(…)}>`, with no role, `tabIndex` or key handler. |
| Sidebar links have no accessible name (finding 4) | **Confirmed.** `SidebarMainNavItem.tsx`: `labelEl = !props.isCollapsed && <span>…`. In the default collapsed state the link holds only an icon and has no `aria-label`. Fix: `aria-label={props.isCollapsed ? props.label : undefined}` on the `NavLink` and `<a>`. |
| `--color-text-dim` contrast (finding 7) | **Confirmed**: 3.66:1 on #101012, 3.35:1 on #1a1a1a, 3.21:1 on #1e1e1e. The proposed #8e8ea3 comes out at **5.93:1** on #101012, better than the "about 5:1" given below. |
| Lessons accept notes only from MIDI (finding 2) | **Confirmed, with the reason, which the audit didn't establish:** <br>• The lesson's on-screen piano (`components/PianoKeyboard/PianoKeyboard.tsx`) supports clicks, but only when given `enableClick`, and it reports them through `onKeyClick`. `NoteHold.tsx` and `PlayAlong.tsx` pass neither, so **clicks on the lesson piano do nothing**. Its keys are `div`s, so they can't take keyboard focus. <br>• A microphone pitch-detection engine exists (`src/learn/audio/v2/`), but `useLearnInput.ts` records that mic input "has been removed because stray ambient audio was producing spurious notes". <br>So, as the app stands, **a student needs a MIDI keyboard to complete any lesson.** That is an accessibility failure (2.1.1). It also means no lesson can be done on a school Chromebook with no keyboard attached, as homework or anywhere else. The cheapest first step: pass `enableClick` and wire `onKeyClick` into each activity's existing note-on handler. That makes lessons playable by mouse and touch. Keyboard operability then needs the keys as focusable buttons, plus a computer-keyboard note map. |

Evidence files are in `accessibility-evidence/` next to this report: `a11y-axe-*.json` (raw axe results), `a11y-walk-editor.json` (Studio tab order), `a11y-tree-playalong-ready.yaml` (accessibility tree), and `a11y-*.png` (screenshots). The Playwright scripts that produced them were kept in the research session's scratch folder, not here.

---

## 1. Summary

The app is visually polished, and a good share of its controls are real `<button>`s with names: key tiles, Demo/Practice/Play Now, most Studio transport buttons, the tempo slider and the Insight links. Most controls also show a visible focus ring. The failures sit in a few systemic places, and each one breaks a whole journey.

**A keyboard-only student cannot get from `/learn` into an Ionian lesson.** On the Theory tab, the key rows and chapter rows in an expanded card are clickable `<div>`s. The student can expand a card but cannot open anything inside it. Even inside a lesson, notes can only come from a MIDI device. We found no computer-keyboard way to play one.

Screen-reader users hit unnamed navigation (all 10 sidebar icons), dialogs that are not dialogs, no status announcements, and tab and view state that shows only as colour. Low-vision users hit a design-token grey (`--color-text-dim` #6b6b80) that fails contrast everywhere it's used. At 400% zoom, or anything under 768 px wide, the whole global navigation disappears.

**Three issues most likely to matter to a district:**
1. **Keyboard access to lessons (SC 2.1.1, blocker).** The Theory key and chapter pickers are mouse-only. Activities accept notes only from MIDI hardware. Studio track selection is mouse-only, so a keyboard user can't reach Prism or Piano Roll.
2. **Screen-reader basics (SC 4.1.2 / 2.4.4 / 4.1.3 / 2.4.2).** The 10 sidebar links have no accessible name. The lesson dialogs don't take focus, can't be recognised as dialogs, and aren't announced. Completion ("Great job!") is silent. Every page is titled "Music Atlas".
3. **Zoom and contrast (SC 1.4.10 / 1.4.4 / 1.4.3).** Navigation vanishes below 768 px. The shared dim-text token is 3.2–3.65:1, well under the 4.5:1 minimum, and some Studio labels fall to 1.97:1.

---

## 2. Findings (worst first)

Severity: **blocker** = a user group cannot complete a core task. **major** = a WCAG A/AA failure with real impact. **minor** = a narrow failure, or a best-practice gap.

| # | WCAG SC | Page / state · element | What fails | Verified by | Severity | Suggested fix (source hint) |
|---|---|---|---|---|---|---|
| 1 | **2.1.1 Keyboard (A)** | `/learn?tab=Theory`, expanded mode card · the **Keys** list (C Ionian … F Ionian) and the **Chapters** list (Overview / Melody / Chords / Practice Track) | The rows are `<div onClick>` with no role and no tabindex. After a card is expanded with the keyboard, Tab jumps from the chevron to the next card's "Save" button and never reaches a key or chapter. The card image (also `div onClick`) and the "DIATONIC MODES" section toggle can't be reached either. **A keyboard user cannot open a lesson from the Theory tab.** | keyboard, source | blocker | Render the rows as `<button>`s, or as `<Link>`s to `/learn/<mode>/<key>`. Make the card a button or link. `src/components/learn/LearnInlet.tsx` ~L1634 (key rows), ~L1690 and ~L1757 (chapter rows), L1089 (card `onClick`), L984 (section toggle). |
| 2 | **2.1.1 Keyboard (A)** | `/learn/ionian/c`, every Melody activity (Hold and Play Along) | Notes come only from Web MIDI. Pressing a s d f g h j k z x c v during a Hold activity registered nothing. The on-screen keyboard was not click-tested. Without MIDI hardware, a keyboard-only student can start an activity but can't do it. | keyboard | blocker | Add a computer-keyboard note map (the repo already has one in `src/components/JamRoom/useJamKeyboard.ts` and `ChordPressKeyboard.tsx`) and make on-screen keys focusable buttons. Wire them into `src/components/Games/NoteHold.tsx` and `PlayAlong.tsx`. |
| 3 | **2.1.1 Keyboard (A)** | `/studio/editor` · track headers, clips, notes, drum grid | You can't select a track with the keyboard. The track header isn't focusable, and focusing the track-name input doesn't select the track. So with Drums selected (the default), **Prism and Piano Roll can't be reached for Rhodes or Bass**. The drum step grid takes focus, but Enter, Space and the arrow keys added nothing (45 notes before and after). Clips and notes in the timeline aren't in the tab order. axe `scrollable-region-focusable`: 1–2 nodes per view. | keyboard, axe | blocker (Studio) | Make the track header a focusable, selectable row (`aria-selected`), and provide keyboard note and step entry. `src/daw/components/ChannelStrip/ChannelStrip.tsx` (tab visibility depends on the selected track). |
| 4 | **2.4.4 Link Purpose (A), 4.1.2 Name, Role, Value (A), 1.1.1 Non-text Content (A)** | Every page · left sidebar icon links | **10** icon-only links (Home, Learn, Studio, Globe, Arcade, Search, the two icons below it, Help, System) have **no accessible name**. The screen-reader tree reads them as "link", ten times over. Visible labels: none. A tooltip appears on hover or focus (seen: "System"), but it isn't the accessible name. The prior research said "nine icons". There are ten. | axe `link-name` ×10 on all 12 scanned states, accessibility tree, visual | major (blocker for screen-reader users) | Add `aria-label={props.label}` on the `NavLink` and `<a>` when `isCollapsed`. Consider visible text labels as well. `src/layouts/DashboardLayout/SidebarMainNavItem.tsx` ~L99–L113. Also wrap the lists in `<nav aria-label="Main">` in `ClassroomSidebar.tsx`. |
| 5 | **1.4.10 Reflow (AA), 1.4.4 Resize Text (AA)** | All pages below 768 CSS px (400% zoom on 1280 px; also 200% zoom on a 1280 px laptop = 640 px) | The sidebar **and** the top bar (XP, credits, notifications, profile) are `hidden md:flex`, with no mobile menu to replace them. At 320 px we found 0 navigation links and no menu button. The lesson sub-tab "Inversions" is also clipped off the right edge (the container is `overflow-x-hidden`). Text content does reflow, with no horizontal page scroll on `/learn`, Theory or the lesson. | visual at 320×640, DOM measure, source | major | Add a mobile nav (a menu button plus a drawer, or a bottom bar). `src/layouts/DashboardLayout/ClassroomDashboard.tsx` L27, `src/components/ClassroomLayout/TopRail.tsx` L46–49. Let the sub-tab strip wrap or scroll. The 200% case follows from the breakpoint and wasn't tested separately. |
| 6 | **4.1.2 (A), 2.4.3 Focus Order (A), 4.1.3 Status Messages (AA)** | `/learn/ionian/c` · "Ready to start?" and "Great job!" overlays | These are plain `div`s: no `role="dialog"`, no `aria-modal`, no label. Opening a step leaves focus on the step dot, not in the dialog. After Play Now, focus drops to `<body>`. At completion, focus is on `<body>`. **Escape** does nothing. Background controls stay in the tab order, including a *second*, blurred-out Demo/Practice/Play Now set behind the overlay (Play Now takes about 13 Tabs to reach). No `aria-live` or `role=status` region exists, so "Great job!" and per-note feedback are never announced. | keyboard, accessibility tree, DOM query | major | Use an accessible dialog primitive (the Radix Dialog already used elsewhere). Move focus to the primary button, trap focus, and restore focus on close. Put completion and feedback text in `role="status"`. `src/components/Games/ActivityFlow.tsx` ~L2370–2460 (start overlay) and the completion overlay nearby. |
| 7 | **1.4.3 Contrast (Minimum) (AA)** | App-wide token `--color-text-dim: #6b6b80` | 3.65:1 on #101012, 3.34:1 on #1a1a1a, 3.2:1 on #1e1e1e (needs 4.5:1). Used for the step counter "1/6", "Today's goal", Insight helper text, the Score toolbar, the Master labels and inactive tabs. Worst case: the 8 px "81%" confidence labels at 1.97:1 (`opacity:0.6`). axe node counts: Studio Create 36, Prism 41, Grooves 30, Piano Roll 25, Master 19, Score 18, Lead Sheet 6; one on each Learn page. | axe | major | Raise the token to at least #8e8ea3 (about 5:1 on #101012) and stop stacking `opacity` on it. The token is defined in `src/components/learn/learn.css:12`, `src/daw/daw.css:13`, `src/components/ClassroomLayout/dashboard/dashboard.css:14`, `src/features/settings/settings.css:12`. |
| 8 | **4.1.2 Name, Role, Value (A)** | Unnamed buttons | Theory mode-card expand chevron: **59** nodes, no name, no `aria-expanded`. Lesson back arrow: 1. Studio Grooves panel: **118**. Studio icon buttons (Insight panel, track rows): 2 per view. | axe `button-name`, keyboard | major | Add `aria-label` ("Show keys for Ionian") plus `aria-expanded` to the chevron in `LearnInlet.tsx` ~L1150. Add `aria-label="Back"` to the lesson back button. Audit the Grooves button grid. |
| 9 | **4.1.2 (A), 1.3.1 Info and Relationships (A), 1.4.1 Use of Color (A)** | Tab-like controls: Overview/Melody; Scale/Triads/7th Chords/Inversions; CREATE/MASTER/SCORE/LEAD SHEET; INSIGHT/LIBRARY; CONTROLS/FX/GROOVES/PRISM/PIANO ROLL | Plain buttons with no `role="tab"`, `aria-selected` or `aria-pressed`. The selected tab is shown only by colour (teal border and text, or a lighter background). A screen reader can't tell which view is active. | DOM query, accessibility tree, visual | major | Use a tablist pattern with `aria-selected`, plus a non-colour cue such as an underline or weight. `ChannelStrip.tsx` ~L225, the lesson tabs in `ActivityFlow.tsx` / `LessonOverview.tsx`, and the DAW top-bar view switcher. |
| 10 | **1.4.1 Use of Color (A)** | Lesson piano roll (Hold and Play Along) and the Overview keyboard | Notes already played are brighter red with a white outline. Notes still to come are dim red. A **correct hit is drawn in red, which reads as "wrong"**. Missed notes are grey. Wrong notes *do* get a "✕ E4" chip, which is good. Scale notes on the Overview piano are marked only by red fill. | visual (screenshots `a11y-hold-mid.png`, `a11y-pa-mid.png`) | major | Add a non-colour cue for "hit" (a ✓ or a fill pattern) and re-colour correct hits green or teal. The per-activity colour comes from `activityColor` in `ActivityFlow.tsx`. |
| 11 | **1.1.1 Non-text Content (A)** | Studio **Score** view; lesson piano roll; "Note sequence" in the Ready dialog | The score `<svg>` has no role, label or title. The target notes in the piano roll, and the Ready dialog's "Note sequence" keyboard, are missing from the accessibility tree. It exposes only the axis labels ("C4 B3 …"). | accessibility tree, DOM | major | Give each diagram a text alternative ("Target: C4 D4 E4 F4 G4 A4 B4 C5, one per beat"), and put `role="img"` plus an `aria-label` summary on the score. |
| 12 | **2.4.2 Page Titled (A)** | Every route checked | `document.title` is "Music Atlas" on `/learn`, Theory, `/learn/ionian`, `/learn/ionian/c`, `/studio` and `/studio/editor`. | DOM | major | Set per-route titles ("C Ionian – Melody – Music Atlas"). |
| 13 | **2.4.7 Focus Visible (AA)** | Studio: volume and master-volume sliders (Radix thumbs, 6×12 px), track-type `<select>`s, track-name inputs, the timeline container | Rendered pixels for the focused and unfocused slider and select were identical. The track-name inputs (`outline-none`) show only the text-selection highlight. Elsewhere (Play, view tabs, Insight links, all Learn controls) a clear ring is visible. | keyboard + before/after screenshots (`a11y-fs-*.png`) | major | Add `focus-visible:ring` to the slider thumbs, selects and inputs. Drop the bare `outline-none`. |
| 14 | **1.3.1 (A), 3.3.2 Labels or Instructions (A), 4.1.2 (A)** | Studio form fields | Track-name inputs (×3–4) and the velocity `range` have no label. Grooves and Prism `<select>`s (×3 each) have no name. The Prism sliders (×3) have no name. | axe `label`, `select-name`, `aria-input-field-name` | minor | Add `aria-label`s ("Track name", "Velocity", "Rhythm pattern", "Swing" …). |
| 15 | **2.5.3 Label in Name (A)** | `/learn` home banner; the instrument picker (all Learn pages) | The banner's visible text is "Start your first lesson … Browse", but its accessible name is "Start learning". The picker shows "Instrument: Piano" but is named "Instrument selector (not yet wired)". Voice-control users saying "click Browse" will miss. | accessibility tree, source | minor | Drop the overriding `aria-label` in `src/components/learn/LearnHome.tsx` L124, and fix `src/components/ClassroomLayout/dashboard/InstrumentSelector.tsx` L23. |
| 16 | **2.4.1 Bypass Blocks (A)** | All pages | No skip link. It takes 16 Tab stops (sidebar, top bar, back button) to reach lesson content. There's no `nav` landmark, the top bar sits inside `<main>`, and the Studio editor has **zero headings**. A `main` landmark and an `aside` do exist. | keyboard, DOM | minor | Add a "Skip to content" link, move the top bar into a `<header>` outside `main`, and add headings in the Studio panels. |
| 17 | **2.4.6 Headings and Labels (AA), 1.4.11 Non-text Contrast (AA)** | Lesson step dots | Step names ("C Ionian Descend • Hold" and so on) exist **only** in `aria-label`/`title`. What's visible is 16×6 px bars and "2/6". Inactive dots are `rgba(255,255,255,0.1)` on #101012, about 1.3:1 (needs 3:1). The current step has no `aria-current`. **Confirmed.** | accessibility tree, visual, source | minor | Show the current step name as visible text. Raise the dot contrast, add `aria-current="step"`, and enlarge the targets (16×6 fails SC 2.5.8 in WCAG 2.2). `ActivityFlow.tsx` ~L2227–2290. |
| 18 | **2.2.1 Timing Adjustable (A)** | Play Along activities | A tempo slider exists (named "Practice tempo in beats per minute", 40–160 BPM, default 80), so the slowest setting is 2× the default, not the 10× the SC asks for. Resetting to the default is double-click only. Mitigations: each Play Along has an untimed Hold twin; Practice mode exists; timing is arguably essential to a rhythm exercise. No pause control was found during Play Now. | keyboard, accessibility tree, source (`src/learn/audio/practiceSettingsStore.ts` L23–24) | minor | Document the "essential" exception in the VPAT. Add a keyboard reset button and a pause/restart control during play. Consider a lower minimum BPM. |
| 19 | (best practice; **2.5.8 in WCAG 2.2**) | Studio Insight panel · "F Ionian", "Parent: D Ionian" and similar lesson links | **Confirmed:** 9 px text, an 8×8 px book icon, 18 px-tall targets. Contrast passes (teal #7ecfcf). Not a WCAG 2.1 AA failure, but hard for low-vision students and below the 2.2 target size. | DOM computed style, visual | minor | Use at least 12–14 px text and 24 px targets. |
| 20 | **2.4.6 Headings and Labels (AA)** | Theory grid · heart buttons | Every heart is named just "Save" or "Remove from saved", with no mode name. They do have `aria-pressed`, which is good. | axe tree, source | minor | `aria-label={`Save ${title}`}` in `LearnInlet.tsx` ~L1122. |

**Keyboard answers to the three key questions**
- *Can a student get from `/learn` into an Ionian activity and start it with the keyboard only?* **No.** `/learn` Theory → Ionian is blocked (finding 1). The "Start learning" banner goes to the Genre tab. From `/learn/ionian` onward (reached by URL, say), the key tiles, lesson tabs, step dots and Play Now all work by keyboard, though focus handling is poor (finding 6). But the activity then needs MIDI (finding 2).
- *Can they reach Play, the view tabs and the Insight lesson links in the Studio?* **Yes.** Play is the 13th stop in the editor, the view tabs are stops 15–18, and the Insight links (around stop 69) all have visible focus rings. They **can't** reach Prism or Piano Roll for a melodic track (finding 3). The demo cards on `/studio?tab=Demos` are real buttons, and Enter opens the editor.
- *Keyboard traps?* None found. Tab cycles through `<body>` back to the top on every page tested, including 160 stops in the Studio editor.

**Prior-research claims, checked**
| Claim | Result |
|---|---|
| Mode cards on Theory are clickable `div`s with no role | **Confirmed**, for the card body. The chevron is a real button but has no name. The *key and chapter rows* inside an expanded card are the more serious case (finding 1). |
| The nine left-sidebar icons have no visible labels | **Confirmed**, but there are **ten**. They also have no *accessible* name at all (finding 4). |
| Lesson step names exist only in aria-labels | **Confirmed** (finding 17). |
| Insight→Learn links are 9px text with an 8px icon | **Confirmed** (finding 19). |

---

## 3. VPAT-style summary: WCAG 2.1 Level A and AA

Scope for every row is the pages listed at the top. "Not Evaluated" means we didn't test it. It does not mean the criterion passes.

| SC | Name | Level | Status | Remark |
|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | Does Not Support | 10 unnamed icon links, unnamed icon buttons, and a Score SVG and piano-roll targets with no text alternative. |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | Not Evaluated | No audio could be heard headless. The "Demo" playback animates the keyboard, but we didn't check that this works as an alternative. |
| 1.2.2 | Captions (Prerecorded) | A | Not Evaluated | No video found in scope. Other areas (Atlas, Genre) weren't surveyed. |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | Not Evaluated | As 1.2.2. |
| 1.2.4 | Captions (Live) | AA | Not Evaluated | Live collaboration and jam features weren't tested. |
| 1.2.5 | Audio Description (Prerecorded) | AA | Not Evaluated | As 1.2.2. |
| 1.3.1 | Info and Relationships | A | Does Not Support | Tabs lack tab semantics, the Studio has no headings, clickable divs, unlabeled inputs. |
| 1.3.2 | Meaningful Sequence | A | Not Evaluated | Spot check only. A hidden duplicate button set comes before the Ready dialog in DOM order. |
| 1.3.3 | Sensory Characteristics | A | Not Evaluated | Review the instruction "Play the notes … going down (to the left)", which leans on position. |
| 1.3.4 | Orientation | AA | Not Evaluated | Not tested. |
| 1.3.5 | Identify Input Purpose | AA | Not Evaluated | No personal-data forms in scope. |
| 1.4.1 | Use of Color | A | Does Not Support | Selected tab and view shown only by colour. Hit versus pending notes differ only in red shade. |
| 1.4.2 | Audio Control | A | Not Evaluated | No audio headless. A lesson volume slider exists. Auto-playing audio wasn't checked. |
| 1.4.3 | Contrast (Minimum) | AA | Does Not Support | `--color-text-dim` 3.2–3.65:1; 8 px labels 1.97:1. Up to 41 nodes per Studio view. |
| 1.4.4 | Resize Text | AA | Does Not Support | Global navigation hidden below 768 px, so it's lost at about 200% zoom on common laptops. Inferred from the 320 px test plus the source breakpoint. |
| 1.4.5 | Images of Text | AA | Not Evaluated | None seen, but no systematic check. |
| 1.4.10 | Reflow | AA | Does Not Support | At 320 px: no navigation, and a lesson sub-tab clipped. The Studio at 320 px wasn't tested (a DAW may qualify for the 2-D layout exception). |
| 1.4.11 | Non-text Contrast | AA | Does Not Support | Inactive step dots about 1.3:1. Other control borders weren't measured systematically. |
| 1.4.12 | Text Spacing | AA | Not Evaluated | Tested on the lesson page only, where no clipped text was detected. Other pages untested. |
| 1.4.13 | Content on Hover or Focus | AA | Not Evaluated | Sidebar tooltips appear on focus. Escape dismissal and hoverability weren't tested. |
| 2.1.1 | Keyboard | A | Does Not Support | Theory key and chapter pickers, activity note input (MIDI only), Studio track selection and note/clip/step editing. |
| 2.1.2 | No Keyboard Trap | A | Supports | No trap on any page in scope. Tab cycled through every page, including 160 stops in the Studio. Not tested outside scope. |
| 2.1.4 | Character Key Shortcuts | A | Not Evaluated | The Studio's single-key shortcuts weren't inventoried. |
| 2.2.1 | Timing Adjustable | A | Partially Supports | Tempo slider goes only to 2× slower, and there's an untimed Hold alternative. Timing may be claimed as essential. No pause during Play Now. |
| 2.2.2 | Pause, Stop, Hide | A | Not Evaluated | The auto-scrolling piano roll and the ambient animated card backgrounds weren't assessed. Reduced-motion CSS exists. |
| 2.3.1 | Three Flashes or Below Threshold | A | Not Evaluated | Not tested. |
| 2.4.1 | Bypass Blocks | A | Partially Supports | A `main` landmark exists. No skip link, no `nav` landmark, and the top bar sits inside `main`. |
| 2.4.2 | Page Titled | A | Does Not Support | Every route is titled "Music Atlas". |
| 2.4.3 | Focus Order | A | Does Not Support | Dialogs don't receive focus. Focus drops to body after Play Now and at completion. Obscured controls stay focusable. |
| 2.4.4 | Link Purpose (In Context) | A | Does Not Support | 10 sidebar links have no name. |
| 2.4.5 | Multiple Ways | AA | Not Evaluated | Search and navigation exist. Search wasn't tested. |
| 2.4.6 | Headings and Labels | AA | Partially Supports | Learn pages have headings. Generic "Save" labels, no Studio headings, a "(not yet wired)" label. |
| 2.4.7 | Focus Visible | AA | Partially Supports | Most controls show a ring. Sliders, selects, track-name inputs and the timeline show none. |
| 2.5.1 | Pointer Gestures | A | Not Evaluated | Studio drag interactions weren't reviewed. |
| 2.5.2 | Pointer Cancellation | A | Not Evaluated | Not tested. |
| 2.5.3 | Label in Name | A | Does Not Support | "Start learning" versus visible "Browse"; "Instrument selector (not yet wired)" versus "Instrument: Piano". |
| 2.5.4 | Motion Actuation | A | Not Applicable | No motion-actuated features seen in scope. |
| 3.1.1 | Language of Page | A | Supports | `<html lang="en">` on all routes checked. |
| 3.1.2 | Language of Parts | AA | Not Evaluated | World Harmony and other non-English content not in scope. |
| 3.2.1 | On Focus | A | Supports | No context change across roughly 300 focus moves in scope. Not tested outside scope. |
| 3.2.2 | On Input | A | Not Evaluated | Selects and toggles weren't exercised for context changes. |
| 3.2.3 | Consistent Navigation | AA | Supports | Same sidebar and top bar, same order, on every in-scope page (at widths of 768 px and up). |
| 3.2.4 | Consistent Identification | AA | Not Evaluated | Not systematically compared. |
| 3.3.1 | Error Identification | A | Not Evaluated | No forms with validation in scope. |
| 3.3.2 | Labels or Instructions | A | Does Not Support | Unlabeled track-name inputs, selects and sliders in the Studio. |
| 3.3.3 | Error Suggestion | AA | Not Evaluated | As 3.3.1. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | Not Evaluated | Out of scope (billing and account areas). |
| 4.1.1 | Parsing | A | Supports | The W3C errata for WCAG 2.1 (2023) treat this criterion as always satisfied for HTML. Not validated independently. |
| 4.1.2 | Name, Role, Value | A | Does Not Support | Unnamed links and buttons (up to 118 per view), no tab/dialog roles, no expanded/selected state. |
| 4.1.3 | Status Messages | AA | Does Not Support | No live regions. Completion and note feedback aren't announced. |

Tally (50 criteria): 15 Does Not Support · 4 Partially Supports · 5 Supports · 1 Not Applicable · 25 Not Evaluated.

---

## 4. What still needs a human

- **Real screen reader passes.** Run VoiceOver + Safari (macOS and iPad, since districts use iPads), NVDA + Chrome/Firefox, and JAWS on Windows. Walk the same journeys: what's announced for the lesson dialogs, the piano roll, the Insight panel and the Score. The accessibility tree is only a proxy.
- **Real zoom, and mobile or tablet.** Test browser zoom at 200% and 400% on a 1280 px laptop, and Chromebooks, which are common in districts. We emulated a 320 px viewport, which isn't the same as zoom. Include iPad touch with VoiceOver, and Studio reflow.
- **Keyboard-only lesson completion** once fixes land, including whether a non-MIDI input path is pedagogically acceptable.
- **Audio.** Check 1.4.2 (auto-playing backing tracks, Demo) and whether audio-only cues have visual equivalents. We could judge neither headless.
- **Motion and flashing.** Check the hex-wave card animations, the scrolling piano roll and the playhead against 2.2.2 and 2.3.1, and against vestibular comfort.
- **Cognitive load.** The Studio shows dozens of 9–10 px controls at once. Lesson instructions depend on music vocabulary. Step names are hidden. "Hold" versus "Play Along" isn't explained on screen. Review with teachers and special-education staff.
- **Timing policy.** Decide, and document in the VPAT, whether Play Along timing is an "essential" exception under 2.2.1, and what accommodation is offered (slower tempo, Hold variant).
- **Areas outside this scope:** Atlas/Globe, Songs, Genre, Arcade, Teacher Portal, sign-in (Auth0), settings, and any PDF or print outputs. A district VPAT has to cover whatever product surface is sold.
- **Colour-vision simulation.** Check the per-key colour coding in the Theory keys list, the track colours, and the Prism harmony colour bar.
