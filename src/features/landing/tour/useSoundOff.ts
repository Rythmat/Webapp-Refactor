import { useEffect, useRef } from 'react';

/**
 * The visitor's playback never runs silent: while it plays with Sound off —
 * the demo's mute, the demo leaving the screen, a hidden tab, a take-over
 * while muted — `pause` runs, as the scene's own Pause. `soundOn` counts Sound
 * still coming on, so a Play waiting on its gesture's enable is left alone.
 * `pause` is the latest render's (reads current state).
 */
export const useSoundOff = (
  playing: boolean,
  soundOn: boolean,
  pause: () => void,
) => {
  const latest = useRef(pause);
  latest.current = pause;
  const silent = playing && !soundOn;
  useEffect(() => {
    if (silent) latest.current();
  }, [silent]);
};
