import { useEffect, useState } from 'react';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';

/**
 * The last place or tour a person opened on the Globe (owner, 2026-11-12:
 * the lesson's Independent Project shows each person where they left off),
 * kept on their device per user. Light on purpose: the Globe writes it as a
 * stop is reached (`useAtlasTrail`), with the stop's title already worked
 * out, so a reader (a lesson slide) pulls in none of the Globe.
 */
export interface LastGlobeStop {
  /** The stop's query string, `?event=…`: `/globe` plus this reopens it. */
  search: string;
  title: string;
  /** When it was reached, epoch ms. */
  at: number;
}

const PREFIX = 'ma:globe:last:v1';
const keyFor = (userKey: string) => `${PREFIX}:${userKey}`;
/** Same-tab readers hear a write through this event. */
const CHANGED = 'ma:globe:last-changed';

export const rememberGlobeStop = (search: string, title: string): void => {
  const userKey = getLocalStoreUserKey();
  if (!userKey || !search || !title) return;
  const entry: LastGlobeStop = { search, title, at: Date.now() };
  try {
    window.localStorage.setItem(keyFor(userKey), JSON.stringify(entry));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Storage full or blocked: the Globe works on, unremembered.
  }
};

const isEntry = (v: unknown): v is LastGlobeStop =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as LastGlobeStop).search === 'string' &&
  (v as LastGlobeStop).search.startsWith('?') &&
  typeof (v as LastGlobeStop).title === 'string' &&
  typeof (v as LastGlobeStop).at === 'number';

export const readLastGlobeStop = (): LastGlobeStop | null => {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userKey));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Where the stop opens again. */
export const lastGlobeStopHref = (stop: LastGlobeStop): string =>
  `/globe${stop.search}`;

/** The last Globe stop, kept current as the Globe or the user changes. */
export const useLastGlobeStop = (): LastGlobeStop | null => {
  const [stop, setStop] = useState(readLastGlobeStop);
  useEffect(() => {
    const read = () => setStop(readLastGlobeStop());
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(PREFIX)) read();
    };
    window.addEventListener(CHANGED, read);
    window.addEventListener('storage', onStorage);
    const off = onLocalStoreUserChange(read);
    return () => {
      window.removeEventListener(CHANGED, read);
      window.removeEventListener('storage', onStorage);
      off();
    };
  }, []);
  return stop;
};
