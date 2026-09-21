// @vitest-environment jsdom
import { StrictMode, act, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

/**
 * Regression test for the silent metronome in the Learn activities.
 *
 * PlayAlong used to build its MembraneSynth in `useMemo` and dispose it from an
 * effect cleanup. Under StrictMode that is a trap, and this test pins down why
 * so nobody reintroduces the pattern for the click, the practice guide, or any
 * other audio node.
 *
 * The fix is learn/audio/metronomeClick.ts: the synth is owned by the module,
 * so no component lifecycle can tear it down.
 */

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(<StrictMode>{node}</StrictMode>);
  });
}

describe('StrictMode and audio-node ownership', () => {
  it('disposes a useMemo-created node while the component is still mounted', () => {
    const log: string[] = [];
    let node: { disposed: boolean } | null = null;

    function Broken() {
      const synth = useMemo(() => {
        const s = { disposed: false };
        log.push('create');
        node = s;
        return s;
      }, []);
      useEffect(() => {
        return () => {
          synth.disposed = true;
          log.push('dispose');
        };
      }, [synth]);
      return null;
    }

    mount(<Broken />);

    // Two renders create two nodes; the committed one is then disposed by the
    // StrictMode cleanup and useMemo never re-runs to replace it.
    expect(log).toEqual(['create', 'create', 'dispose']);
    expect(node!.disposed).toBe(true);
  });

  it('leaves a module-owned node alive across the same lifecycle', () => {
    // How metronomeClick.ts is built: one lazily-created node outside React.
    const shared = { disposed: false, created: 0 };
    const getNode = () => {
      if (shared.created === 0) shared.created = 1;
      return shared;
    };

    function Fixed() {
      useEffect(() => {
        getNode();
        // No cleanup that disposes shared audio — that is the whole rule.
      }, []);
      return null;
    }

    mount(<Fixed />);

    expect(shared.created).toBe(1);
    expect(shared.disposed).toBe(false);
  });
});
