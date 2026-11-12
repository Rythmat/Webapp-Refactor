// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Mix } from '../../mix/useMixEngine';
import MicToSpeakerLesson from '../mic-to-speaker';
import { PathStage } from '../mic-to-speaker/Stage';
import {
  ampPeak,
  deskPeak,
  deskVolts,
  PATH_SCRIPT,
  screenForTopic,
  type PathScene,
} from '../mic-to-speaker/script';
import { allScreens, sceneAt, type Screen } from '../types';

vi.mock('../../player/LessonPlayer', () => ({
  LessonPlayer: () => <p>player</p>,
}));

const mix = {
  ready: true,
  playing: false,
  failed: false,
  needsTap: false,
  buffers: null,
  play: vi.fn(),
  stop: vi.fn(),
  apply: vi.fn(),
  peak: () => 0,
  spectrum: () => null,
  position: () => null,
} as unknown as Mix;

const screenNamed = (id: string) =>
  allScreens(PATH_SCRIPT).find((s) => s.id === id) as Screen<PathScene>;

function stage(id: string, extra: { locked?: boolean } = {}) {
  const index = allScreens(PATH_SCRIPT).findIndex((s) => s.id === id);
  const setScene = vi.fn();
  const onIdentify = vi.fn();
  render(
    <PathStage
      scene={sceneAt(PATH_SCRIPT, index)}
      setScene={setScene}
      screen={screenNamed(id)}
      accent="#6ee7b7"
      mix={mix}
      locked={extra.locked ?? false}
      onIdentify={onIdentify}
    />,
  );
  return { setScene, onIdentify };
}

// jsdom has no pointer events: a mouse event carries the same position.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    Object.assign(window, { PointerEvent: MouseEvent });
  }
});

afterEach(cleanup);

describe('From Mic to Speaker', () => {
  it('draws every screen', () => {
    for (const s of allScreens(PATH_SCRIPT)) {
      stage(s.id);
      cleanup();
    }
  });

  it('turns the gain knob from the keyboard', () => {
    const { setScene } = stage('set-gain');
    const knob = screen.getByRole('slider', { name: 'Gain' });
    fireEvent.keyDown(knob, { key: 'ArrowUp' });
    expect(setScene).toHaveBeenLastCalledWith({ gain: 1 });
    fireEvent.keyDown(knob, { key: 'End' });
    expect(setScene).toHaveBeenLastCalledWith({ gain: 70 });
  });

  it('turns the gain knob with a drag upwards', () => {
    const { setScene } = stage('set-gain');
    const knob = screen.getByRole('slider', { name: 'Gain' });
    fireEvent.pointerDown(knob, { clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(knob, { pointerId: 1 });
    expect(setScene).toHaveBeenLastCalledWith({ gain: 35 });
  });

  it('turns the amp from the keyboard', () => {
    const { setScene } = stage('set-amp');
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Amp level' }), {
      key: 'ArrowUp',
    });
    expect(setScene).toHaveBeenLastCalledWith({ amp: -29.5 });
  });

  it('holds the amp still while a question is blind', () => {
    stage('amp-clip');
    expect(screen.queryByRole('slider', { name: 'Amp level' })).toBeNull();
  });

  it('reports the box that was tapped', () => {
    const { onIdentify } = stage('find-amp');
    fireEvent.click(screen.getByRole('button', { name: 'Power amp' }));
    expect(onIdentify).toHaveBeenCalledWith('amp');
  });

  it('reports the cable that was tapped, both line cables as one', () => {
    const { onIdentify } = stage('find-cable');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cable from the power amp to the speaker',
      }),
    );
    expect(onIdentify).toHaveBeenLastCalledWith('speakerCable');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cable from the desk to the interface',
      }),
    );
    expect(onIdentify).toHaveBeenLastCalledWith('line');
  });

  it('reports the desk control that was tapped', () => {
    const { onIdentify } = stage('practice-fix-clip');
    fireEvent.click(screen.getByRole('button', { name: 'Fader' }));
    expect(onIdentify).toHaveBeenLastCalledWith('fader');
    fireEvent.click(screen.getByRole('button', { name: 'Gain knob' }));
    expect(onIdentify).toHaveBeenLastCalledWith('gain');
  });

  it('stops answering taps once answered', () => {
    stage('find-amp', { locked: true });
    expect(screen.queryByRole('button', { name: 'Power amp' })).toBeNull();
  });

  it('keeps its numbers to what the copy says', () => {
    const at = PATH_SCRIPT.initial;
    // About 2 mV from the mic, line level after 56 dB of gain.
    expect(deskVolts(deskPeak({ stem: 'snare', gain: 0 }))).toBeCloseTo(
      0.002,
      3,
    );
    expect(deskVolts(deskPeak({ stem: 'snare', gain: 56 }))).toBeCloseTo(
      1.23,
      1,
    );
    // The hook plays cleanly, inside the amp's band.
    expect(ampPeak(at)).toBeLessThan(-1);
    expect(ampPeak(at)).toBeGreaterThan(-6);
  });

  it.each(['preamps', 'digital', 'amps', 'loudspeakers', 'cables'])(
    'sends the old %s topic to a screen that exists',
    (topic) => {
      const id = screenForTopic(topic);
      expect(allScreens(PATH_SCRIPT).some((s) => s.id === id)).toBe(true);
    },
  );

  it('opens an old lab link on the screen that took its place', () => {
    const Where = () => <output>{useLocation().search}</output>;
    render(
      <MemoryRouter initialEntries={['/x?topic=preamps']}>
        <Routes>
          <Route
            path="/x"
            element={
              <>
                <MicToSpeakerLesson />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('status').textContent).toBe('?screen=set-gain');
  });
});
