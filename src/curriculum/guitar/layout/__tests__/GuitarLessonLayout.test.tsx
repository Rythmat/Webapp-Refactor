// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createRef, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuitarLessonLayout } from '../GuitarLessonLayout';
import type { GuitarLessonLayoutProps } from '../types';
import {
  fakeHandle,
  makeAssessment,
  makeInput,
  makeLayoutProps,
  makeOffer,
  makeResult,
  makeRun,
  makeTempo,
} from './fixtures';

// The sheets are Lane B's: here they only have to open when asked, with what
// they were asked for.
const sheets = vi.hoisted(() => ({
  news: false,
  settingsProps: [] as { open: boolean; focusGroup?: string }[],
  aboutProps: [] as { open: boolean; instruction: string }[],
}));

vi.mock('../GuitarSettingsSheet', () => ({
  GuitarSettingsSheet: (props: {
    open: boolean;
    focusGroup?: string;
    onOpenChange: (open: boolean) => void;
  }) => {
    sheets.settingsProps.push(props);
    return props.open ? (
      <div
        role="dialog"
        aria-label="Settings sheet"
        data-focus-group={props.focusGroup ?? 'none'}
      >
        <button type="button" onClick={() => props.onOpenChange(false)}>
          Close settings
        </button>
      </div>
    ) : null;
  },
}));

vi.mock('../GuitarAboutStepSheet', () => ({
  GuitarAboutStepSheet: (props: {
    open: boolean;
    instruction: string;
    onOpenChange: (open: boolean) => void;
  }) => {
    sheets.aboutProps.push(props);
    return props.open ? (
      <div role="dialog" aria-label="About sheet">
        {props.instruction}
        <button type="button" onClick={() => props.onOpenChange(false)}>
          Close about
        </button>
      </div>
    ) : null;
  },
  useAboutStepNews: () => sheets.news,
}));

let tabMounts = 0;
let visualsMounts = 0;
function TabStub() {
  useEffect(() => {
    tabMounts++;
  }, []);
  return <div data-testid="tab">TAB</div>;
}
function VisualsStub() {
  useEffect(() => {
    visualsMounts++;
  }, []);
  return <div data-testid="visuals">Visuals</div>;
}

function props(overrides: Partial<GuitarLessonLayoutProps> = {}) {
  const base = makeLayoutProps();
  return makeLayoutProps({
    ...overrides,
    slots: {
      ...base.slots,
      tab: <TabStub />,
      visuals: <VisualsStub />,
      ...overrides.slots,
    },
  });
}

beforeEach(() => {
  tabMounts = 0;
  visualsMounts = 0;
  sheets.news = false;
  sheets.settingsProps = [];
  sheets.aboutProps = [];
});
afterEach(cleanup);

const stage = () => document.querySelector<HTMLElement>('[data-guitar-stage]')!;
const slot = () =>
  document.querySelector<HTMLElement>('[data-guitar-visuals-slot]')!;

describe('GuitarLessonLayout — structure', () => {
  it('a full-height column: header, nav, the visuals, the TAB, the bar', () => {
    const p = props();
    const { container } = render(<GuitarLessonLayout {...p} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-guitar-layout');
    expect(root.className).toMatch(/\bflex\b/);
    expect(root.className).toMatch(/\bflex-col\b/);
    expect(root.className).toMatch(/\bh-full\b/);
    // In the markup as on screen (no CSS order), so focus and reading order
    // follow it: the fretboard over the TAB.
    const order = [
      '[data-guitar-header]',
      '[data-guitar-nav]',
      '[data-guitar-visuals-slot]',
      '[data-guitar-stage]',
      '[data-guitar-bar]',
    ].map((sel) => root.querySelector(sel)!);
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('the TAB sits in the box the container measures, on a raised panel', () => {
    const p = props();
    render(<GuitarLessonLayout {...p} />);
    expect(p.slots.tabViewportRef.current).toBe(stage());
    expect(within(stage()).getByTestId('tab')).toBeInTheDocument();
    expect(stage().className).toMatch(/rounded-xl/);
    expect(stage().className).toMatch(/bg-\[#151518\]/);
    // The TAB face draws the panel's hairline; a second one here doubled it.
    expect(stage().className).not.toMatch(/\bborder\b/);
    expect(stage().style.getPropertyValue('--ma-tab-gap')).toBe('#151518');
    // Only the TAB is in it: nothing overlays it.
    expect(stage().children).toHaveLength(1);
  });

  it('the column is held to the window, so a tall TAB scrolls in its box', () => {
    // Content-sized (flex-basis auto, no shrink), the column grew with the
    // TAB and the page scrolled — and the container, which sizes the TAB
    // from this box, fed the growth back. Only a phone sizes to content.
    render(<GuitarLessonLayout {...props()} />);
    const column = document.querySelector<HTMLElement>('[data-guitar-column]')!;
    expect(column).toContainElement(stage());
    const classes = column.className.split(/\s+/);
    expect(classes).toContain('min-h-0');
    expect(classes).toContain('flex-auto');
    expect(classes).not.toContain('flex-[1_0_auto]');
    expect(classes).toContain('max-[639px]:flex-[1_0_auto]');
    expect(stage().className).toMatch(/\boverflow-y-auto\b/);
  });

  it('renders the setup dialog slot', () => {
    render(
      <GuitarLessonLayout
        {...props({
          slots: {
            tabViewportRef: createRef(),
            tab: null,
            visuals: null,
            setupModal: <div role="dialog" aria-label="Guitar setup" />,
          },
        })}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Guitar setup' }),
    ).toBeInTheDocument();
  });
});

describe('GuitarLessonLayout — the TAB box never remounts', () => {
  it('is the same node, with the same TAB, from preview to take, result, offer and back', () => {
    const p = props();
    const { rerender } = render(<GuitarLessonLayout {...p} />);
    const box = stage();
    const tab = screen.getByTestId('tab');

    const states: Partial<GuitarLessonLayoutProps>[] = [
      { run: makeRun({ state: 'practice' }), tempo: makeTempo() },
      { run: makeRun({ state: 'preview', restartingPass: true }) },
      { run: makeRun({ state: 'performance' }), tempo: makeTempo() },
      { run: makeRun({ state: 'complete' }), result: makeResult() },
      {
        run: makeRun({ state: 'complete' }),
        result: makeResult(),
        offer: makeOffer(),
      },
      { run: makeRun({ state: 'preview' }) },
    ];
    for (const next of states) {
      rerender(<GuitarLessonLayout {...p} {...next} />);
      expect(stage()).toBe(box);
      expect(screen.getByTestId('tab')).toBe(tab);
      expect(p.slots.tabViewportRef.current).toBe(box);
    }
    expect(tabMounts).toBe(1);
  });
});

describe('GuitarLessonLayout — the visuals slot', () => {
  it('shows the visuals in the preview', () => {
    render(<GuitarLessonLayout {...props()} />);
    expect(within(slot()).getByTestId('visuals')).toBeVisible();
    expect(slot().querySelector('[data-guitar-result]')).toBeNull();
  });

  it('after a take the result takes the slot; the visuals wait, mounted', () => {
    const p = props();
    const { rerender } = render(<GuitarLessonLayout {...p} />);
    rerender(
      <GuitarLessonLayout
        {...p}
        run={makeRun({ state: 'complete' })}
        result={makeResult()}
      />,
    );
    expect(
      within(slot()).getByRole('heading', { name: '100%' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('visuals')).not.toBeVisible();
    // Hidden by the attribute alone: a display utility would beat
    // Tailwind's [hidden] rule and show the visuals under the result.
    expect(screen.getByTestId('visuals').parentElement!.className).not.toMatch(
      /(^|\s)(block|flex|grid|inline[\w-]*|contents|table)(\s|$)/,
    );
    // Try Again: back to the visuals, not rebuilt.
    rerender(<GuitarLessonLayout {...p} />);
    expect(screen.getByTestId('visuals')).toBeVisible();
    expect(slot().querySelector('[data-guitar-result]')).toBeNull();
    expect(visualsMounts).toBe(1);
  });

  it('the result and the offer sit at their own height, centred in the big area', () => {
    // Stretched to the area's full height they read as a large empty box.
    const naturalHeight = (sel: string) => {
      const classes = slot().querySelector(sel)!.className.split(/\s+/);
      expect(classes).toEqual(
        expect.arrayContaining(['my-auto', 'max-h-full', 'overflow-y-auto']),
      );
      expect(classes).not.toContain('h-full');
    };
    const p = props({
      run: makeRun({ state: 'complete' }),
      result: makeResult(),
    });
    const { rerender } = render(<GuitarLessonLayout {...p} />);
    naturalHeight('[data-guitar-result]');
    rerender(<GuitarLessonLayout {...p} offer={makeOffer()} />);
    naturalHeight('[data-guitar-section-complete]');
  });

  it('the result shows the step’s pass mark', () => {
    render(
      <GuitarLessonLayout
        {...props({
          run: makeRun({
            state: 'complete',
            listen: { mode: 'keepTime', passMarkPct: 60 },
          }),
          result: makeResult({ result: makeAssessment({ passed: false }) }),
        })}
      />,
    );
    expect(screen.getByText('Not yet · 60% passes')).toBeInTheDocument();
  });

  it('the section-complete offer wins over the result, in the slot and the bar', () => {
    render(
      <GuitarLessonLayout
        {...props({
          run: makeRun({ state: 'complete' }),
          result: makeResult(),
          offer: makeOffer(),
        })}
      />,
    );
    expect(
      within(slot()).getByRole('heading', { name: 'Melody complete!' }),
    ).toBeInTheDocument();
    expect(slot().querySelector('[data-guitar-result]')).toBeNull();
    expect(screen.queryByRole('heading', { name: '100%' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try Again' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Enter Practice Track' }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-guitar-layout]')).toHaveAttribute(
      'data-bar-state',
      'sectionComplete',
    );
  });
});

describe('GuitarLessonLayout — announcing what arrives in the slot', () => {
  it('says the result, then the offer, from one live region that stays', () => {
    const p = props();
    const { rerender } = render(<GuitarLessonLayout {...p} />);
    const live = document.querySelector<HTMLElement>(
      '[data-guitar-announcer]',
    )!;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    expect(live).toHaveClass('sr-only');
    expect(live).toBeEmptyDOMElement();

    rerender(
      <GuitarLessonLayout
        {...p}
        run={makeRun({ state: 'complete' })}
        result={makeResult({
          result: makeAssessment({ passed: false, overallScore: 0.62 }),
        })}
      />,
    );
    expect(document.querySelector('[data-guitar-announcer]')).toBe(live);
    expect(live).toHaveTextContent('62%. Not yet: 75% passes.');

    rerender(
      <GuitarLessonLayout
        {...p}
        run={makeRun({ state: 'complete' })}
        result={makeResult()}
        offer={makeOffer()}
      />,
    );
    expect(live).toHaveTextContent(/^Melody complete!$/);

    rerender(<GuitarLessonLayout {...p} />);
    expect(live).toBeEmptyDOMElement();
  });
});

describe('GuitarLessonLayout — nothing opens by itself', () => {
  const noDialog = () => expect(screen.queryByRole('dialog')).toBeNull();

  it('not on mount, a step change, entering B, a take or a result', () => {
    sheets.news = true; // unseen notes: still only a dot
    const p = props();
    const { rerender } = render(<GuitarLessonLayout {...p} />);
    noDialog();
    expect(screen.queryByRole('menu')).toBeNull();

    const nextStep = props({
      header: {
        ...p.header,
        activity: 'B2.1: Play Chords 1,2,3,4 (Out of Time)',
        subsection: 'B2: Play Chord (Triads)',
      },
      nav: {
        ...p.nav,
        index: 0,
        sections: p.nav.sections.map((s) => ({ ...s, active: s.id === 'B' })),
      },
    });
    for (const next of [
      nextStep,
      { ...nextStep, run: makeRun({ state: 'practice' }) },
      { ...nextStep, run: makeRun({ state: 'performance' }) },
      {
        ...nextStep,
        run: makeRun({ state: 'complete' }),
        result: makeResult(),
      },
      { ...nextStep, offer: makeOffer() },
    ]) {
      rerender(<GuitarLessonLayout {...next} />);
      noDialog();
    }
    expect(sheets.settingsProps.every((s) => !s.open)).toBe(true);
    expect(sheets.aboutProps.every((s) => !s.open)).toBe(true);
    expect(
      screen.getByRole('button', { name: 'About this step' }),
    ).toHaveAttribute('data-unseen', 'true');
  });
});

describe('GuitarLessonLayout — sheets', () => {
  it('the gear opens Settings at the top; closing it closes it', () => {
    render(<GuitarLessonLayout {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lesson settings' }));
    const sheet = screen.getByRole('dialog', { name: 'Settings sheet' });
    expect(sheet).toHaveAttribute('data-focus-group', 'none');
    expect(
      screen.getByRole('button', { name: 'Lesson settings' }),
    ).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the gear closes Settings when it is open (the sheet is not modal)', () => {
    render(<GuitarLessonLayout {...props()} />);
    const gear = screen.getByRole('button', { name: 'Lesson settings' });
    fireEvent.click(gear);
    expect(screen.getByRole('dialog', { name: 'Settings sheet' })).toBeTruthy();
    fireEvent.click(gear);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(gear).toHaveAttribute('aria-expanded', 'false');
  });

  it('About this step opens its sheet with the full instruction', () => {
    const p = props();
    render(<GuitarLessonLayout {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'About this step' }));
    expect(
      screen.getByRole('dialog', { name: 'About sheet' }),
    ).toHaveTextContent(p.run.instruction);
  });

  it('shows the unseen dot from useAboutStepNews', () => {
    const { rerender } = render(<GuitarLessonLayout {...props()} />);
    expect(document.querySelector('[data-guitar-about-dot]')).toBeNull();
    sheets.news = true;
    rerender(<GuitarLessonLayout {...props()} />);
    expect(document.querySelector('[data-guitar-about-dot]')).not.toBeNull();
  });

  it('"Mic blocked · Fix" opens Settings at Input', () => {
    const input = makeInput({ handle: fakeHandle('denied') });
    render(<GuitarLessonLayout {...props({ input })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mic blocked · Fix' }));
    expect(
      screen.getByRole('dialog', { name: 'Settings sheet' }),
    ).toHaveAttribute('data-focus-group', 'input');
    expect(input.openSetup).not.toHaveBeenCalled();
    // The gear afterwards opens at the top again.
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lesson settings' }));
    expect(
      screen.getByRole('dialog', { name: 'Settings sheet' }),
    ).toHaveAttribute('data-focus-group', 'none');
  });

  it('"Set up guitar" opens the setup', () => {
    const input = makeInput({ handle: fakeHandle('needs-setup') });
    render(<GuitarLessonLayout {...props({ input })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set up guitar' }));
    expect(input.openSetup).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows no input indicator while the input is fine', () => {
    render(
      <GuitarLessonLayout
        {...props({ input: makeInput({ handle: fakeHandle('idle') }) })}
      />,
    );
    expect(document.querySelector('[data-guitar-input-indicator]')).toBeNull();
  });
});

describe('GuitarLessonLayout — arrow keys', () => {
  it('step through goToStep in the preview', () => {
    const p = props();
    render(<GuitarLessonLayout {...p} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(p.nav.goToStep).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(p.nav.goToStep).toHaveBeenLastCalledWith(1);
  });

  it.each([
    ['practising', { run: makeRun({ state: 'practice' }) }],
    [
      'between practice passes',
      { run: makeRun({ state: 'preview', restartingPass: true }) },
    ],
    ['taking the step', { run: makeRun({ state: 'performance' }) }],
    [
      'over a result',
      { run: makeRun({ state: 'complete' }), result: makeResult() },
    ],
    ['over the section-complete offer', { offer: makeOffer() }],
  ] as [string, Partial<GuitarLessonLayoutProps>][])(
    'do nothing while %s',
    (_name, state) => {
      const p = props(state);
      render(<GuitarLessonLayout {...p} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(p.nav.goToStep).not.toHaveBeenCalled();
    },
  );

  it('do nothing while a sheet is open, even with focus back on the page', () => {
    const p = props();
    render(<GuitarLessonLayout {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lesson settings' }));
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(p.nav.goToStep).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

    fireEvent.click(screen.getByRole('button', { name: 'About this step' }));
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(p.nav.goToStep).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close about' }));

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(p.nav.goToStep).toHaveBeenCalledTimes(1);
  });

  it('do nothing while the guitar setup dialog is open', () => {
    const p = props();
    const { rerender } = render(
      <GuitarLessonLayout
        {...p}
        slots={{ ...p.slots, setupModal: <div data-testid="setup" /> }}
      />,
    );
    // Even with focus back on the page (the dialog is the container's).
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(p.nav.goToStep).not.toHaveBeenCalled();
    rerender(
      <GuitarLessonLayout {...p} slots={{ ...p.slots, setupModal: null }} />,
    );
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(p.nav.goToStep).toHaveBeenCalledTimes(1);
  });

  it('stay with the tempo and the step list when they have focus', () => {
    const p = props({ tempo: makeTempo() });
    render(<GuitarLessonLayout {...p} />);
    const tempo = screen.getByRole('spinbutton', { name: 'Tempo' });
    fireEvent.keyDown(tempo, { key: 'ArrowRight' });
    expect(p.nav.goToStep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Step 3 of 4/ }));
    const list = screen.getByRole('dialog', {
      name: 'All steps in this section',
    });
    fireEvent.keyDown(within(list).getAllByRole('button')[0], {
      key: 'ArrowRight',
    });
    expect(p.nav.goToStep).not.toHaveBeenCalled();
  });
});

describe('guitarLayout.css', () => {
  /** The stylesheet on one line (jsdom loads no CSS, so its text is checked). */
  const layoutCss = async () => {
    const { readFileSync } = await import('node:fs');
    // From the repo root, as the test runner starts (restyleGuard does too).
    return readFileSync(
      'src/curriculum/guitar/layout/guitarLayout.css',
      'utf8',
    ).replace(/\s+/g, ' ');
  };

  it('pins the TAB to a 208px band and gives the visuals the rest', async () => {
    const css = await layoutCss();
    // 208px: the container never sizes the TAB under 200px.
    expect(css).toContain(
      '[data-guitar-layout] [data-guitar-stage] { flex: none; height: 208px; }',
    );
    // The visuals grow and shrink with the window, their row a definite
    // height for h-full inside, their column the slot's width (an auto
    // column grew to the chord strip's row on a phone).
    expect(css).toContain(
      '[data-guitar-layout] [data-guitar-visuals-slot] { flex: 1 1 0%; min-height: 240px; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 1fr); }',
    );
    // No rule anywhere hands the TAB another height (the short-window and
    // phone rules only move the visuals).
    expect(css.match(/\[data-guitar-stage\] \{[^}]*\}/g)).toHaveLength(1);
  });

  it('rings keyboard focus in white, never the browser’s blue, beneath each control’s own ring', async () => {
    const css = await layoutCss();
    // Zero specificity for the scope, so a control's own focus ring wins.
    expect(css).toContain(
      ':where([data-guitar-layout], [data-guitar-sheet], [data-guitar-overlay]) :focus-visible { outline: 2px solid rgba(255, 255, 255, 0.6);',
    );
  });
});
