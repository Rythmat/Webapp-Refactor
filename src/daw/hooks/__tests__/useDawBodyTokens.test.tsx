// @vitest-environment jsdom
import { StrictMode, useEffect } from 'react';
import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DAW_BODY_CLASS, useDawBodyTokens } from '../useDawBodyTokens';

// ── useDawBodyTokens: who puts the DAW palette on <body> ────────────────────
// The editor and each portaled overlay hold body.daw-active while mounted.
// The class has to outlive every holder but the last: an overlay closing must
// not strip the tokens from the editor's other dialogs, and leaving the editor
// must take them off the rest of the app.

const hasClass = () => document.body.classList.contains(DAW_BODY_CLASS);

afterEach(() => {
  cleanup();
  // Every holder above has unmounted, so the count is back to zero.
  expect(hasClass()).toBe(false);
});

describe('useDawBodyTokens', () => {
  it('sets the class while mounted and removes it on unmount', () => {
    expect(hasClass()).toBe(false);
    const { unmount } = renderHook(() => useDawBodyTokens());
    expect(hasClass()).toBe(true);
    unmount();
    expect(hasClass()).toBe(false);
  });

  it('keeps the class until the last holder unmounts', () => {
    const editor = renderHook(() => useDawBodyTokens());
    const overlay = renderHook(() => useDawBodyTokens());
    const dialog = renderHook(() => useDawBodyTokens());

    overlay.unmount();
    expect(hasClass()).toBe(true);
    // Order doesn't matter: the editor can go before a dialog it rendered.
    editor.unmount();
    expect(hasClass()).toBe(true);
    dialog.unmount();
    expect(hasClass()).toBe(false);
  });

  it('stays balanced under StrictMode’s doubled effects', () => {
    const { unmount } = renderHook(() => useDawBodyTokens(), {
      wrapper: StrictMode,
    });
    expect(hasClass()).toBe(true);
    unmount();
    expect(hasClass()).toBe(false);
  });

  it('is set before the commit that mounts its holder finishes', () => {
    // A sibling's effect in the same commit already sees it, so nothing that
    // commit shows waits a frame for its tokens.
    let seenBySibling: boolean | null = null;
    function Sibling() {
      useEffect(() => {
        seenBySibling = hasClass();
      }, []);
      return null;
    }
    function Holder() {
      useDawBodyTokens();
      return null;
    }
    render(
      <>
        <Sibling />
        <Holder />
      </>,
    );
    expect(seenBySibling).toBe(true);
  });

  it('leaves the other classes on <body> alone', () => {
    document.body.classList.add('app-theme');
    const { unmount } = renderHook(() => useDawBodyTokens());
    unmount();
    expect(document.body.classList.contains('app-theme')).toBe(true);
    document.body.classList.remove('app-theme');
  });
});
