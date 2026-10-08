// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { PianoRoll } from '../PianoRoll';

// ── The roll's selection belongs to one clip ──────────────────────────────
// The selection is indices into the clip's notes. The channel strip's roll
// stays mounted as the student picks another clip, and through a load (a
// kept-work Restore can leave it open on the piano-roll tab), so a selection
// that outlived its clip picked the notes at the same indices in the next
// one, and Delete removed them. It is let go when the clip or the session
// changes.

const ROW_H = 12;
const VIEW_MAX = 96;

const note = (startTick: number, midi = 60): MidiNoteEvent => ({
  note: midi,
  velocity: 100,
  startTick,
  durationTicks: 480,
  channel: 0,
});

// jsdom draws nothing: the roll's canvases skip drawing without a context.
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
});
afterEach(cleanup);

function renderRoll(clipId: string | null, events: MidiNoteEvent[]) {
  const onChange = vi.fn<(events: MidiNoteEvent[]) => void>();
  const props = {
    clipStartTick: 0,
    timelineStartTick: 0,
    clipColor: '#888',
    onChange,
  };
  const view = render(<PianoRoll {...props} clipId={clipId} events={events} />);
  return {
    onChange,
    /** The roll shows another clip, or the same one after a load. */
    show: (nextClip: string | null, nextEvents: MidiNoteEvent[]) =>
      view.rerender(
        <PianoRoll {...props} clipId={nextClip} events={nextEvents} />,
      ),
    /** Click a key in the key column: every note on that row is selected. */
    selectRow: (midi: number) =>
      fireEvent.mouseDown(
        view.container.querySelector('canvas[title^="Click to select"]')!,
        { button: 0, clientY: (VIEW_MAX - midi) * ROW_H + 1 },
      ),
    pressDelete: () =>
      fireEvent.keyDown(view.container.querySelector('[tabindex="0"]')!, {
        code: 'Delete',
      }),
  };
}

describe('PianoRoll selection', () => {
  it('deletes the selected notes of the clip it was made in', () => {
    const roll = renderRoll('verse', [note(0), note(480, 64), note(960)]);
    roll.selectRow(60);
    roll.pressDelete();

    expect(roll.onChange).toHaveBeenCalledWith([note(480, 64)]);
  });

  it('lets go of the selection when the roll shows another clip', () => {
    const roll = renderRoll('verse', [note(0), note(960)]);
    roll.selectRow(60);

    roll.show('chorus', [note(0, 67), note(480, 67), note(960, 67)]);
    roll.pressDelete();

    expect(roll.onChange).not.toHaveBeenCalled();
  });

  it('lets go of it when a load keeps the roll on the same clip id', () => {
    const roll = renderRoll('clip-1', [note(0), note(960)]);
    roll.selectRow(60);

    act(() => {
      bumpSessionGeneration('test');
    });
    roll.show('clip-1', [note(0, 72), note(960, 72)]);
    roll.pressDelete();

    expect(roll.onChange).not.toHaveBeenCalled();
  });

  it('keeps it while the clip’s notes change under it', () => {
    const roll = renderRoll('verse', [note(0), note(960)]);
    roll.selectRow(60);

    // An edit of the same clip (a velocity change, say) keeps the selection.
    roll.show('verse', [
      { ...note(0), velocity: 80 },
      { ...note(960), velocity: 80 },
    ]);
    roll.pressDelete();

    expect(roll.onChange).toHaveBeenCalledWith([]);
  });
});
