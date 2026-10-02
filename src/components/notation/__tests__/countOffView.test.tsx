// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CountOff } from '../CountOff';

// The count-off as drawn: piano's staff and Studio keep today's look; guitar
// TAB asks for the quiet count, set in the empty count-in bar.

afterEach(cleanup);

const drawn = (ui: React.ReactElement) => render(ui).container;

describe('CountOff', () => {
  it('draws exactly what it always has without the new props', () => {
    expect(drawn(<CountOff beatIndex={0} beatsPerBar={4} />).innerHTML).toBe(
      '<div class="notation-countoff" aria-hidden="true"><span class="notation-countoff-number is-downbeat">1</span></div>',
    );
    cleanup();
    expect(drawn(<CountOff beatIndex={6} beatsPerBar={4} />).innerHTML).toBe(
      '<div class="notation-countoff" aria-hidden="true"><span class="notation-countoff-number">3</span></div>',
    );
    cleanup();
    expect(drawn(<CountOff beatIndex={null} beatsPerBar={4} />).innerHTML).toBe(
      '',
    );
  });

  it('centres the neutral count in the count-in bar it is given', () => {
    const host = drawn(
      <CountOff
        beatIndex={1}
        beatsPerBar={4}
        placement="countInBar"
        bar={{ x: 20, y: 28, width: 300, height: 128 }}
        tone="neutral"
      />,
    );
    const box = host.querySelector<HTMLElement>('.notation-countoff')!;
    expect(box.className).toBe('notation-countoff is-in-bar');
    expect(box.style.left).toBe('20px');
    expect(box.style.top).toBe('28px');
    expect(box.style.width).toBe('300px');
    expect(box.style.height).toBe('128px');
    expect(box.style.right).toBe('auto');
    expect(box.style.bottom).toBe('auto');
    const number = box.querySelector('.notation-countoff-number')!;
    // Beat 2 of the bar: neutral, not the downbeat.
    expect(number.className).toBe('notation-countoff-number is-neutral');
    expect(number.textContent).toBe('2');
    // Glacial's digits are proportional: the digit sits in a fixed cell.
    expect(
      number.querySelector<HTMLElement>('[style*="width"]')?.style.width,
    ).toBe('0.62em');
  });

  it('marks beat 1 of each bar, so the stylesheet can light it', () => {
    const host = drawn(
      <CountOff beatIndex={4} beatsPerBar={4} tone="neutral" />,
    );
    const number = host.querySelector('.notation-countoff-number')!;
    expect(number.className).toBe(
      'notation-countoff-number is-neutral is-downbeat',
    );
    // The second bar of a two-bar count opens with its own number.
    expect(number.textContent).toBe('2');
  });

  it('centres in the whole parent while there is no bar to sit in', () => {
    const host = drawn(
      <CountOff beatIndex={0} beatsPerBar={4} placement="countInBar" />,
    );
    const box = host.querySelector<HTMLElement>('.notation-countoff')!;
    expect(box.className).toBe('notation-countoff is-in-bar');
    expect(box.getAttribute('style')).toBeNull();
  });
});
