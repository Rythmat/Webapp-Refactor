/**
 * useMspReport — installs a window.message listener + inbox subscription for
 * one interactionId. Both sources funnel through the same callback exactly
 * once. Rule: origin whitelist per module, envelope shape validation, and
 * interactionId match all enforced before invoking onResult.
 */
import { useEffect, useRef } from 'react';
import { useMe } from '@/hooks/data';
import { isAllowedMspOrigin, type AtlasModule } from './capabilities';
import {
  INBOX_EVENT,
  consumeMspEntryForUser,
  mspInboxStorageKey,
  readMspInboxForUser,
  type MspResponseEntry,
  type MspResultPayload,
} from './mspResponseInbox';

export interface MspEnvelope {
  msp: 'result';
  version: 1;
  interactionId: string;
  participant: { enrollmentId: string; accountId?: string };
  payload: MspResultPayload;
}

const isValidEnvelope = (data: unknown): data is MspEnvelope => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<MspEnvelope>;
  if (d.msp !== 'result') return false;
  if (d.version !== 1) return false;
  if (typeof d.interactionId !== 'string') return false;
  if (!d.participant || typeof d.participant !== 'object') return false;
  if (typeof d.participant.enrollmentId !== 'string') return false;
  if (!d.payload || typeof d.payload !== 'object') return false;
  const kind = (d.payload as { kind?: string }).kind;
  return kind === 'completion' || kind === 'score' || kind === 'artifact';
};

const isBrowser = typeof window !== 'undefined';

export const useMspReport = (
  interactionId: string,
  module: AtlasModule,
  onResult: (payload: MspResultPayload) => void,
): void => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    firedRef.current = new Set();
  }, [interactionId]);

  useEffect(() => {
    if (!isBrowser) return;

    const fire = (payload: MspResultPayload, dedupeKey: string) => {
      if (firedRef.current.has(dedupeKey)) return;
      firedRef.current.add(dedupeKey);
      onResult(payload);
    };

    const onMessage = (e: MessageEvent) => {
      if (!isAllowedMspOrigin(module, e.origin)) return;
      if (!isValidEnvelope(e.data)) return;
      if (e.data.interactionId !== interactionId) return;
      const key = `msg-${e.data.interactionId}-${e.data.participant.enrollmentId}`;
      fire(e.data.payload, key);
    };

    const drainInbox = () => {
      const inbox = readMspInboxForUser(userId);
      for (const entry of Object.values(inbox.entries)) {
        if (entry.interactionId !== interactionId) continue;
        const key = `inbox-${entry.token}`;
        fire(entry.payload, key);
        consumeMspEntryForUser(userId, entry.token);
      }
    };

    const onInboxEvent = (e: Event) => {
      const detail = (e as CustomEvent<MspResponseEntry>).detail;
      if (!detail || detail.interactionId !== interactionId) return;
      drainInbox();
    };

    // Cross-tab: a module launched in a NEW TAB writes shared localStorage but
    // fires its CustomEvent in its own window. The `storage` event is the only
    // signal that reaches this (the live-session) tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== mspInboxStorageKey(userId)) return;
      drainInbox();
    };

    window.addEventListener('message', onMessage);
    window.addEventListener(INBOX_EVENT, onInboxEvent);
    window.addEventListener('storage', onStorage);
    drainInbox();

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener(INBOX_EVENT, onInboxEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, [interactionId, module, onResult, userId]);
};
