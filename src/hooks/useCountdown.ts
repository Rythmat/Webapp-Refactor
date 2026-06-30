import { useEffect, useState } from 'react';

export interface CountdownState {
  msRemaining: number;
  expired: boolean;
}

export function useCountdown(
  deadline: string | Date,
  tickMs = 1000,
): CountdownState {
  const target =
    typeof deadline === 'string'
      ? new Date(deadline).getTime()
      : deadline.getTime();

  const compute = (): CountdownState => {
    const msRemaining = target - Date.now();
    return { msRemaining, expired: msRemaining <= 0 };
  };

  const [state, setState] = useState<CountdownState>(compute);

  useEffect(() => {
    setState(compute());
    if (Number.isNaN(target)) return;

    const initial = target - Date.now();
    if (initial <= 0) return;

    const id = window.setInterval(() => {
      const next = compute();
      setState(next);
      if (next.expired) window.clearInterval(id);
    }, tickMs);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, tickMs]);

  return state;
}
