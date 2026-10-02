import type { FreeAccessRule } from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';

/**
 * Insider access, as the users table needs it.
 *
 * The admin users endpoint flags an account `insider_access` but doesn't say
 * which rule did it, so the table re-derives that here with the server's own
 * matcher (API-Refactor `admin.controller.ts`, `hasInsiderAccess`):
 *
 * - email rule  → `email.toLowerCase() === rule.value`
 * - domain rule → `email.toLowerCase().endsWith('@' + rule.value)` — the exact
 *   domain, so `a@sub.school.edu` is not covered by `school.edu`
 * - a rule whose `expiresAt` has passed is ignored, whatever its `duration`
 *
 * The server only trims and lowercases a new rule's value and never strips a
 * leading `@`, so a domain saved as `@school.edu` matches no one. Input is
 * normalised here before it is sent.
 *
 * Expiry dates are sent as `YYYY-MM-DD`, which the server stores as midnight
 * UTC of that day — so every date here is read and written in UTC.
 *
 * Everything takes `now` so it can be tested without fake timers.
 */

export type RuleType = FreeAccessRule['type'];
type HasEmail = Pick<AdminUser, 'email'>;

// ── Input ──────────────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_BAD_CHARS = /[\s@/:,]/;

/** Providers where a domain grant would hand access to the public. */
export const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

export type ParsedRuleInput =
  | { type: RuleType; value: string; error?: never }
  | { error: string; type?: never; value?: never };

const INPUT_HINT =
  'Enter an email like sam@school.edu or a domain like school.edu.';

const checkDomain = (value: string): string | null => {
  if (!value) return INPUT_HINT;
  if (value.startsWith('*.')) {
    return "Subdomains aren't covered — enter the exact domain, like school.edu.";
  }
  if (DOMAIN_BAD_CHARS.test(value)) return INPUT_HINT;
  if (!value.includes('.')) return INPUT_HINT;
  if (value.startsWith('.') || value.endsWith('.') || value.includes('..')) {
    return INPUT_HINT;
  }
  return null;
};

/**
 * Reads the "Email or domain" field. A leading `@` means a domain (all of them
 * are stripped); otherwise anything with an `@` is an email and anything else
 * is a domain. Idempotent: its output parses to itself.
 */
export const parseRuleInput = (raw: string): ParsedRuleInput => {
  const text = raw.trim().toLowerCase();
  if (!text) return { error: INPUT_HINT };

  if (text.startsWith('@')) {
    const value = text.replace(/^@+/, '');
    const error = checkDomain(value);
    return error ? { error } : { type: 'domain', value };
  }

  if (text.includes('@')) {
    return EMAIL_PATTERN.test(text)
      ? { type: 'email', value: text }
      : { error: INPUT_HINT };
  }

  const error = checkDomain(text);
  return error ? { error } : { type: 'domain', value: text };
};

/** The part after the last `@`, lowercased — what a domain grant would use. */
export const emailDomain = (email: string): string =>
  email.slice(email.lastIndexOf('@') + 1).toLowerCase();

// ── Matching ───────────────────────────────────────────────────────────────

export const isRuleActive = (
  rule: Pick<FreeAccessRule, 'expiresAt'>,
  now: Date,
): boolean => !(rule.expiresAt && rule.expiresAt.getTime() < now.getTime());

export type RuleHealth = 'active' | 'expired' | 'unmatchable';

/**
 * A stored rule no real address can match — anything not in the form
 * `parseRuleInput` would have saved it in. That catches the legacy shapes the
 * old page allowed: a domain saved as `@x.edu`, an email-type rule saved as
 * `@x.edu` or `x.edu`, uppercase, stray spaces or punctuation.
 */
export const isUnmatchable = (rule: Pick<FreeAccessRule, 'type' | 'value'>) => {
  const parsed = parseRuleInput(rule.value);
  return (
    !!parsed.error || parsed.type !== rule.type || parsed.value !== rule.value
  );
};

export const ruleHealth = (rule: FreeAccessRule, now: Date): RuleHealth => {
  if (isUnmatchable(rule)) return 'unmatchable';
  return isRuleActive(rule, now) ? 'active' : 'expired';
};

export interface RuleIndex {
  email: Map<string, FreeAccessRule>;
  domain: Map<string, FreeAccessRule>;
}

/** The server allows one rule per (type, value), so a map per type is exact. */
export const indexRules = (rules: readonly FreeAccessRule[]): RuleIndex => {
  const index: RuleIndex = { email: new Map(), domain: new Map() };
  for (const rule of rules) index[rule.type].set(rule.value, rule);
  return index;
};

export interface UserAccess {
  /** This email's own rule, active or expired. */
  email: FreeAccessRule | null;
  /** The rule for this email's domain, active or expired. */
  domain: FreeAccessRule | null;
  /** The rule granting access now: an active email rule beats a domain one. */
  active: FreeAccessRule | null;
  via: RuleType | null;
  /** Matching rules that have expired, email first. */
  expired: FreeAccessRule[];
  /** Both an email and a domain rule are active. */
  both: boolean;
}

const NO_ACCESS: UserAccess = {
  email: null,
  domain: null,
  active: null,
  via: null,
  expired: [],
  both: false,
};

export const rulesForUser = (
  email: string | null,
  index: RuleIndex,
  now: Date,
): UserAccess => {
  if (!email) return NO_ACCESS;
  const lower = email.toLowerCase();

  const emailRule = index.email.get(lower) ?? null;
  // `endsWith('@' + value)` for every value is the same as looking up the text
  // after each `@` — including in odd addresses with more than one.
  let domainRule: FreeAccessRule | null = null;
  for (
    let at = lower.indexOf('@');
    at !== -1;
    at = lower.indexOf('@', at + 1)
  ) {
    const hit = index.domain.get(lower.slice(at + 1));
    if (!hit) continue;
    // The server takes any active match, so an active rule wins over an
    // expired one found first (only possible with more than one `@`).
    if (
      !domainRule ||
      (!isRuleActive(domainRule, now) && isRuleActive(hit, now))
    ) {
      domainRule = hit;
    }
  }

  const emailActive = !!emailRule && isRuleActive(emailRule, now);
  const domainActive = !!domainRule && isRuleActive(domainRule, now);
  const active = emailActive ? emailRule : domainActive ? domainRule : null;

  return {
    email: emailRule,
    domain: domainRule,
    active,
    via: active ? active.type : null,
    expired: [
      ...(emailRule && !emailActive ? [emailRule] : []),
      ...(domainRule && !domainActive ? [domainRule] : []),
    ],
    both: emailActive && domainActive,
  };
};

/** Of two end dates, the later one; `null` (no end date) beats any date. */
export const laterEnd = (a: Date | null, b: Date | null): Date | null =>
  a === null || b === null ? null : a > b ? a : b;

// ── Rule rows ──────────────────────────────────────────────────────────────

export type RuleRow =
  | { kind: 'pre-granted'; rule: FreeAccessRule; health: RuleHealth }
  | {
      kind: 'domain';
      rule: FreeAccessRule;
      health: RuleHealth;
      /** Accounts whose email is on this domain, whatever their status. */
      accountCount: number | null;
    };

const byValue = (a: RuleRow, b: RuleRow) =>
  a.rule.value.localeCompare(b.rule.value);

/** Accounts a rule covers — for counts and for the remove dialog's names. */
export const accountsCoveredBy = <T extends HasEmail>(
  rule: Pick<FreeAccessRule, 'type' | 'value'>,
  accounts: readonly T[],
): T[] =>
  accounts.filter((account) => {
    const email = account.email?.toLowerCase();
    if (!email) return false;
    return rule.type === 'email'
      ? email === rule.value
      : email.endsWith(`@${rule.value}`);
  });

/**
 * The rules that get a row of their own: every domain rule (one rule covers
 * many accounts, so it needs one place to be edited) and every email rule
 * whose account doesn't exist yet. An email rule whose account exists is
 * managed from that account's row.
 *
 * `knownAccounts` must be the unfiltered user list — the table's own list is
 * filtered by search and role, and an account filtered out of it would read as
 * "no account yet". While that list isn't known, no pre-granted rows are
 * produced and domain counts are `null`.
 */
export const ruleRows = (
  rules: readonly FreeAccessRule[],
  knownAccounts: readonly HasEmail[] | undefined,
  now: Date,
): RuleRow[] => {
  const emails = knownAccounts
    ? new Set(
        knownAccounts.flatMap((account) =>
          account.email ? [account.email.toLowerCase()] : [],
        ),
      )
    : null;

  const domains: RuleRow[] = [];
  const preGranted: RuleRow[] = [];
  for (const rule of rules) {
    const health = ruleHealth(rule, now);
    if (rule.type === 'domain') {
      domains.push({
        kind: 'domain',
        rule,
        health,
        // Counted from the list, like `accountsCoveredBy`: two accounts whose
        // emails differ only in case are still two accounts.
        accountCount: !knownAccounts
          ? null
          : health === 'unmatchable'
            ? 0
            : accountsCoveredBy(rule, knownAccounts).length,
      });
    } else if (emails !== null && !emails.has(rule.value)) {
      preGranted.push({ kind: 'pre-granted', rule, health });
    }
  }
  return [...domains.sort(byValue), ...preGranted.sort(byValue)];
};

/**
 * How many of `accounts` lose insider access if `rule` goes: those it covers
 * that no other active rule also covers. An expired rule costs no one.
 */
export const accountsLosingAccess = (
  rule: FreeAccessRule,
  index: RuleIndex,
  accounts: readonly HasEmail[],
  now: Date,
): number => {
  if (!isRuleActive(rule, now)) return 0;
  return accountsCoveredBy(rule, accounts).filter((account) => {
    const access = rulesForUser(account.email, index, now);
    const other = rule.type === 'email' ? access.domain : access.email;
    return !(other && isRuleActive(other, now));
  }).length;
};

export const ruleRowMatchesSearch = (
  rule: Pick<FreeAccessRule, 'type' | 'value'>,
  search: string,
): boolean => {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    rule.value.includes(q) ||
    (rule.type === 'domain' && `@${rule.value}`.includes(q))
  );
};

/** Exact `(type, value)`, like the server's unique constraint — expired too. */
export const findExistingRule = (
  rules: readonly FreeAccessRule[],
  type: RuleType,
  value: string,
): FreeAccessRule | undefined =>
  rules.find((rule) => rule.type === type && rule.value === value);

// ── Dates (UTC) ────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const RULE_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** "Oct 1, 2026" — the UTC day the server stores, in any admin's time zone. */
export const formatRuleDate = (date: Date): string =>
  RULE_DATE_FORMAT.format(date);

export const toDateInputValue = (date: Date): string =>
  date.toISOString().slice(0, 10);

/** `null` unless the value is a real day (so `2026-02-30` is rejected). */
export const parseDateInputValue = (value: string): Date | null => {
  if (!DATE_INPUT_PATTERN.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toDateInputValue(date) === value ? date : null;
};

/**
 * Tomorrow, in UTC. A day's access stops as that day begins in UTC, and
 * today's UTC midnight has always passed — so today would save an expired rule.
 */
export const minExpiryDateInputValue = (now: Date): string =>
  toDateInputValue(new Date(now.getTime() + DAY_MS));

export const isValidExpiryInput = (value: string, now: Date): boolean => {
  const date = parseDateInputValue(value);
  return !!date && date.getTime() > now.getTime();
};

/**
 * What a rule's duration is set to. A temporary rule always carries a date:
 * the server would accept one without and never expire it, and a PATCH
 * without a date keeps the old — possibly already past — one.
 */
export type Expiry =
  | { duration: 'perpetual' }
  | { duration: 'temporary'; date: string };

export const toCreateBody = (
  type: RuleType,
  value: string,
  expiry: Expiry,
) => ({
  type,
  value,
  duration: expiry.duration,
  expiresAt: expiry.duration === 'temporary' ? expiry.date : null,
});

export const toUpdateBody = (id: string, expiry: Expiry) => ({
  id,
  duration: expiry.duration,
  expiresAt: expiry.duration === 'temporary' ? expiry.date : null,
});

/** "No end date", "Ends Oct 1, 2026" or "Ended Sep 3, 2026". */
export const describeEnd = (
  rule: Pick<FreeAccessRule, 'expiresAt'>,
  now: Date,
): string => {
  if (!rule.expiresAt) return 'No end date';
  return `${isRuleActive(rule, now) ? 'Ends' : 'Ended'} ${formatRuleDate(rule.expiresAt)}`;
};

// ── Errors ─────────────────────────────────────────────────────────────────

export type AccessErrorKind = 'duplicate' | 'not_found' | 'server' | 'other';

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
};

export const classifyAccessError = (err: unknown): AccessErrorKind => {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const status = statusOf(err);
  if (/unique constraint|P2002/i.test(message)) return 'duplicate';
  if (status === 404 || /P2025|not found/i.test(message)) return 'not_found';
  if (
    (status !== undefined && status >= 500) ||
    /prisma|invocation/i.test(message)
  ) {
    return 'server';
  }
  return 'other';
};

/** Admin-facing copy for a failed rule change. Never echoes server internals. */
export const describeAccessError = (
  err: unknown,
  context: { action: 'grant' | 'update' | 'remove'; value: string },
): { title: string; description: string } => {
  const title =
    context.action === 'remove'
      ? 'Couldn’t remove insider access'
      : 'Couldn’t save insider access';
  switch (classifyAccessError(err)) {
    case 'duplicate':
      return {
        title,
        description: `${context.value} already has insider access.`,
      };
    case 'not_found':
      return {
        title,
        description: `The rule for ${context.value} was already removed.`,
      };
    case 'server':
      return {
        title,
        description: 'The server couldn’t complete the change. Try again.',
      };
    default: {
      const message = err instanceof Error ? err.message : '';
      return {
        title,
        description:
          message && !/prisma|invocation/i.test(message)
            ? message
            : 'Something went wrong. Try again.',
      };
    }
  }
};

// ── Server flag vs rules ───────────────────────────────────────────────────

export type InsiderSync = 'agree' | 'server-only' | 'rules-only';

/**
 * Whether the users list's insider flag and the rules agree. They can drift
 * for a moment after a change (one list refetched before the other); compare
 * at the time the users list was fetched, not at "now".
 */
export const insiderSync = (
  serverInsider: boolean,
  access: Pick<UserAccess, 'active'>,
): InsiderSync => {
  const local = !!access.active;
  if (serverInsider === local) return 'agree';
  return serverInsider ? 'server-only' : 'rules-only';
};

export const isServerInsider = (user: Pick<AdminUser, 'subscriptionStatus'>) =>
  user.subscriptionStatus === 'insider_access';

// ── Subscription filter ────────────────────────────────────────────────────

export const SUBSCRIPTION_FILTERS = [
  'all',
  'active',
  'insider_access',
  'past_due',
  'canceled',
  'free',
] as const;

export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

export const parseSubscriptionFilter = (
  raw: string | null,
): SubscriptionFilter =>
  (SUBSCRIPTION_FILTERS as readonly string[]).includes(raw ?? '')
    ? (raw as SubscriptionFilter)
    : 'all';

/**
 * The subscription filter, on the server's flag. "Insider access" also keeps
 * accounts whose only rule has expired, so every rule stays reachable there.
 */
export const matchesSubscriptionFilter = (
  user: Pick<AdminUser, 'subscriptionStatus' | 'hasPaidAccess'>,
  filter: SubscriptionFilter,
  access: Pick<UserAccess, 'expired'>,
): boolean => {
  const insider = isServerInsider(user);
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return user.hasPaidAccess && !insider;
    case 'insider_access':
      return insider || access.expired.length > 0;
    case 'past_due':
      return user.subscriptionStatus === 'past_due';
    case 'canceled':
      return user.subscriptionStatus === 'canceled';
    case 'free':
      return (
        !insider &&
        !user.hasPaidAccess &&
        user.subscriptionStatus !== 'past_due' &&
        user.subscriptionStatus !== 'canceled'
      );
  }
};

/** Rule rows show only where they make sense: no role, no paid-state filter. */
export const showsRuleRows = (
  roleFilter: string,
  subscriptionFilter: SubscriptionFilter,
) =>
  roleFilter === 'all' &&
  (subscriptionFilter === 'all' || subscriptionFilter === 'insider_access');
