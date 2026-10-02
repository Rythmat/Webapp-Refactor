import type { FreeAccessRule } from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';
import type { RuleIndex } from './insiderAccess';

/** What the table's cells and dialogs need to know about insider access. */
export interface AccessModel {
  /** Rules have loaded; until then nothing may be granted or changed. */
  ready: boolean;
  rules: FreeAccessRule[];
  index: RuleIndex;
  /** Every account (the unfiltered list), or `undefined` until it loads. */
  everyone: AdminUser[] | undefined;
  now: Date;
  /**
   * When the users list was fetched. The server computed each account's
   * insider flag then, so the flag is checked against the rules as of then.
   */
  fetchedAt: Date;
  /** A list is refetching, so the badge and the rules may briefly disagree. */
  syncing: boolean;
  refresh: () => void;
  /**
   * The dialogs open from page state, not from a Radix trigger, so Radix has
   * nowhere to return focus on close. The control that opened one registers
   * itself here and gets focus back.
   */
  rememberFocus: (element: HTMLElement | null) => void;
  restoreFocus: () => void;
}

/** Which insider-access dialog is open. One at a time, owned by the page. */
export type InsiderDialog =
  | { kind: 'add' }
  | { kind: 'grant'; user: AdminUser; emailOnly?: boolean }
  | { kind: 'edit'; rule: FreeAccessRule; renew: boolean }
  | { kind: 'remove'; rule: FreeAccessRule; fromUser?: AdminUser }
  | { kind: 'fix'; rule: FreeAccessRule };

export const displayName = (user: AdminUser) =>
  user.fullName || user.nickname || user.email || 'this user';

export const plural = (count: number, noun: string) =>
  `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;
