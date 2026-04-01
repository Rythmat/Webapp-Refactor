import debounce from 'lodash/debounce';
import { useMemo, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
) {
  const callbackRef = useRef(callback);

  return useMemo(
    () =>
      debounce(callbackRef.current, wait, { leading: false, trailing: true }),
    [wait],
  );
}
