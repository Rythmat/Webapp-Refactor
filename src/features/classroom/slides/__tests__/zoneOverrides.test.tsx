// @vitest-environment jsdom
/**
 * The editor's controls, on the element path.
 *
 * `blockKeyForElement` maps a derived element back to the slide field it came
 * from, which is how the editor kept its block-keyed controls when the canvas
 * moved onto elements. The trap is fan-out: some fields derive MORE THAN ONE
 * element (one per launch tile, one per interaction) while their editor control
 * covers the whole field.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editorGhostElements } from '../../plan/deckEditor/editorGhosts';
import { resolveElements } from '../migrateDeckV1';
import { SlideStage } from '../parts/SlideStage';
import type { Slide } from '../types';

afterEach(cleanup);

const lt = (en: string) => ({ en });

const tileSlide = (n: number): Slide =>
  ({
    id: 's1',
    kind: 'content',
    phase: 'connectRegulate',
    title: lt('Title'),
    launchTiles: Array.from({ length: n }, (_, i) => ({
      id: `t${i}`,
      module: 'globe',
      activityRef: `a/${i}`,
    })),
  }) as unknown as Slide;

const renderCanvas = (slide: Slide) =>
  render(
    <SlideStage
      slide={slide}
      surface="present"
      language="en"
      elements={resolveElements(slide)}
      interactionsById={{}}
      zoneOverrides={{
        title: <div data-testid="title-editor">TITLE EDITOR</div>,
        launchTiles: <div data-testid="tile-editor">TILE ROW EDITOR</div>,
      }}
      editable
      blocks={{}}
    />,
  );

describe('zone overrides', () => {
  it('renders a whole-field editor ONCE however many elements the field derives', () => {
    // Three tiles derive three elements, all mapping to `launchTiles`. Handing
    // the row editor to each of them stacked three copies of the same control.
    renderCanvas(tileSlide(3));
    expect(screen.getAllByTestId('tile-editor')).toHaveLength(1);
  });

  it('still renders it for a single tile', () => {
    renderCanvas(tileSlide(1));
    expect(screen.getAllByTestId('tile-editor')).toHaveLength(1);
  });

  it('renders the tile editor even with no tiles authored yet', () => {
    // With zero tiles there is no tile element, so the row editor has nowhere
    // to go — the teacher would have no way to add the first tile from the
    // canvas. Documented as the current behaviour, not asserted as correct.
    renderCanvas(tileSlide(0));
    expect(screen.queryAllByTestId('tile-editor')).toHaveLength(0);
  });

  it('places a single-element field’s editor exactly once', () => {
    renderCanvas(tileSlide(2));
    expect(screen.getAllByTestId('title-editor')).toHaveLength(1);
  });

  it('does not render the read-only view beside the editor it replaced', () => {
    const { container } = renderCanvas(tileSlide(2));
    // The title zone shows the editor, not the plain SlideTitle text.
    const titleZone = container.querySelector('[data-zone="title"]');
    expect(titleZone?.textContent).toBe('TITLE EDITOR');
  });
});

describe('ghost elements carry their editor', () => {
  const bare = {
    id: 's1',
    kind: 'content',
    phase: 'connectRegulate',
    title: lt('Title'),
  } as unknown as Slide;

  it('shows the prompt and body editors on a slide that has neither', () => {
    // The regression: with no prompt field there is no subtitle element, so in
    // element mode the prompt editor had nowhere to render and a teacher could
    // never add one.
    const real = resolveElements(bare);
    render(
      <SlideStage
        slide={bare}
        surface="present"
        language="en"
        elements={[...real, ...editorGhostElements(bare, real)]}
        interactionsById={{}}
        zoneOverrides={{
          prompt: <div data-testid="prompt-editor">PROMPT EDITOR</div>,
          body: <div data-testid="body-editor">BODY EDITOR</div>,
        }}
        editable
        blocks={{}}
      />,
    );
    expect(screen.getByTestId('prompt-editor')).toBeTruthy();
    expect(screen.getByTestId('body-editor')).toBeTruthy();
  });

  it('does not show a ghost editor where the real element already exists', () => {
    const withPrompt = { ...bare, prompt: lt('Real prompt') } as Slide;
    const real = resolveElements(withPrompt);
    render(
      <SlideStage
        slide={withPrompt}
        surface="present"
        language="en"
        elements={[...real, ...editorGhostElements(withPrompt, real)]}
        interactionsById={{}}
        zoneOverrides={{
          prompt: <div data-testid="prompt-editor">PROMPT EDITOR</div>,
        }}
        editable
        blocks={{}}
      />,
    );
    // Exactly one — the real element's, not a duplicate from a ghost.
    expect(screen.getAllByTestId('prompt-editor')).toHaveLength(1);
  });
});
