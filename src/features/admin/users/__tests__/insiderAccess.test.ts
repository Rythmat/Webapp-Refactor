import { describe, expect, it } from 'vitest';
import type { FreeAccessRule } from '@/hooks/data/admin/useAdminFreeAccess';
import type { AdminUser } from '@/hooks/data/admin/useAdminUsers';
import {
  accountsCoveredBy,
  accountsLosingAccess,
  classifyAccessError,
  describeAccessError,
  describeEnd,
  emailDomain,
  findExistingRule,
  indexRules,
  insiderSync,
  isRuleActive,
  isServerInsider,
  isUnmatchable,
  laterEnd,
  matchesSubscriptionFilter,
  parseRuleInput,
  parseSubscriptionFilter,
  ruleHealth,
  ruleRowMatchesSearch,
  ruleRows,
  rulesForUser,
  showsRuleRows,
  SUBSCRIPTION_FILTERS,
  toCreateBody,
  toUpdateBody,
  type AccessErrorKind,
  type SubscriptionFilter,
  type UserAccess,
} from '../insiderAccess';

/**
 * The users table re-derives which insider-access rule covers an account, so
 * it has to agree with the server's matcher exactly: an email rule is an exact
 * lowercase match, a domain rule covers `…@domain` and nothing under it, and
 * a rule past its `expiresAt` counts for no one, whatever its duration.
 */

const NOW = new Date('2026-09-29T12:00:00Z');
const ms = (offset: number) => new Date(NOW.getTime() + offset);

const rule = (over: Partial<FreeAccessRule> = {}): FreeAccessRule => ({
  id: 'rule-1',
  type: 'email',
  value: 'jane@school.edu',
  duration: 'perpetual',
  expiresAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

const acct = (email: string | null): Pick<AdminUser, 'email'> => ({ email });

const PAST = new Date('2026-09-01T00:00:00Z');
const FUTURE = new Date('2026-12-01T00:00:00Z');

const emailRule = (value: string, over: Partial<FreeAccessRule> = {}) =>
  rule({ id: `email:${value}`, type: 'email', value, ...over });
const domainRule = (value: string, over: Partial<FreeAccessRule> = {}) =>
  rule({ id: `domain:${value}`, type: 'domain', value, ...over });

const accessFor = (email: string | null, rules: FreeAccessRule[]) =>
  rulesForUser(email, indexRules(rules), NOW);

// ── parseRuleInput ──────────────────────────────────────────────────────────

describe('parseRuleInput', () => {
  it('reads an email, trimmed and lowercased', () => {
    expect(parseRuleInput('  Jane.Doe@School.EDU ')).toEqual({
      type: 'email',
      value: 'jane.doe@school.edu',
    });
  });

  it.each(['', '   '])('rejects blank input %j', (raw) => {
    expect(parseRuleInput(raw).error).toEqual(expect.any(String));
  });

  it.each(['a@b@c.com', 'jane@', 'jane@localhost', 'ja ne@x.com'])(
    'rejects the malformed email %j',
    (raw) => {
      const parsed = parseRuleInput(raw);
      expect(parsed.error).toEqual(expect.any(String));
      expect(parsed.type).toBeUndefined();
    },
  );

  it.each(['School.edu', '@school.edu', '@@school.edu', '  @School.EDU '])(
    'reads %j as the domain school.edu',
    (raw) => {
      expect(parseRuleInput(raw)).toEqual({
        type: 'domain',
        value: 'school.edu',
      });
    },
  );

  it.each([
    'school',
    'school .edu',
    '@',
    '.edu',
    'school.edu.',
    'school..edu',
    'https://school.edu',
  ])('rejects the malformed domain %j', (raw) => {
    const parsed = parseRuleInput(raw);
    expect(parsed.error).toEqual(expect.any(String));
    expect(parsed.type).toBeUndefined();
  });

  it('explains that a wildcard subdomain is not covered', () => {
    expect(parseRuleInput('*.school.edu').error).toMatch(/subdomain/i);
  });

  it.each([
    '  Jane.Doe@School.EDU ',
    'sam@school.edu',
    'School.edu',
    '@school.edu',
    '@@school.edu',
    '  @School.EDU ',
    'music.k12.ca.us',
  ])('is idempotent: the output of %j parses to itself', (raw) => {
    const first = parseRuleInput(raw);
    expect(first.error).toBeUndefined();
    const again = parseRuleInput(
      first.type === 'domain' ? `@${first.value}` : first.value!,
    );
    expect(again).toEqual(first);
    if (first.type === 'domain') {
      expect(parseRuleInput(first.value!)).toEqual(first);
    }
  });
});

describe('emailDomain', () => {
  it('is the lowercased part after the @', () => {
    expect(emailDomain('Jane@School.EDU')).toBe('school.edu');
  });

  it('uses the last @ in an odd address', () => {
    expect(emailDomain('a@b@c.com')).toBe('c.com');
  });
});

// ── Activity and health ─────────────────────────────────────────────────────

describe('isRuleActive', () => {
  it.each(['perpetual', 'temporary'] as const)(
    'treats a %s rule with no expiresAt as active',
    (duration) => {
      expect(isRuleActive(rule({ duration, expiresAt: null }), NOW)).toBe(true);
    },
  );

  it('is active until the instant passes (strict <)', () => {
    expect(isRuleActive(rule({ expiresAt: ms(1) }), NOW)).toBe(true);
    expect(isRuleActive(rule({ expiresAt: ms(0) }), NOW)).toBe(true);
    expect(isRuleActive(rule({ expiresAt: ms(-1) }), NOW)).toBe(false);
  });

  it('ignores a perpetual duration once expiresAt has passed', () => {
    expect(
      isRuleActive(rule({ duration: 'perpetual', expiresAt: PAST }), NOW),
    ).toBe(false);
  });

  it('ends a YYYY-MM-DD date at midnight UTC of that day', () => {
    const r = rule({
      duration: 'temporary',
      expiresAt: new Date('2026-10-01'),
    });
    expect(isRuleActive(r, new Date('2026-09-30T23:59:59.999Z'))).toBe(true);
    expect(isRuleActive(r, new Date('2026-10-01T00:00:00.001Z'))).toBe(false);
  });
});

describe('isUnmatchable / ruleHealth', () => {
  it.each<[string, Pick<FreeAccessRule, 'type' | 'value'>]>([
    ['a legacy @-prefixed domain', { type: 'domain', value: '@school.edu' }],
    ['an uppercase email', { type: 'email', value: 'Jane@x.com' }],
    ['an email with no @', { type: 'email', value: 'school.edu' }],
    ['an empty email', { type: 'email', value: '' }],
    ['an empty domain', { type: 'domain', value: '' }],
  ])('flags %s as unmatchable', (_label, r) => {
    expect(isUnmatchable(r)).toBe(true);
    expect(ruleHealth(rule(r), NOW)).toBe('unmatchable');
  });

  it('accepts a normalised email and domain', () => {
    expect(isUnmatchable({ type: 'email', value: 'jane@x.com' })).toBe(false);
    expect(isUnmatchable({ type: 'domain', value: 'school.edu' })).toBe(false);
  });

  it('reports unmatchable over expired', () => {
    expect(
      ruleHealth(domainRule('@school.edu', { expiresAt: PAST }), NOW),
    ).toBe('unmatchable');
  });

  it('tells expired from active', () => {
    expect(ruleHealth(emailRule('jane@x.com', { expiresAt: PAST }), NOW)).toBe(
      'expired',
    );
    expect(
      ruleHealth(emailRule('jane@x.com', { expiresAt: FUTURE }), NOW),
    ).toBe('active');
    expect(ruleHealth(domainRule('school.edu'), NOW)).toBe('active');
  });
});

// ── Matching ────────────────────────────────────────────────────────────────

describe('indexRules + rulesForUser', () => {
  it('matches an email rule case-insensitively on the account side', () => {
    const r = emailRule('jane@school.edu');
    const access = accessFor('Jane@School.EDU', [r]);
    expect(access.email).toBe(r);
    expect(access.active).toBe(r);
    expect(access.via).toBe('email');
  });

  it('never matches a stored uppercase value', () => {
    const access = accessFor('Jane@School.EDU', [emailRule('Jane@School.EDU')]);
    expect(access.email).toBeNull();
    expect(access.active).toBeNull();
  });

  it('matches the exact domain only', () => {
    const r = domainRule('school.edu');
    expect(accessFor('a@school.edu', [r]).active).toBe(r);
    expect(accessFor('A@School.EDU', [r]).via).toBe('domain');
    for (const email of [
      'a@sub.school.edu',
      'a@myschool.edu',
      'a@school.edu.au',
    ]) {
      expect(accessFor(email, [r]).domain).toBeNull();
    }
  });

  it('never matches a legacy @-prefixed domain', () => {
    const access = accessFor('a@school.edu', [domainRule('@school.edu')]);
    expect(access.domain).toBeNull();
    expect(access.active).toBeNull();
  });

  it('gives an account with no email no access', () => {
    const access = accessFor(null, [domainRule('school.edu')]);
    expect(access).toEqual({
      email: null,
      domain: null,
      active: null,
      via: null,
      expired: [],
      both: false,
    });
  });

  it('prefers the email rule when both are active', () => {
    const e = emailRule('jane@school.edu');
    const d = domainRule('school.edu');
    expect(accessFor('jane@school.edu', [d, e])).toEqual<UserAccess>({
      email: e,
      domain: d,
      active: e,
      via: 'email',
      expired: [],
      both: true,
    });
  });

  it('falls back to an active domain when the email rule has expired', () => {
    const e = emailRule('jane@school.edu', { expiresAt: PAST });
    const d = domainRule('school.edu');
    const access = accessFor('jane@school.edu', [e, d]);
    expect(access.active).toBe(d);
    expect(access.via).toBe('domain');
    expect(access.expired).toEqual([e]);
    expect(access.both).toBe(false);
  });

  it('keeps the email rule when the domain has expired', () => {
    const e = emailRule('jane@school.edu');
    const d = domainRule('school.edu', { expiresAt: PAST });
    const access = accessFor('jane@school.edu', [d, e]);
    expect(access.active).toBe(e);
    expect(access.via).toBe('email');
    expect(access.expired).toEqual([d]);
    expect(access.both).toBe(false);
  });

  it('lists both expired rules, email first', () => {
    const e = emailRule('jane@school.edu', { expiresAt: PAST });
    const d = domainRule('school.edu', { expiresAt: PAST });
    const access = accessFor('jane@school.edu', [d, e]);
    expect(access.active).toBeNull();
    expect(access.via).toBeNull();
    expect(access.expired).toEqual([e, d]);
    expect(access.both).toBe(false);
  });

  it('finds nothing when there are no rules', () => {
    expect(accessFor('jane@school.edu', [])).toEqual({
      email: null,
      domain: null,
      active: null,
      via: null,
      expired: [],
      both: false,
    });
  });
});

describe('laterEnd', () => {
  it('lets no end date beat any date', () => {
    expect(laterEnd(null, FUTURE)).toBeNull();
    expect(laterEnd(FUTURE, null)).toBeNull();
    expect(laterEnd(null, null)).toBeNull();
  });

  it('picks the later of two dates', () => {
    expect(laterEnd(PAST, FUTURE)).toBe(FUTURE);
    expect(laterEnd(FUTURE, PAST)).toBe(FUTURE);
  });
});

// ── Rule rows ───────────────────────────────────────────────────────────────

describe('ruleRows', () => {
  it('gives an email rule with no account a pre-granted row', () => {
    const r = emailRule('new@school.edu');
    expect(ruleRows([r], [acct('other@x.com')], NOW)).toEqual([
      { kind: 'pre-granted', rule: r, health: 'active' },
    ]);
  });

  it('gives no row to an email rule whose account exists, whatever its case', () => {
    expect(
      ruleRows([emailRule('jane@x.com')], [acct('JANE@x.com')], NOW),
    ).toEqual([]);
  });

  it('does not treat an account filtered out of the table as "no account yet" when it is in knownAccounts', () => {
    const r = emailRule('jane@x.com');
    const everyone = [acct('bob@x.com'), acct('jane@x.com')];
    const tableAfterSearch = everyone.filter((a) => a.email?.startsWith('bob'));
    expect(ruleRows([r], everyone, NOW)).toEqual([]);
    // Why the unfiltered list matters: the table's list would invent a row.
    expect(ruleRows([r], tableAfterSearch, NOW)).toHaveLength(1);
  });

  it('produces no pre-granted rows and null counts while accounts are unknown', () => {
    const d = domainRule('school.edu');
    expect(ruleRows([emailRule('new@x.com'), d], undefined, NOW)).toEqual([
      { kind: 'domain', rule: d, health: 'active', accountCount: null },
    ]);
  });

  it('always gives a domain rule a row, counting its exact-domain accounts', () => {
    const d = domainRule('school.edu');
    const accounts = [
      acct('Amy@School.EDU'),
      acct('bob@school.edu'),
      acct('cat@sub.school.edu'),
      acct('dan@myschool.edu'),
      acct(null),
    ];
    expect(ruleRows([d], accounts, NOW)).toEqual([
      { kind: 'domain', rule: d, health: 'active', accountCount: 2 },
    ]);
    expect(ruleRows([d], [], NOW)).toEqual([
      { kind: 'domain', rule: d, health: 'active', accountCount: 0 },
    ]);
  });

  it('marks an unmatchable domain and counts no one', () => {
    const d = domainRule('@school.edu');
    expect(ruleRows([d], [acct('a@school.edu')], NOW)).toEqual([
      { kind: 'domain', rule: d, health: 'unmatchable', accountCount: 0 },
    ]);
  });

  it('marks an expired pre-granted rule', () => {
    const r = emailRule('new@x.com', { expiresAt: PAST });
    expect(ruleRows([r], [], NOW)).toEqual([
      { kind: 'pre-granted', rule: r, health: 'expired' },
    ]);
  });

  it('lists domains first, then pre-granted, each A–Z', () => {
    const rows = ruleRows(
      [
        emailRule('zed@x.com'),
        domainRule('zeta.edu'),
        emailRule('amy@x.com'),
        domainRule('alpha.edu'),
      ],
      [],
      NOW,
    );
    expect(rows.map((row) => [row.kind, row.rule.value])).toEqual([
      ['domain', 'alpha.edu'],
      ['domain', 'zeta.edu'],
      ['pre-granted', 'amy@x.com'],
      ['pre-granted', 'zed@x.com'],
    ]);
  });
});

describe('accountsCoveredBy', () => {
  const accounts = [
    acct('Jane@School.EDU'),
    acct('bob@school.edu'),
    acct('cat@sub.school.edu'),
    acct(null),
  ];

  it('covers one account for an email rule, case-insensitively', () => {
    expect(
      accountsCoveredBy({ type: 'email', value: 'jane@school.edu' }, accounts),
    ).toEqual([accounts[0]]);
  });

  it('covers the exact domain only for a domain rule', () => {
    expect(
      accountsCoveredBy({ type: 'domain', value: 'school.edu' }, accounts),
    ).toEqual([accounts[0], accounts[1]]);
  });
});

describe('accountsLosingAccess', () => {
  const accounts = [
    acct('amy@school.edu'),
    acct('bob@school.edu'),
    acct('cat@school.edu'),
    acct('dan@elsewhere.edu'),
  ];

  it('spares accounts that keep their own active email rule', () => {
    const d = domainRule('school.edu');
    const index = indexRules([d, emailRule('amy@school.edu')]);
    expect(accountsLosingAccess(d, index, accounts, NOW)).toBe(2);
  });

  it('costs no one for an expired rule', () => {
    const d = domainRule('school.edu', { expiresAt: PAST });
    expect(accountsLosingAccess(d, indexRules([d]), accounts, NOW)).toBe(0);
  });

  it('costs no one for an email rule while the domain is active', () => {
    const e = emailRule('amy@school.edu');
    const index = indexRules([e, domainRule('school.edu')]);
    expect(accountsLosingAccess(e, index, accounts, NOW)).toBe(0);
  });

  it('costs the one account for an email rule alone', () => {
    const e = emailRule('amy@school.edu');
    expect(accountsLosingAccess(e, indexRules([e]), accounts, NOW)).toBe(1);
  });
});

describe('ruleRowMatchesSearch', () => {
  const d = { type: 'domain', value: 'school.edu' } as const;
  const e = { type: 'email', value: 'jane@x.com' } as const;

  it('matches case-insensitively and trims', () => {
    expect(ruleRowMatchesSearch(d, 'SCHOOL')).toBe(true);
    expect(ruleRowMatchesSearch(e, '  Jane@X  ')).toBe(true);
    expect(ruleRowMatchesSearch(e, 'bob')).toBe(false);
  });

  it('matches "@school" against a domain rule', () => {
    expect(ruleRowMatchesSearch(d, '@school')).toBe(true);
    expect(ruleRowMatchesSearch(e, '@school')).toBe(false);
  });

  it('matches everything on an empty search', () => {
    expect(ruleRowMatchesSearch(d, '')).toBe(true);
    expect(ruleRowMatchesSearch(e, '   ')).toBe(true);
  });
});

describe('findExistingRule', () => {
  it('finds an exact (type, value) match', () => {
    const d = domainRule('school.edu');
    const rules = [emailRule('jane@x.com'), d];
    expect(findExistingRule(rules, 'domain', 'school.edu')).toBe(d);
  });

  it('does not treat the same value of another type as a duplicate', () => {
    const rules = [emailRule('school.edu')];
    expect(findExistingRule(rules, 'domain', 'school.edu')).toBeUndefined();
  });

  it('counts an expired exact match as a duplicate', () => {
    const e = emailRule('jane@x.com', { expiresAt: PAST });
    expect(findExistingRule([e], 'email', 'jane@x.com')).toBe(e);
  });

  it('does not match a stored "@school.edu" to "school.edu"', () => {
    const rules = [domainRule('@school.edu')];
    expect(findExistingRule(rules, 'domain', 'school.edu')).toBeUndefined();
  });
});

// ── Request bodies and copy ─────────────────────────────────────────────────

describe('toCreateBody / toUpdateBody', () => {
  it('sends no date for a perpetual rule', () => {
    expect(
      toCreateBody('domain', 'school.edu', { duration: 'perpetual' }),
    ).toEqual({
      type: 'domain',
      value: 'school.edu',
      duration: 'perpetual',
      expiresAt: null,
    });
    expect(toUpdateBody('r1', { duration: 'perpetual' })).toEqual({
      id: 'r1',
      duration: 'perpetual',
      expiresAt: null,
    });
  });

  it('sends the date string for a temporary rule', () => {
    const expiry = { duration: 'temporary', date: '2026-10-01' } as const;
    expect(toCreateBody('email', 'jane@x.com', expiry)).toEqual({
      type: 'email',
      value: 'jane@x.com',
      duration: 'temporary',
      expiresAt: '2026-10-01',
    });
    expect(toUpdateBody('r1', expiry)).toEqual({
      id: 'r1',
      duration: 'temporary',
      expiresAt: '2026-10-01',
    });
  });
});

describe('describeEnd', () => {
  it('says when a rule ends, or ended', () => {
    expect(describeEnd({ expiresAt: null }, NOW)).toBe('No end date');
    expect(describeEnd({ expiresAt: new Date('2026-10-01') }, NOW)).toBe(
      'Ends Oct 1, 2026',
    );
    expect(describeEnd({ expiresAt: new Date('2026-09-03') }, NOW)).toBe(
      'Ended Sep 3, 2026',
    );
  });
});

// ── Errors ──────────────────────────────────────────────────────────────────

const PRISMA_UNIQUE =
  'Invalid `prisma.freeAccessRule.create()` invocation: Unique constraint failed on the fields: (`type`,`value`)';

const httpError = (message: string, status: number) =>
  Object.assign(new Error(message), { status });

describe('classifyAccessError', () => {
  it.each<[string, unknown, AccessErrorKind]>([
    ['the raw Prisma unique error', PRISMA_UNIQUE, 'duplicate'],
    [
      'the Prisma unique error as a 500',
      httpError(PRISMA_UNIQUE, 500),
      'duplicate',
    ],
    ['a P2002 code', 'P2002', 'duplicate'],
    ['a P2025 code', 'P2025', 'not_found'],
    ['a 404', httpError('Gone', 404), 'not_found'],
    ['a 500', httpError('Request failed: 500', 500), 'server'],
    ['a plain Error', new Error('nope'), 'other'],
  ])('classifies %s', (_label, err, kind) => {
    expect(classifyAccessError(err)).toBe(kind);
  });
});

describe('describeAccessError', () => {
  const cases: [AccessErrorKind, unknown][] = [
    ['duplicate', httpError(PRISMA_UNIQUE, 500)],
    [
      'not_found',
      new Error(
        'Invalid `prisma.freeAccessRule.delete()` invocation: Record to delete not found. P2025',
      ),
    ],
    [
      'server',
      httpError(
        'Invalid `prisma.freeAccessRule.update()` invocation: PrismaClientKnownRequestError',
        500,
      ),
    ],
    ['server', 'PrismaClientUnknownRequestError: not an Error instance'],
    ['other', new Error('nope')],
    ['other', null],
  ];

  it.each(cases)('never echoes Prisma for a %s error', (kind, err) => {
    expect(classifyAccessError(err)).toBe(kind);
    for (const action of ['grant', 'update', 'remove'] as const) {
      const { title, description } = describeAccessError(err, {
        action,
        value: 'school.edu',
      });
      expect(`${title} ${description}`).not.toMatch(/prisma/i);
    }
  });

  it('names the value in a duplicate', () => {
    const { description } = describeAccessError(PRISMA_UNIQUE, {
      action: 'grant',
      value: 'school.edu',
    });
    expect(description).toContain('school.edu');
  });

  it('titles a remove differently from a save', () => {
    const ctx = { value: 'school.edu' };
    expect(
      describeAccessError(new Error('nope'), { ...ctx, action: 'remove' })
        .title,
    ).toMatch(/remove/i);
    expect(
      describeAccessError(new Error('nope'), { ...ctx, action: 'grant' }).title,
    ).toMatch(/save/i);
  });

  it('passes a plain message through', () => {
    expect(
      describeAccessError(new Error('nope'), {
        action: 'update',
        value: 'school.edu',
      }).description,
    ).toBe('nope');
  });
});

// ── Server flag vs rules ────────────────────────────────────────────────────

describe('insiderSync', () => {
  const some = { active: domainRule('school.edu') };
  const none = { active: null };

  it.each<[string, boolean, Pick<UserAccess, 'active'>, string]>([
    ['flag and rule', true, some, 'agree'],
    ['neither', false, none, 'agree'],
    ['flag, no rule', true, none, 'server-only'],
    ['rule, no flag', false, some, 'rules-only'],
  ])('%s', (_label, server, access, expected) => {
    expect(insiderSync(server, access)).toBe(expected);
  });
});

describe('isServerInsider', () => {
  it('reads the insider_access status only', () => {
    expect(isServerInsider({ subscriptionStatus: 'insider_access' })).toBe(
      true,
    );
    expect(isServerInsider({ subscriptionStatus: 'active' })).toBe(false);
    expect(isServerInsider({ subscriptionStatus: null })).toBe(false);
  });
});

// ── Subscription filter ─────────────────────────────────────────────────────

describe('parseSubscriptionFilter', () => {
  it.each(SUBSCRIPTION_FILTERS)('keeps %j', (filter) => {
    expect(parseSubscriptionFilter(filter)).toBe(filter);
  });

  it.each([null, '', 'bogus', 'INSIDER_ACCESS'])('reads %j as all', (raw) => {
    expect(parseSubscriptionFilter(raw)).toBe('all');
  });
});

describe('matchesSubscriptionFilter', () => {
  type U = Pick<AdminUser, 'subscriptionStatus' | 'hasPaidAccess'>;
  const users: Record<string, U> = {
    paying: { subscriptionStatus: 'active', hasPaidAccess: true },
    insider: { subscriptionStatus: 'insider_access', hasPaidAccess: true },
    pastDue: { subscriptionStatus: 'past_due', hasPaidAccess: false },
    canceled: { subscriptionStatus: 'canceled', hasPaidAccess: false },
    free: { subscriptionStatus: null, hasPaidAccess: false },
  };
  const noExpired = { expired: [] };

  const expected: Record<SubscriptionFilter, string[]> = {
    all: ['paying', 'insider', 'pastDue', 'canceled', 'free'],
    active: ['paying'],
    insider_access: ['insider'],
    past_due: ['pastDue'],
    canceled: ['canceled'],
    free: ['free'],
  };

  it.each(SUBSCRIPTION_FILTERS)('filters %j', (filter) => {
    const kept = Object.entries(users)
      .filter(([, user]) => matchesSubscriptionFilter(user, filter, noExpired))
      .map(([name]) => name);
    expect(kept).toEqual(expected[filter]);
  });

  it('keeps a non-insider whose only rule has expired under insider_access', () => {
    const access = { expired: [emailRule('jane@x.com', { expiresAt: PAST })] };
    expect(
      matchesSubscriptionFilter(users.free, 'insider_access', access),
    ).toBe(true);
    expect(matchesSubscriptionFilter(users.free, 'free', access)).toBe(true);
    expect(matchesSubscriptionFilter(users.paying, 'active', access)).toBe(
      true,
    );
  });
});

describe('showsRuleRows', () => {
  it('shows rule rows only with no role filter, under all or insider_access', () => {
    expect(showsRuleRows('all', 'all')).toBe(true);
    expect(showsRuleRows('all', 'insider_access')).toBe(true);
    for (const filter of ['active', 'past_due', 'canceled', 'free'] as const) {
      expect(showsRuleRows('all', filter)).toBe(false);
    }
    expect(showsRuleRows('teacher', 'all')).toBe(false);
    expect(showsRuleRows('teacher', 'insider_access')).toBe(false);
  });
});

describe('matcher parity edge cases', () => {
  it('prefers an active domain rule over an expired one found first (multiple @)', () => {
    const expired = rule({
      id: 'd1',
      type: 'domain',
      value: 'b@c.com',
      duration: 'temporary',
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    });
    const active = rule({ id: 'd2', type: 'domain', value: 'c.com' });
    const access = rulesForUser(
      'a@b@c.com',
      indexRules([expired, active]),
      NOW,
    );
    expect(access.domain).toBe(active);
    expect(access.active).toBe(active);
  });

  it('counts accounts whose emails differ only in case as separate accounts', () => {
    const rows = ruleRows(
      [rule({ type: 'domain', value: 'school.edu' })],
      [acct('Sam@school.edu'), acct('sam@school.edu')],
      NOW,
    );
    expect(rows[0]).toMatchObject({ kind: 'domain', accountCount: 2 });
  });

  it('never puts an insider account under the Free filter', () => {
    const insiderUnpaid = {
      subscriptionStatus: 'insider_access',
      hasPaidAccess: false,
    };
    expect(
      matchesSubscriptionFilter(insiderUnpaid, 'free', { expired: [] }),
    ).toBe(false);
  });
});

describe('isUnmatchable — legacy shapes the old page could save', () => {
  it.each([
    ['email', '@school.edu'],
    ['email', 'sam@'],
    ['email', 'school.edu'],
    ['domain', 'school .edu'],
    ['domain', 'school.edu,'],
    ['domain', '@school.edu'],
  ] as const)('%s rule %j never matches', (type, value) => {
    expect(isUnmatchable({ type, value })).toBe(true);
  });

  it.each([
    ['email', 'sam@school.edu'],
    ['domain', 'school.edu'],
  ] as const)('%s rule %j is matchable', (type, value) => {
    expect(isUnmatchable({ type, value })).toBe(false);
  });
});
