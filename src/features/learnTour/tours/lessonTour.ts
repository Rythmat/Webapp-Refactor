import { atReturnLesson, atStudio } from '../places';
import { pressEscape, type TargetSpec } from '../targets';
import type { TourApi, TourDefinition, TourStep } from '../types';

// ── The lesson tour ────────────────────────────────────────────────────────
// Offered the first time a player opens a genre or Theory lesson ("Is this
// your first time in Music Atlas Learn?"), and again from Lesson Settings.
// Peter's order (2026-10-21): Demo / Practice / Play Now, Roll / Notation /
// Falling, Hands, the lesson's parts, the step arrows and the number that
// opens the list, Settings, Practice Track; in the Practice Track, Play and
// Loop, 1 2 3 / A B C, the scales and chords, Things to Try, Record take and
// Take it to the Studio; then back to the lesson, where Lesson Settings shows
// the way to take the tour again.
//
// The lesson screens and the Practice Track are found by the attributes and
// labels they already carry. A control a lesson doesn't have (Hands on
// guitar, a part it lacks) is passed by.

const BAR = '[data-guitar-bar]';
const STEP_LIST: TargetSpec = {
  css: '[aria-label="All steps in this section"]',
};
const SETTINGS_SHEET: TargetSpec = { css: '[data-guitar-sheet="settings"]' };
const PRACTICE = '[data-testid="practice-track-view"]';
const PRACTICE_HEADER = '[data-testid="practice-header"]';

/** The settings sheet, shut if it's open. */
function closeSettings(api: TourApi) {
  if (api.find(SETTINGS_SHEET).length === 0) return;
  if (
    !api.click({
      css: '[data-guitar-sheet="settings"] button',
      text: /^Close$/,
    })
  )
    pressEscape();
}

let settingsOpenedAt = 0;
/** The settings sheet, opened once (the gear toggles it). */
function openSettings(api: TourApi) {
  if (api.find(SETTINGS_SHEET).length > 0) return;
  if (Date.now() - settingsOpenedAt < 1200) return;
  if (api.click({ css: 'button[data-guitar-settings]' }))
    settingsOpenedAt = Date.now();
}

/** "Melody, Chords, Bass and Performance", as this lesson names its parts. */
function partsText(api: TourApi): string {
  const names = api
    .find({
      css: '[role="group"][aria-label="Sections"] button[data-section]',
      all: true,
    })
    .map((b) => `**${(b.textContent ?? '').trim()}**`)
    .filter((n) => n !== '****');
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
      : (names[0] ?? 'its parts');
  return `This lesson comes in parts: ${list}. Click one to jump to it.`;
}

const lesson = (
  step: Omit<TourStep, 'at' | 'href' | 'chapter'> & { chapter?: string },
): TourStep => ({
  chapter: 'Your lesson',
  at: atReturnLesson,
  href: (ctx) => ctx.returnTo,
  ...step,
});

const practiceTrack = (step: Omit<TourStep, 'at' | 'chapter'>): TourStep => ({
  chapter: 'Practice Track',
  at: atStudio,
  // The Practice Track opens only from its lesson.
  resumeFrom: 'open-practice-track',
  // The Studio's code loads the first time it opens.
  wait: 20000,
  ...step,
});

export const lessonTour: TourDefinition = {
  id: 'lesson',
  title: 'Lesson tour',
  finale: {
    heading: "You're ready!",
    line: 'That’s everything on the lesson screen.',
  },
  steps: [
    lesson({
      id: 'to-melody',
      // A Theory lesson opens on its Overview, with nothing to play.
      when: (api) =>
        api.find({ css: '[data-section="O"][aria-current="true"]' }).length > 0,
      target: { css: 'button[data-section="A"]' },
      text: 'This lesson opens on its **Overview**. Let’s go to **Melody**, where you play.',
      next: 'click',
      doneWhen: 'click',
    }),
    lesson({
      id: 'demo',
      chapter: 'Watch, practice, play',
      target: { css: `${BAR} button`, text: /^(Demo|Stop demo)$/ },
      text: '**Demo** plays the step for you, so you can see and hear it before you try.',
    }),
    lesson({
      id: 'practice',
      chapter: 'Watch, practice, play',
      target: { css: `${BAR} button`, text: /^Practice$/ },
      text: '**Practice** is your turn at your own pace: the notes wait for you.',
    }),
    lesson({
      id: 'play-now',
      chapter: 'Watch, practice, play',
      target: { css: `${BAR} [data-primary]`, text: /Play Now|Loading/ },
      text: '**Play Now** is the real take: play in time with the band and get your score.',
    }),
    lesson({
      id: 'views',
      chapter: 'How you see it',
      target: { css: '[data-roll-view-switch]' },
      text: 'Choose how the notes appear: **Roll**, **Notation** or **Falling**. Try them!',
    }),
    lesson({
      id: 'hands',
      chapter: 'How you see it',
      target: { css: '[data-hands-switch]' },
      text: '**Hands** puts hands on the keys to show which finger plays each note.',
    }),
    lesson({
      id: 'parts',
      chapter: 'Finding your way',
      target: { css: '[role="group"][aria-label="Sections"]' },
      text: partsText,
    }),
    lesson({
      id: 'arrows',
      chapter: 'Finding your way',
      target: [
        { css: 'button[aria-label="Previous step"]' },
        { css: 'button[aria-label="Next step"]' },
      ],
      text: 'Each part is a row of steps. The **arrows** take you to the step before or after.',
    }),
    lesson({
      id: 'count',
      chapter: 'Finding your way',
      target: { css: '[data-guitar-step-count]' },
      text: 'Click the **number** to see every step in this part at once.',
      next: 'click',
      doneWhen: (api) => api.find(STEP_LIST).length > 0,
    }),
    lesson({
      id: 'list',
      resumeFrom: 'count',
      chapter: 'Finding your way',
      target: STEP_LIST,
      wait: 2500,
      text: 'Here they all are. Pick any step to jump straight to it.',
      next: (api) => {
        if (api.find(STEP_LIST).length > 0) pressEscape();
      },
    }),
    lesson({
      id: 'settings',
      chapter: 'Settings',
      target: { css: 'button[data-guitar-settings]' },
      text: '**Settings** holds this lesson’s sound options.',
      next: 'click',
      doneWhen: (api) => api.find(SETTINGS_SHEET).length > 0,
    }),
    lesson({
      id: 'settings-sheet',
      resumeFrom: 'settings',
      chapter: 'Settings',
      target: SETTINGS_SHEET,
      wait: 2500,
      text: 'Set the metronome, the volume and the audio timing here.',
      next: closeSettings,
    }),
    lesson({
      id: 'open-practice-track',
      chapter: 'Practice Track',
      target: { css: '[data-guitar-nav] button', text: /Practice Track/ },
      text: 'A **Practice Track** is a band that plays this lesson’s groove for as long as you like. Let’s open it.',
      next: 'click',
      doneWhen: (api) => atStudio(api.place),
    }),
    practiceTrack({
      id: 'play-loop',
      target: [
        { css: `${PRACTICE} button`, text: /^(▶ Play|❚❚ Pause)$/ },
        { css: `${PRACTICE} button[aria-pressed]`, text: /Loop/ },
      ],
      text: '**Play** starts the band, and **Loop** keeps the groove going around.',
    }),
    practiceTrack({
      id: 'labels',
      target: { css: `${PRACTICE} button[aria-label$=" labels"]`, all: true },
      text: 'Turn the labels on the keys on and off: **1 2 3** for scale degrees, **A B C** for note names.',
    }),
    practiceTrack({
      id: 'scales-chords',
      target: {
        css: ['What the keyboard shows', 'Scale to show', 'Chord voicing']
          .map((label) => `${PRACTICE} [role="group"][aria-label="${label}"]`)
          .join(', '),
        all: true,
      },
      text: 'Choose what the keyboard lights up: the **scales** to play over the groove, or its **chords**.',
    }),
    practiceTrack({
      id: 'things-to-try',
      target: { css: `${PRACTICE} section`, text: /^Things to try/ },
      text: 'Not sure what to play? **Things to Try** gives you ideas to start with.',
    }),
    practiceTrack({
      id: 'record',
      target: {
        css: `${PRACTICE} button`,
        text: /Record take|Stop recording|Counting in/,
      },
      text: '**Record Take** records you playing along with the band.',
    }),
    practiceTrack({
      id: 'to-studio',
      target: {
        css: `${PRACTICE_HEADER} button`,
        text: /Take it to the Studio/,
      },
      text: '**Take it to the Studio** opens your take in the full Studio, to edit and mix it.',
    }),
    practiceTrack({
      id: 'back',
      target: { css: `${PRACTICE_HEADER} button`, text: /Back to/ },
      text: 'That’s the Practice Track. Let’s go back to your lesson.',
      next: 'click',
      doneWhen: (api) => !atStudio(api.place),
    }),
    lesson({
      id: 'again',
      chapter: 'One more thing',
      enter: openSettings,
      target: { css: '[data-settings-group="help"]' },
      wait: 12000,
      text: 'Want this tour again? It’s here in **Lesson Settings** whenever you need it.',
      next: closeSettings,
    }),
  ],
};
