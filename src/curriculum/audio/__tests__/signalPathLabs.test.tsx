// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONNECTORS, gainToLine, renderCable } from '../lab/physics/signal';
import { hzToPosition, positionToHz } from '../lab/physics/wave';
import { WATT_ROUNDS } from '../labs/AmpsLab';
import { CONNECTOR_ROUNDS } from '../labs/CablesLab';
import { DIGITAL_ROUNDS } from '../labs/DigitalLab';
import { DRIVER_ROUNDS } from '../labs/LoudspeakersLab';
import { GAIN_ROUNDS } from '../labs/PreampsLab';
import { openUnit } from './openLabTopic';

const stepDone = vi.fn();
const set = vi.fn();
const glide = vi.fn();
const setLoop = vi.fn();
const sounding = new Set<string>();
vi.mock('../lab/useLabTone', () => ({
  useLabTone: () => ({
    set,
    glide,
    setLoop,
    playNote: vi.fn(),
    stopAll: vi.fn(),
    setPair: vi.fn(),
    glidePair: vi.fn(),
    spectrum: () => null,
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    blip: vi.fn(),
    stop: vi.fn(),
    sounding,
    needsTap: false,
    peak: () => 0,
  }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('../lab/audioProgress', async (original) => ({
  ...(await original<typeof import('../lab/audioProgress')>()),
  useAudioProgress: () => ({ stepDone, percent: 0 }),
}));

// jsdom has no canvas: the pictures are checked in the browser.
HTMLCanvasElement.prototype.getContext = () => null;

const open = (topic: string, step = '') =>
  openUnit(`?topic=${topic}${step}`, 'signal-path');
const name = (text: string | RegExp) =>
  screen.getByRole('button', { name: text });
const slide = (label: string | RegExp, value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: label }), {
    target: { value: String(value) },
  });
const peakOf = (samples: Float32Array) =>
  samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

afterEach(() => {
  cleanup();
  sounding.clear();
  vi.clearAllMocks();
});

describe('Preamps & Levels', () => {
  it('is nearly silent with no gain on a mic, as it really would be', async () => {
    await open('preamps');
    fireEvent.click(name('Play'));
    const make = setLoop.mock.lastCall?.[1] as (r: number) => Float32Array;
    expect(peakOf(make(48000))).toBeLessThan(0.002);
  });

  it('never passes the ceiling, however much gain', async () => {
    await open('preamps');
    sounding.add('mine');
    // Once to see that it's sounding, once to change what it's playing.
    slide(/^Gain/, 10);
    slide(/^Gain/, 70);
    const make = setLoop.mock.lastCall?.[1] as (r: number) => Float32Array;
    expect(peakOf(make(48000))).toBeLessThanOrEqual(1);
  });

  it('warns to start low, since it plays a tone at real level', async () => {
    await open('preamps');
    expect(screen.getByText(/volume low/)).toBeTruthy();
  });

  it('credits clipping, and says it can’t be undone', async () => {
    await open('preamps', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /ceiling/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
    expect(screen.getByText(/can’t be undone/)).toBeTruthy();
  });

  it('accepts each source at line level, saying which way otherwise', async () => {
    await open('preamps', '&step=try');
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/more gain/);
    slide(/^Gain/, 70);
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/less gain/);
    for (const { volts } of GAIN_ROUNDS) {
      slide(/^Gain/, Math.round(gainToLine(volts) * 2) / 2);
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('preamps', 'try');
  });
});

describe('ADC, DAC & Sample Rate', () => {
  it('rounds what it plays to the bits chosen', async () => {
    await open('digital');
    fireEvent.click(name('2 bits'));
    fireEvent.click(name('Play'));
    const make = setLoop.mock.lastCall?.[1] as (r: number) => Float32Array;
    expect(new Set(make(48000)).size).toBeLessThanOrEqual(5);
    // Harsh, so kept quiet.
    expect(setLoop.mock.lastCall?.[3]).toBeLessThanOrEqual(0.5);
  });

  it('plays a 5 kHz tone sampled at 8 kHz back as 3 kHz', async () => {
    await open('digital', '&step=reveal');
    fireEvent.click(name('What comes out'));
    expect(set.mock.lastCall?.slice(0, 2)).toEqual(['out', 3000]);
    fireEvent.click(name('12 kHz'));
    expect(glide.mock.lastCall?.slice(0, 2)).toEqual(['out', 5000]);
  });

  it('separates the three steps, and says copies are exact', async () => {
    await open('digital', '&step=reveal');
    expect(screen.getByText(/exactly the same/)).toBeTruthy();
  });

  it('asks the rule three ways and then by ear', async () => {
    await open('digital', '&step=try');
    const answer = (text: string) =>
      fireEvent.click(
        [
          ...screen
            .getByRole('group', { name: 'Your answer' })
            .querySelectorAll('button'),
        ].find((b) => b.textContent === text)!,
      );
    answer(
      DIGITAL_ROUNDS[0].choices.find((c) => c !== DIGITAL_ROUNDS[0].answer)!,
    );
    expect(screen.getByRole('status').textContent).toMatch(/half of itself/);
    for (const round of DIGITAL_ROUNDS) answer(round.answer);
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('digital', 'try');
  });
});

describe('Amps & Speaker Level', () => {
  it('plays power as its true level: a quarter of the watts, half the height', async () => {
    await open('amps', '&step=reveal');
    fireEvent.click(screen.getAllByRole('button', { name: 'Play' })[0]);
    const fifty = set.mock.lastCall?.[2] as number;
    fireEvent.click(name('200 W'));
    const twoHundred = glide.mock.lastCall?.[2] as number;
    expect(twoHundred / fifty).toBeCloseTo(2);
  });

  it('credits a little louder, not twice', async () => {
    await open('amps', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /A little louder/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('warns about what’s inside an amp', async () => {
    await open('amps');
    expect(screen.getByText(/qualified technician/)).toBeTruthy();
  });

  it('rounds a tube off, where solid state flattens', async () => {
    await open('amps', '&step=reveal');
    sounding.add('amp');
    // Once to see that it's sounding, then to each kind of amp.
    fireEvent.click(name('Solid state'));
    fireEvent.click(name('Tube'));
    const tube = (setLoop.mock.lastCall?.[1] as (r: number) => Float32Array)(
      48000,
    );
    fireEvent.click(name('Solid state'));
    const solid = (setLoop.mock.lastCall?.[1] as (r: number) => Float32Array)(
      48000,
    );
    expect(peakOf(solid)).toBeCloseTo(1);
    expect(peakOf(tube)).toBeLessThan(peakOf(solid));
  });

  it('accepts the watts for each level', async () => {
    await open('amps', '&step=try');
    fireEvent.click(name('Check'));
    expect(screen.getByRole('status').textContent).toMatch(/Not enough/);
    for (const { from, db } of WATT_ROUNDS) {
      const position = hzToPosition(from * 10 ** (db / 10), 1, 200);
      expect(positionToHz(position, 1, 200)).toBeCloseTo(
        from * 10 ** (db / 10),
      );
      slide(/^Power/, Math.round(position * 1000) / 1000);
      fireEvent.click(name('Check'));
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('amps', 'try');
  });
});

describe('Loudspeakers', () => {
  it('credits the split between drivers', async () => {
    await open('loudspeakers', '&step=predict');
    fireEvent.click(screen.getByRole('radio', { name: /big cone/ }));
    fireEvent.click(name(/Hear what/));
    expect(screen.getByText(/You called it/)).toBeTruthy();
  });

  it('names each driver by ear, keeping a wrong guess open', async () => {
    await open('loudspeakers', '&step=try');
    const group = () => screen.getByRole('group', { name: 'It’s…' });
    const pick = (text: string) =>
      fireEvent.click(
        [...group().querySelectorAll('button')].find(
          (b) => b.textContent === text,
        )!,
      );
    const text = {
      both: 'Both',
      woofer: 'Woofer only',
      tweeter: 'Tweeter only',
    } as const;
    pick(DRIVER_ROUNDS[0] === 'both' ? 'Woofer only' : 'Both');
    expect(screen.getByRole('status').textContent).toMatch(/Not that one/);
    for (const id of DRIVER_ROUNDS) pick(text[id]);
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('loudspeakers', 'try');
  });
});

describe('Connectors & Cables', () => {
  it('holds back the balanced cable until the reveal', async () => {
    await open('cables');
    expect(screen.queryByRole('button', { name: 'Balanced' })).toBeNull();
    await cleanup();
    await open('cables', '&step=reveal');
    expect(name('Balanced')).toBeTruthy();
  });

  it('plays the kind of cable chosen, at its real hum', async () => {
    await open('cables', '&step=reveal');
    fireEvent.click(name('Play'));
    const make = setLoop.mock.lastCall?.[1] as (r: number) => Float32Array;
    expect(make(48000)).toEqual(renderCable(440, 48000, 80, 'balanced'));
  });

  it('warns against an instrument cable on a speaker', async () => {
    await open('cables', '&step=reveal');
    expect(screen.getByText(/can overheat/)).toBeTruthy();
  });

  it('has every connector in the table', async () => {
    await open('cables', '&step=reveal');
    const table = document.querySelector('[data-lab-connectors]');
    for (const { name: label } of CONNECTORS) {
      expect(table?.textContent).toContain(label);
    }
  });

  it('matches each job, and ends the unit at Audio', async () => {
    await open('cables', '&step=try');
    const pick = (text: string) =>
      fireEvent.click(
        [
          ...screen
            .getByRole('group', { name: 'Which connector' })
            .querySelectorAll('button'),
        ].find((b) => b.textContent === text)!,
      );
    pick('RCA');
    expect(screen.getByRole('status').textContent).toMatch(/Not usually RCA/);
    for (const { answer } of CONNECTOR_ROUNDS) {
      pick(CONNECTORS.find((c) => c.id === answer)!.name);
    }
    expect(document.querySelector('[data-lab-done]')).toBeTruthy();
    expect(name('Back to Audio')).toBeTruthy();
    expect(stepDone).toHaveBeenCalledWith('cables', 'try');
  });
});
