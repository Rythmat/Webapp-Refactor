import { useState } from 'react';
import { GuitarAboutStepSheet, useAboutStepNews } from './GuitarAboutStepSheet';
import { GuitarActionBar } from './GuitarActionBar';
import { GuitarInputIndicator } from './GuitarInputIndicator';
import { GuitarLessonHeader } from './GuitarLessonHeader';
import { GuitarResultPanel, resultSummary } from './GuitarResultPanel';
import { GuitarSectionCompletePanel } from './GuitarSectionCompletePanel';
import { GuitarSettingsSheet, type SettingsGroup } from './GuitarSettingsSheet';
import { GuitarStepNav } from './GuitarStepNav';
import { deriveBarState } from './deriveBarState';
import type { GuitarLessonLayoutProps } from './types';
import { useGuitarStepKeys } from './useGuitarStepKeys';
import './guitarLayout.css';

// ── The guitar lesson screen ───────────────────────────────────────────────
// Presentational: GenreLessonContainerV2 keeps every hook, timer and handler
// and hands this layout values and callbacks (./types). The layout owns only
// which sheet is open — and nothing opens by itself.
//
//   header    eyebrow crumbs, the step's name, About this step, settings
//   nav       sections, ♪ Practice Track, ‹ 3 / 20 ›, the progress line
//   visuals   the big area: chord strip / scale box and a large fretboard;
//             the result or the section-complete offer take this slot,
//             never the TAB's
//   stage     the TAB, a slim full-width band showing one line at a time —
//             one box, the same DOM node in every state, measured by the
//             container through slots.tabViewportRef
//   bar       pinned at the bottom (GuitarActionBar)

export function GuitarLessonLayout({
  header,
  nav,
  run,
  tempo,
  practice,
  input,
  result,
  offer,
  theory,
  slots,
}: GuitarLessonLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Where Settings opens: the top from the gear, Input from the indicator. */
  const [settingsFocus, setSettingsFocus] = useState<SettingsGroup>();
  const [aboutOpen, setAboutOpen] = useState(false);
  const openSettings = (group?: SettingsGroup) => {
    setSettingsFocus(group);
    setSettingsOpen(true);
  };
  const aboutHasNews = useAboutStepNews(theory);

  const barState = deriveBarState({
    state: run.state,
    restartingPass: run.restartingPass,
    hasResult: result !== null,
    hasOffer: offer !== null,
  });

  /** The container passes the setup dialog only while it is open. */
  const setupOpen = slots.setupModal != null && slots.setupModal !== false;

  useGuitarStepKeys({
    enabled:
      barState === 'preview' && !settingsOpen && !aboutOpen && !setupOpen,
    index: nav.index,
    count: nav.steps.length,
    goToStep: nav.goToStep,
  });

  // Said once when a result or the section-complete offer arrives: both
  // appear in place of the visuals, above the TAB and away from wherever
  // focus is.
  const announcement =
    barState === 'sectionComplete' && offer
      ? offer.heading
      : barState === 'result' && result
        ? resultSummary(result, run.listen.passMarkPct)
        : '';

  const slotTakenBy =
    barState === 'result' && result ? (
      <GuitarResultPanel result={result} passMarkPct={run.listen.passMarkPct} />
    ) : barState === 'sectionComplete' && offer ? (
      <GuitarSectionCompletePanel offer={offer} />
    ) : null;

  return (
    <div
      data-guitar-layout
      data-bar-state={barState}
      className="flex h-full min-h-0 flex-col bg-[#101012] text-[#e8e8f0]"
    >
      {/* Scrolls only when the window is too short (or on a phone). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Desktop: exactly the scroller's height, so the visuals take what
            the fixed TAB band leaves and a tall TAB scrolls in its own box
            instead of growing it (the container sizes the TAB from that
            box). Phone: as tall as its content. */}
        <div
          data-guitar-column
          className="mx-auto flex min-h-0 w-full max-w-[1184px] flex-auto flex-col gap-4 px-6 pb-4 pt-5 max-[639px]:flex-[1_0_auto] max-[639px]:px-4"
        >
          <GuitarLessonHeader
            header={header}
            aboutHasNews={aboutHasNews}
            aboutOpen={aboutOpen}
            onOpenAbout={() => setAboutOpen(true)}
            settingsOpen={settingsOpen}
            // The gear toggles: Settings is not modal, so it stays in reach.
            onOpenSettings={() =>
              settingsOpen ? setSettingsOpen(false) : openSettings()
            }
            inputIndicator={
              <GuitarInputIndicator
                handle={input.handle}
                onOpenSetup={input.openSetup}
                onOpenInputSettings={() => openSettings('input')}
              />
            }
          />

          <GuitarStepNav nav={nav} keyColor={header.keyColor} />

          {/* Above the TAB in the markup as on screen, so focus and reading
              order follow what the student sees. */}
          <div data-guitar-visuals-slot className="min-w-0">
            {/* Kept mounted under the result, so Try Again doesn't rebuild
                the chord strip and fretboard. No display utility here: it
                would beat [hidden] and show the visuals under the result. */}
            <div hidden={slotTakenBy !== null} className="h-full">
              {slots.visuals}
            </div>
            {slotTakenBy}
          </div>

          <div
            ref={slots.tabViewportRef}
            data-guitar-stage
            // No border of its own: the TAB (or notation) face draws the one
            // hairline, 1px inside this box would read as a double line.
            className="relative overflow-y-auto overflow-x-hidden rounded-xl bg-[#151518]"
            // VexFlow's digit knock-outs take the panel's own colour.
            style={{ ['--ma-tab-gap' as string]: '#151518' }}
          >
            {slots.tab}
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        data-guitar-announcer
        className="sr-only"
      >
        {announcement}
      </div>

      <GuitarActionBar
        state={barState}
        run={run}
        tempo={tempo}
        practice={practice}
        input={input}
        result={result}
        offer={offer}
      />

      <GuitarSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        focusGroup={settingsFocus}
        theory={theory}
        input={input}
      />
      <GuitarAboutStepSheet
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        theory={theory}
        instruction={run.instruction}
      />
      {slots.setupModal}
    </div>
  );
}
