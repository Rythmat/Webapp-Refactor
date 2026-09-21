// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClefToggle } from '../ClefToggle';

// VexFlow is loaded only for the Bravura font; the real import is heavy and
// irrelevant to what this checks.
vi.mock('../StaffView', () => ({ loadVexFlow: () => Promise.resolve({}) }));

// jsdom has no canvas. Returning null is what a browser without one would do,
// and it keeps jsdom's "not implemented" notice out of the suite output.
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext'];
});

function render(ui: React.ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  return host;
}

describe('ClefToggle', () => {
  it('renders both clefs without a layout engine to measure with', () => {
    // jsdom has no getBBox; the glyph must fall back rather than throw.
    const host = render(<ClefToggle clef="treble" onChange={() => {}} />);
    const buttons = host.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(host.querySelectorAll('svg')).toHaveLength(2);
  });

  it('labels each clef for anyone who cannot see the glyph', () => {
    const host = render(<ClefToggle clef="treble" onChange={() => {}} />);
    const labels = [...host.querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Treble clef', 'Bass clef']);
  });

  it('marks the chosen clef and only that one', () => {
    const host = render(<ClefToggle clef="bass" onChange={() => {}} />);
    const checked = [...host.querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-checked'),
    );
    expect(checked).toEqual(['false', 'true']);
  });

  it('reports the clef that was clicked', () => {
    const onChange = vi.fn();
    const host = render(<ClefToggle clef="treble" onChange={onChange} />);
    act(() => {
      host
        .querySelectorAll('button')[1]
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('bass');
  });

  it('draws both glyphs at the same ink height once measured', () => {
    // Stand in for a layout engine, with Bravura's real proportions: the G
    // clef is tall and thin, the F clef short and wide. Measured at 100px.
    const ink: Record<string, Partial<TextMetrics>> = {
      '\uE050': {
        actualBoundingBoxAscent: 110,
        actualBoundingBoxDescent: 65,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 65,
      },
      '\uE062': {
        actualBoundingBoxAscent: 78,
        actualBoundingBoxDescent: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 86,
      },
    };
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: '',
      measureText: (text: string) => ink[text] ?? {},
    })) as unknown as HTMLCanvasElement['getContext'];

    const host = render(<ClefToggle clef="treble" onChange={() => {}} />);
    const svgs = [...host.querySelectorAll('svg')];

    // Same height for both — that is the whole point.
    expect(svgs.map((s) => s.getAttribute('height'))).toEqual(['18', '18']);
    // The viewBox is the ink itself, offset to the baseline origin, so the
    // glyph fills the box rather than floating inside the font's em square.
    expect(svgs[0].getAttribute('viewBox')).toBe('0 -110 65 175');
    expect(svgs[1].getAttribute('viewBox')).toBe('0 -78 86 78');
    // Widths follow each glyph's own aspect: the G clef narrow, the F wide.
    const widths = svgs.map((s) => Number(s.getAttribute('width')));
    expect(widths[0]).toBeLessThan(widths[1]);
  });
});

describe('ClefToggle on a two-hand part', () => {
  it('is inert and says why', () => {
    // A hand-split part is written on a grand staff, so there is no clef to
    // choose — the control stays visible but cannot be pressed.
    const onChange = vi.fn();
    const host = render(
      <ClefToggle clef="treble" onChange={onChange} disabled />,
    );
    const buttons = [...host.querySelectorAll('button')];
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      expect(button.title).toMatch(/grand staff/i);
    }
    act(() => {
      buttons[1].click();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(
      host.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('still works when the part is one hand', () => {
    const onChange = vi.fn();
    const host = render(<ClefToggle clef="treble" onChange={onChange} />);
    const buttons = [...host.querySelectorAll('button')];
    expect(buttons.every((b) => !b.disabled)).toBe(true);
    act(() => {
      buttons[1].click();
    });
    expect(onChange).toHaveBeenCalledWith('bass');
    expect(
      host.querySelector('[role="radiogroup"]')?.getAttribute('aria-disabled'),
    ).toBeNull();
  });
});
