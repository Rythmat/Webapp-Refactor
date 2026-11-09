// @vitest-environment jsdom
/**
 * The Studio's prompt bar (owner, 2026-10-23): its chip names the spot and
 * the section, following a section the student names as they type; the
 * suggestions rotate in, steps in the session's style for the spot and what
 * the song lacks; Tab takes one, the dice another, Enter sends,
 * Escape folds the bar away to the side rail's ∆; while it writes a card
 * says so, and none follows the part it adds.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import { PromptBar } from '../PromptBar';
import { PromptRailButton } from '../PromptRailButton';
import { usePromptBarStore } from '../promptBarStore';

const h = vi.hoisted(() => ({
  sendPrompt: vi.fn(async () => {}),
  dismissPrompt: vi.fn(),
  answerPrompt: vi.fn(),
  retryPrompt: vi.fn(async () => {}),
}));
vi.mock('../runPrompt', () => h);
vi.mock('@/daw/engine/playheadClock', () => ({ getPlayheadTick: () => 0 }));

const BAR = 1920;
const s = () => useStore.getState();
const input = () => screen.getByTestId('prompt-input') as HTMLTextAreaElement;
const chip = () => screen.queryByTestId('prompt-target')?.textContent ?? null;
const styleTag = () => screen.getByTestId('prompt-style').textContent;

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  usePromptBarStore.setState({
    collapsed: false,
    laneSpot: null,
    selection: null,
    phase: { kind: 'idle' },
    lastText: null,
    sessionPrompt: null,
    style: null,
    focusNonce: 0,
  });
  Object.values(h).forEach((fn) => fn.mockClear());
});
afterEach(cleanup);

describe('the prompt bar', () => {
  it('names the spot, its section and track, and follows a section typed', () => {
    const bass = s().addTrack('midi', 'soundfont', 'Bass', {
      trackRole: 'bass',
    });
    s().addMidiClip(bass, {
      id: 'c',
      startTick: 0,
      durationTicks: BAR,
      events: [],
    });
    s().setSelectedTrackId(bass);
    s().setSections([
      {
        id: 'v',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 4 * BAR,
      },
      {
        id: 'b',
        type: 'bridge',
        label: 'Bridge',
        startTick: 4 * BAR,
        endTick: 8 * BAR,
      },
    ]);
    render(<PromptBar />);
    // Bars from the playhead: no spot chip, the style tag alone.
    expect(chip()).toBeNull();
    expect(styleTag()).toBe('Pop');
    expect(input().dataset.suggestion).toBe(
      'Write a Pop bassline for the verse',
    );
    fireEvent.change(input(), {
      target: { value: 'a bass line for the bridge' },
    });
    expect(chip()).toBe('Bridge · Bars 5–8 · Bass');
    fireEvent.change(input(), {
      target: { value: 'a bass line for a new chorus' },
    });
    expect(chip()).toBe('New Chorus · Bars 9–16 · Bass');
    fireEvent.change(input(), { target: { value: 'write an outro' } });
    // A section the song hasn't got, over one it has: the spot stays the verse.
    expect(chip()).toBeNull();
  });

  it('shows the song’s style, or the one picked, on the style tag', () => {
    s().setProjectName('Melancholic Lo-fi in D Dorian');
    render(<PromptBar />);
    expect(styleTag()).toBe('Lo-fi');
    act(() => usePromptBarStore.getState().setStyle('reggaeton'));
    expect(styleTag()).toBe('Reggaeton');
    act(() => usePromptBarStore.getState().setStyle(null));
    expect(styleTag()).toBe('Lo-fi');
  });

  it('sets the style tag from the prompt a session was generated from', () => {
    act(() =>
      usePromptBarStore
        .getState()
        .setSessionPrompt('Make a soulful R&B ballad'),
    );
    render(<PromptBar />);
    expect(styleTag()).toBe('R&B Ballad');
  });

  it('starts an empty song with the whole band', () => {
    render(<PromptBar />);
    expect(chip()).toBeNull();
    expect(input().dataset.suggestion).toBe(
      'Start the song with Pop drums, bass and chords',
    );
  });

  it('suggests in the style the session started from, and what the song lacks', () => {
    const bass = s().addTrack('midi', 'soundfont', 'Bass', {
      trackRole: 'bass',
    });
    s().addMidiClip(bass, {
      id: 'c',
      startTick: 0,
      durationTicks: BAR,
      events: [
        {
          note: 40,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
    s().setSections([
      {
        id: 'v',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 4 * BAR,
      },
    ]);
    usePromptBarStore.getState().setSessionPrompt('Make a soulful R&B ballad');
    render(<PromptBar />);
    // The spot's step first, in the session's style; the rest rotate in.
    expect(input().dataset.suggestion).toBe(
      'Write an R&B bassline for the verse',
    );
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe('Write an R&B bassline for the verse');
  });

  it('takes the suggestion on Tab and sends on Enter; an empty box sends nothing', () => {
    render(<PromptBar />);
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(h.sendPrompt).not.toHaveBeenCalled();
    expect(
      (screen.getByTestId('prompt-send') as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(input().value).toBe(
      'Start the song with Pop drums, bass and chords',
    );
    fireEvent.change(input(), { target: { value: 'add a funk beat' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(h.sendPrompt).toHaveBeenLastCalledWith('add a funk beat');
    expect(input().value).toBe('');
  });

  it('folds away on Escape, leaving nothing over the lanes; the rail’s ∆ opens and folds it', () => {
    render(
      <>
        <PromptRailButton />
        <PromptBar />
      </>,
    );
    const rail = screen.getByTestId('rail-prompt');
    expect(rail.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByTestId('prompt-bar')).toBeNull();
    expect(screen.getByTestId('prompt-bar-layer').childElementCount).toBe(0);
    expect(rail.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(rail);
    expect(screen.getByTestId('prompt-bar')).toBeTruthy();
    fireEvent.click(rail);
    expect(screen.queryByTestId('prompt-bar')).toBeNull();
  });

  it('shows what it’s doing, and no card once the part is added', () => {
    render(<PromptBar />);
    act(() =>
      usePromptBarStore
        .getState()
        .setPhase({ kind: 'working', status: 'Writing for bars 1–4…' }),
    );
    expect(screen.getByTestId('prompt-working').textContent).toContain(
      'Writing for bars 1–4…',
    );
    expect(
      (screen.getByTestId('prompt-send') as HTMLButtonElement).disabled,
    ).toBe(true);
    act(() => usePromptBarStore.getState().setPhase({ kind: 'idle' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Keep' })).toBeNull();
  });

  it('asks before writing over a track the song has for the part', () => {
    render(<PromptBar />);
    act(() =>
      usePromptBarStore.getState().setPhase({
        kind: 'confirm',
        message:
          'Bass already plays in bars 7–8. Update it with the new part, or keep it and add the new part on a track of its own?',
        tracks: 'Bass',
        count: 1,
      }),
    );
    expect(screen.getByTestId('prompt-confirm').textContent).toContain(
      'Bass already plays in bars 7–8',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Update Bass' }));
    expect(h.answerPrompt).toHaveBeenLastCalledWith('update');
    fireEvent.click(screen.getByRole('button', { name: 'Keep both' }));
    expect(h.answerPrompt).toHaveBeenLastCalledWith('keep');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(h.answerPrompt).toHaveBeenLastCalledWith('cancel');
  });

  it('names bars dragged out, and clears them from the chip', () => {
    const bass = s().addTrack('midi', 'soundfont', 'Bass', {
      trackRole: 'bass',
    });
    render(<PromptBar />);
    expect(screen.queryByTestId('prompt-clear-target')).toBeNull();
    act(() =>
      usePromptBarStore
        .getState()
        .select({ startTick: 2 * BAR, endTick: 5 * BAR, trackId: bass }),
    );
    expect(chip()).toBe('Bars 3–5 · Bass');
    fireEvent.click(screen.getByTestId('prompt-clear-target'));
    expect(usePromptBarStore.getState().selection).toBeNull();
    // Back to bars from the playhead: no spot chip.
    expect(chip()).toBeNull();
  });

  it('points at a lane right-clicked', () => {
    const drums = s().addTrack('midi', 'drum-machine', 'Drums', {
      trackRole: 'drums',
    });
    render(<PromptBar />);
    act(() =>
      usePromptBarStore
        .getState()
        .askAt({ tick: 9 * BAR + 100, trackId: drums }),
    );
    expect(chip()).toBe('Bars 10–13 · Drums');
  });
});
