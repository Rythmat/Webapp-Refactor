// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getGuitarView,
  setGuitarView,
  useGuitarView,
} from '../guitarViewPreference';
import { getRollView } from '../viewPreference';

describe('the stored guitar view', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('starts on TAB', () => {
    expect(getGuitarView()).toBe('tab');
  });

  it('remembers a choice under its own key', () => {
    setGuitarView('notation');
    expect(getGuitarView()).toBe('notation');
    expect(localStorage.getItem('musicAtlas:guitarView')).toBe('notation');
    setGuitarView('tab');
    expect(getGuitarView()).toBe('tab');
  });

  it('falls back to TAB on anything unexpected, including the roll', () => {
    localStorage.setItem('musicAtlas:guitarView', 'roll');
    expect(getGuitarView()).toBe('tab');
  });

  it("leaves the piano's roll/notation choice alone", () => {
    setGuitarView('notation');
    expect(getRollView('learn')).toBe('roll');
  });

  it('re-renders the hook when the view changes', () => {
    const { result } = renderHook(() => useGuitarView());
    expect(result.current[0]).toBe('tab');
    act(() => result.current[1]('notation'));
    expect(result.current[0]).toBe('notation');
  });
});
