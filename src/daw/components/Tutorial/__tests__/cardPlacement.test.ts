// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { CARD_MARGIN, openOverlayRects, placeCard } from '../cardPlacement';

/**
 * The coach card keeps clear of the step's target and of whatever is open
 * over the Studio (the Add Track sheet, a menu, a popover).
 */

const view = { w: 1440, h: 900 };
const card = { w: 380, h: 200 };
const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});
const hits = (
  spot: { top: number; left: number },
  r: { top: number; left: number; width: number; height: number },
) =>
  spot.left < r.left + r.width &&
  spot.left + card.w > r.left &&
  spot.top < r.top + r.height &&
  spot.top + card.h > r.top;

describe('where the coach card goes', () => {
  it('keeps its usual spot when nothing is open over it', () => {
    const preferred = { top: 400, left: 100 };
    expect(
      placeCard(preferred, card, view, box(100, 300, 200, 40), []),
    ).toEqual(preferred);
  });

  it('moves off an open sheet, and stays off the target', () => {
    // The Add Track button at the bottom left, its sheet across the bottom:
    // the card's usual spot (above the button) lands on the sheet.
    const target = box(10, 850, 330, 40);
    const sheet = box(380, 600, 1050, 280);
    const preferred = { top: 634, left: 16 };
    expect(hits(preferred, sheet)).toBe(true);
    const spot = placeCard(preferred, card, view, target, [sheet]);
    expect(hits(spot, sheet)).toBe(false);
    expect(hits(spot, target)).toBe(false);
    expect(spot.left).toBeGreaterThanOrEqual(CARD_MARGIN);
    expect(spot.top + card.h).toBeLessThanOrEqual(view.h - CARD_MARGIN);
  });

  it('covers the least it can when every spot covers something', () => {
    const target = box(600, 380, 240, 140);
    const everywhere = box(0, 0, 1440, 900);
    const spot = placeCard({ top: 540, left: 530 }, card, view, target, [
      everywhere,
    ]);
    expect(hits(spot, target)).toBe(false);
  });
});

describe('what counts as open over the Studio', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mount = (html: string, rect: DOMRect) => {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const el = holder.firstElementChild as HTMLElement;
    el.getBoundingClientRect = () => rect;
    document.body.appendChild(el);
    return el;
  };

  it('finds dialogs, menus and popovers, and opt-ins', () => {
    mount('<div role="dialog"></div>', new DOMRect(380, 600, 1050, 280));
    mount('<div role="menu"></div>', new DOMRect(10, 10, 200, 300));
    mount(
      '<div data-radix-popper-content-wrapper></div>',
      new DOMRect(500, 100, 300, 300),
    );
    mount('<div data-tutorial-avoid></div>', new DOMRect(900, 50, 100, 100));
    expect(openOverlayRects(document, view)).toHaveLength(4);
  });

  it('leaves out the lesson layer, empty boxes and full-window sheets', () => {
    mount(
      '<div data-tutorial-layer><div role="dialog"></div></div>',
      new DOMRect(0, 0, 0, 0),
    );
    (
      document.querySelector(
        '[data-tutorial-layer] [role="dialog"]',
      ) as HTMLElement
    ).getBoundingClientRect = () => new DOMRect(100, 100, 400, 300);
    mount('<div role="menu"></div>', new DOMRect(10, 10, 0, 0));
    mount('<div role="dialog"></div>', new DOMRect(0, 0, 1440, 900));
    expect(openOverlayRects(document, view)).toHaveLength(0);
  });
});
