// @vitest-environment jsdom
/**
 * Piano lessons are MIDI-only (commit 70b5e5f3 removed the lesson microphone
 * because stray room sound produced false notes). Guitar brings audio input
 * back for guitar lessons only, so this pins that the default — piano — path
 * never asks for the microphone.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearnInput } from '@/hooks/music/useLearnInput';

describe('useLearnInput (piano default)', () => {
  const getUserMedia = vi.fn();
  const requestMIDIAccess = vi.fn();

  beforeEach(() => {
    getUserMedia.mockReset();
    requestMIDIAccess.mockReset();
    requestMIDIAccess.mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
      onstatechange: null,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    });
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: requestMIDIAccess,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on Web MIDI and never opens the microphone', async () => {
    const { result, unmount } = renderHook(() =>
      useLearnInput({ detectionMode: 'polyphonic' }),
    );
    await act(async () => {
      await result.current.start();
    });
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(result.current.activeSource).toBe('midi');
    unmount();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
