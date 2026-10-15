// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHORD_INPUT_HINT } from '@/daw/harmony/chordInput';
import { ChordSymbol } from '../ChordSymbol';

// ── Typing a chord on the Lead Sheet (leadsheet-17) ────────────────────────
// The box used to store whatever was typed, as both labels, so 'hello' or
// 'Bbm7' became a chord the rest of the app couldn't read, and a cancelled
// new chord left a C behind. It now reads the text as a chord: one it
// knows is written as the lane writes chords; anything else stays in the
// box with a hint (Enter) or is dropped with a toast (leaving the box).

vi.mock('@/components/utils/toast', () => ({ showWarning: vi.fn() }));

afterEach(cleanup);

function renderChord(
  props: Partial<React.ComponentProps<typeof ChordSymbol>> = {},
) {
  const onRename = vi.fn();
  const onCancelEdit = vi.fn();
  render(
    <svg>
      <ChordSymbol
        noteName="D min7"
        degreeName="2 min7"
        degreeKey="2 minor7"
        format="hybrid"
        keyRootPc={0}
        keyMode="ionian"
        x={10}
        y={20}
        isSelected={false}
        regionId="r1"
        onSelect={vi.fn()}
        onRename={onRename}
        onCancelEdit={onCancelEdit}
        {...props}
      />
    </svg>,
  );
  return { onRename, onCancelEdit };
}

const box = () => screen.getByLabelText('Chord symbol') as HTMLInputElement;

describe('renaming a chord', () => {
  it('opens on the chord it renames', () => {
    renderChord({
      identity: {
        rootPc: 2,
        quality: 'minor7',
        bassPc: 2,
        source: 'detected',
        label: '2 min7',
      },
    });
    fireEvent.doubleClick(screen.getByText('D min7'));
    expect(box().value).toBe('D−7');
  });

  it('writes a chord it knows as the lane writes chords', () => {
    const { onRename } = renderChord();
    fireEvent.doubleClick(screen.getByText('D min7'));
    fireEvent.change(box(), { target: { value: 'F#m7b5' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({
        name: 'b5 min7b5',
        noteName: 'F# min7b5',
        degreeKey: 'b5 minor7b5',
        identity: expect.objectContaining({ rootPc: 6, source: 'given' }),
      }),
    );
    expect(screen.queryByLabelText('Chord symbol')).toBeNull();
  });

  it('keeps text that names no chord, and says so', () => {
    const { onRename } = renderChord();
    fireEvent.doubleClick(screen.getByText('D min7'));
    fireEvent.change(box(), { target: { value: 'hello' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onRename).not.toHaveBeenCalled();
    expect(box().value).toBe('hello');
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(CHORD_INPUT_HINT);

    // Typing again clears the hint.
    fireEvent.change(box(), { target: { value: 'hell' } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('drops text that names no chord when the box is left, with a toast', async () => {
    const { showWarning } = await import('@/components/utils/toast');
    const { onRename, onCancelEdit } = renderChord();
    fireEvent.doubleClick(screen.getByText('D min7'));
    fireEvent.change(box(), { target: { value: 'Cxyz' } });
    fireEvent.blur(box());
    expect(onRename).not.toHaveBeenCalled();
    expect(onCancelEdit).toHaveBeenCalledWith('r1');
    expect(showWarning).toHaveBeenCalledWith(`"Cxyz": ${CHORD_INPUT_HINT}`);
  });
});

describe('a new chord on an empty beat', () => {
  it('opens empty, and Escape leaves the beat as it was', () => {
    const { onRename, onCancelEdit } = renderChord({
      regionId: 'pending-chord',
      noteName: '',
      degreeName: '',
      degreeKey: undefined,
      autoEdit: true,
    });
    expect(box().value).toBe('');
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(onCancelEdit).toHaveBeenCalledWith('pending-chord');
  });

  it('is written once it names a chord', () => {
    const { onRename } = renderChord({
      regionId: 'pending-chord',
      noteName: '',
      degreeName: '',
      autoEdit: true,
    });
    fireEvent.change(box(), { target: { value: 'g7' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith(
      'pending-chord',
      expect.objectContaining({ name: '5 dom7', noteName: 'G dom7' }),
    );
  });
});
