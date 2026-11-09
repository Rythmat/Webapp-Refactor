import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { MUSIC_HISTORY, ensureAtlasContent } from '@/content/contentStore';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { gameOptionsQueryKey } from '@/hooks/data/gameOptions/useGameOptions';
import { gameOptionsApi } from '@/lib/gameOptions/api';
import { progressApi } from '@/lib/progress/api';
import { studioProjectsApi } from '@/lib/studio-projects/projectsClient';
import { backfillRecords } from './backfill';
import { buildWeb, type CortexWeb, type WebActivity } from './buildWeb';
import { describeActivity, eventTitleLookup } from './describe';
import {
  getCortexRecords,
  mergeRecord,
  subscribeCortex,
  type CortexRecord,
} from './ledger';

const STALE_MS = 1000 * 60 * 10;

const selectOptions = (data: { options: Record<string, unknown> }) =>
  data.options ?? {};

export interface CortexWebState {
  web: CortexWeb;
  /** The account hasn't answered yet: an empty map might not stay empty. */
  loading: boolean;
}

/** Everything the student has done, ledger and account, as the web. */
export const useCortexWeb = (): CortexWebState => {
  const token = useAuthToken();
  const ledger = useSyncExternalStore(subscribeCortex, getCortexRecords);
  const onAccount = Boolean(token) && !DEV_AUTH_BYPASS;

  // The summary fresh from the server, not useProgressSummary: that merges in
  // a device cache with no owner, which on a shared Chromebook is someone else's.
  const lessons = useQuery({
    queryKey: ['cortex', 'lessons', token],
    enabled: onAccount,
    staleTime: STALE_MS,
    queryFn: () => progressApi.fetchSummary(token!),
  });
  const projects = useQuery({
    queryKey: ['cortex', 'projects', token],
    enabled: onAccount,
    staleTime: STALE_MS,
    queryFn: () => studioProjectsApi.list(token!),
  });
  const options = useQuery({
    queryKey: gameOptionsQueryKey,
    enabled: onAccount,
    staleTime: STALE_MS,
    queryFn: () => gameOptionsApi.fetchAll(token!),
    select: selectOptions,
  });

  const records = useMemo(() => {
    const backfill = backfillRecords({
      lessons: lessons.data?.lessons,
      projects: projects.data,
      options: options.data,
    });
    const merged: Record<string, CortexRecord> = { ...ledger };
    for (const [id, record] of Object.entries(backfill)) {
      merged[id] = merged[id] ? mergeRecord(merged[id], record) : record;
    }
    return merged;
  }, [ledger, lessons.data, projects.data, options.data]);

  // Only a student who has stopped on a Globe event pays for the Globe's data,
  // which is all that names one.
  const needsEvents = useMemo(
    () => Object.keys(records).some((id) => id.startsWith('event:')),
    [records],
  );
  const [eventsReady, setEventsReady] = useState(false);
  useEffect(() => {
    if (!needsEvents) return;
    let cancelled = false;
    void ensureAtlasContent().then(() => {
      if (!cancelled) setEventsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [needsEvents]);

  const web = useMemo(() => {
    const context = {
      projects: projects.data
        ? new Map(
            projects.data.map((p) => [
              p.id,
              { name: p.name, genre: p.libraryGenre },
            ]),
          )
        : undefined,
      eventTitle: eventsReady ? eventTitleLookup(MUSIC_HISTORY) : undefined,
    };
    const activities = new Map<string, WebActivity>();
    for (const [id, record] of Object.entries(records)) {
      const activity = describeActivity(id, record, context);
      if (!activity) continue;
      const was = activities.get(activity.id);
      // A Globe event and its song are one activity: keep the fuller record.
      activities.set(
        activity.id,
        was
          ? {
              ...activity,
              done: was.done || activity.done,
              lastAt: Math.max(was.lastAt, activity.lastAt),
              doneAt: Math.max(was.doneAt, activity.doneAt),
            }
          : activity,
      );
    }
    return buildWeb([...activities.values()]);
  }, [records, projects.data, eventsReady]);

  return {
    web,
    loading:
      onAccount &&
      (lessons.isLoading || projects.isLoading || options.isLoading),
  };
};
