import { useCallback, useEffect, useState } from 'react';
import { useMe } from '@/hooks/data';
import type { ReviewedMarks } from './reviewModel';

// Which turned-in work the teacher has marked reviewed, and when. Kept in
// this browser, per account, until the gradebook stores reviews on the
// server (the Office's "On this device" badge already says so). Not in the
// plan backup: a lost mark only puts a piece of work back in the queue.

const PREFIX = 'ma-teacher:reviewed:v1';
const keyFor = (userId: string | null) => `${PREFIX}:${userId ?? 'anon'}`;

const read = (key: string): ReviewedMarks => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object'
      ? (parsed as ReviewedMarks)
      : {};
  } catch {
    return {};
  }
};

export const useReviewedMarks = () => {
  const { data: me } = useMe();
  const key = keyFor(me?.id ?? null);
  const [marks, setMarks] = useState<ReviewedMarks>(() => read(key));

  useEffect(() => {
    setMarks(read(key));
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setMarks(read(key));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const write = useCallback(
    (update: (prev: ReviewedMarks) => ReviewedMarks) => {
      const next = update(read(key));
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or blocked: the mark lasts for this page only.
      }
      setMarks(next);
    },
    [key],
  );

  const mark = useCallback(
    (itemKey: string) =>
      write((prev) => ({ ...prev, [itemKey]: new Date().toISOString() })),
    [write],
  );
  const unmark = useCallback(
    (itemKey: string) =>
      write((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      }),
    [write],
  );

  return { marks, mark, unmark };
};
