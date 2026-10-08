// @vitest-environment jsdom
/**
 * Unreadable drafts are set aside, never dropped (decision D9), and a draft
 * read in another format is backed up before it is written over
 * (projectDocument/quarantine.ts).
 *
 * Run: npx vitest run src/daw/persistence/__tests__/quarantine.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateSession } from '../projectDocument/migrations';
import {
  BACKUP_LIFETIME_DAYS,
  MAX_BACKUPS_PER_USER,
  MAX_QUARANTINED_PER_USER,
  MIGRATION_BACKUP_PREFIX,
  UNREADABLE_PREFIX,
  backupBeforeMigration,
  draftContentHash,
  draftCopiesThatGiveWay,
  forgetQuarantinedDraft,
  listMigrationBackups,
  listQuarantinedDrafts,
  pruneMigrationBackups,
  quarantineDraft,
  quarantineStorageKeys,
  quarantinedChars,
  readMigrationBackup,
  readQuarantinedDraft,
  recoverableDrafts,
} from '../projectDocument/quarantine';
import { serializeSession } from '../SessionSerializer';

const AT = new Date('2026-10-07T09:00:00.000Z');
const later = (minutes: number) => new Date(AT.getTime() + minutes * 60_000);
const DAY = 24 * 60;

const stored = () =>
  Object.keys(localStorage).filter(
    (key) =>
      key.startsWith(UNREADABLE_PREFIX) ||
      key.startsWith(MIGRATION_BACKUP_PREFIX),
  );

/** A draft a newer build wrote that this one can't read. */
const fromLater = (name: string) =>
  JSON.stringify({
    ...serializeSession(),
    timestamp: 1,
    schema: 4,
    compat: 4,
    name,
  });

/** The raw content of each of `user`'s quarantined drafts, newest first. */
const contents = (user: string) =>
  listQuarantinedDrafts(user).map((d) => readQuarantinedDraft(d.key));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('quarantining a draft', () => {
  it('keeps it word for word, under its owner and the time', () => {
    const raw = '{"version": 2, "data": {"tracks": [';
    const outcome = quarantineDraft(raw, 'student-a', AT);
    const key = `${UNREADABLE_PREFIX}student-a:${draftContentHash(raw)}:2026-10-07T09:00:00.000Z`;
    expect(outcome).toEqual({ status: 'quarantined', key });
    expect(localStorage.getItem(key)).toBe(raw);
    expect(readQuarantinedDraft(key)).toBe(raw);
  });

  it('namespaces a user id as kept work does', () => {
    const outcome = quarantineDraft('x', 'a:b/c', AT);
    expect(outcome.status === 'quarantined' && outcome.key).toContain(
      `${UNREADABLE_PREFIX}a%3Ab%2Fc:`,
    );
    expect(quarantineDraft('y', null, AT)).toMatchObject({
      key: expect.stringContaining(`${UNREADABLE_PREFIX}anon:`),
    });
  });

  it('keeps the same content once, whoever set it aside', () => {
    const raw = fromLater('one');
    const first = quarantineDraft(raw, 'student-a', AT);
    expect(quarantineDraft(raw, 'student-a', later(1))).toEqual({
      status: 'already',
      key: first.status === 'quarantined' ? first.key : '',
    });
    expect(quarantineDraft(raw, 'student-b', later(2)).status).toBe('already');
    expect(stored()).toHaveLength(1);
  });

  it('finds a copy among the entries 1.1 set aside', () => {
    const legacy = `${UNREADABLE_PREFIX}2026-10-01T08:00:00.000Z`;
    localStorage.setItem(legacy, 'old raw');
    expect(quarantineDraft('old raw', 'student-a', AT)).toEqual({
      status: 'already',
      key: legacy,
    });
  });

  it('keeps its own copy of what a backup holds, since backups expire', () => {
    backupBeforeMigration('v2 raw', 'student-a', AT);
    expect(quarantineDraft('v2 raw', 'student-a', AT).status).toBe(
      'quarantined',
    );
    expect(contents('student-a')).toEqual(['v2 raw']);
  });

  it(`keeps at most ${MAX_QUARANTINED_PER_USER} per user, and drops none to make room`, () => {
    for (let i = 0; i < MAX_QUARANTINED_PER_USER; i++) {
      expect(quarantineDraft(fromLater(`n${i}`), 'a', later(i)).status).toBe(
        'quarantined',
      );
    }
    const before = stored();
    expect(quarantineDraft(fromLater('one more'), 'a', later(9))).toEqual({
      status: 'full',
    });
    expect(stored()).toEqual(before);
    // Someone else on the device still has room.
    expect(quarantineDraft(fromLater('theirs'), 'b', later(9)).status).toBe(
      'quarantined',
    );
  });

  it('at the cap, lets go of an entry one of its owner’s backups holds', () => {
    // Read and migrated since it was set aside: its backup holds it, and
    // its migrated copy is the student's work now.
    const raw = fromLater('read since');
    quarantineDraft(raw, 'a', AT);
    quarantineDraft(fromLater('n1'), 'a', later(1));
    quarantineDraft(fromLater('n2'), 'a', later(2));
    backupBeforeMigration(raw, 'a', later(3));
    expect(quarantineDraft(fromLater('n3'), 'a', later(4)).status).toBe(
      'quarantined',
    );
    expect(readMigrationBackup('a')).toBe(raw);
    expect(contents('a')).toEqual([
      fromLater('n3'),
      fromLater('n2'),
      fromLater('n1'),
    ]);
  });

  it('at the cap, lets go of nothing someone else’s backup holds', () => {
    const raw = fromLater('theirs too');
    quarantineDraft(raw, 'a', AT);
    quarantineDraft(fromLater('n1'), 'a', later(1));
    quarantineDraft(fromLater('n2'), 'a', later(2));
    backupBeforeMigration(raw, 'b', later(3));
    expect(quarantineDraft(fromLater('n3'), 'a', later(4))).toEqual({
      status: 'full',
    });
    expect(contents('a')).toContain(raw);
  });

  it('when storage is full, makes room from copies 1.1 kept twice, and nothing else', () => {
    // 1.1 set the same draft aside on every boot.
    const first = `${UNREADABLE_PREFIX}2026-10-01T08:00:00.000Z`;
    const again = `${UNREADABLE_PREFIX}2026-10-02T08:00:00.000Z`;
    const other = `${UNREADABLE_PREFIX}2026-10-03T08:00:00.000Z`;
    localStorage.setItem(first, 'set aside by 1.1');
    localStorage.setItem(again, 'set aside by 1.1');
    localStorage.setItem(other, 'another one');
    const setItem = Storage.prototype.setItem;
    let full = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (full) {
        full = false;
        throw new DOMException('full', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });
    expect(quarantineDraft('new raw', 'a', AT).status).toBe('quarantined');
    expect(localStorage.getItem(first)).toBe('set aside by 1.1');
    expect(localStorage.getItem(again)).toBeNull();
    expect(localStorage.getItem(other)).toBe('another one');
    expect(contents('a')[0]).toBe('new raw');
  });

  it('reports a failed write and leaves storage as it was', () => {
    localStorage.setItem(
      `${UNREADABLE_PREFIX}2026-10-01T08:00:00.000Z`,
      'kept once only',
    );
    const before = stored();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(quarantineDraft('raw', 'a', AT)).toEqual({ status: 'failed' });
    expect(stored()).toEqual(before);
  });

  it('never throws when storage is closed to the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(quarantineDraft('raw', 'a', AT)).toEqual({ status: 'failed' });
    expect(readMigrationBackup('a')).toBeNull();
    expect(backupBeforeMigration('raw', 'a')).toBe('failed');
    expect(() => pruneMigrationBackups()).not.toThrow();
  });
});

describe('the quarantined drafts a student sees', () => {
  it('are their own and the unowned ones from 1.1, newest first', () => {
    const legacy = `${UNREADABLE_PREFIX}2026-10-01T08:00:00.000Z`;
    localStorage.setItem(legacy, 'set aside by 1.1');
    quarantineDraft('mine, older', 'a', AT);
    quarantineDraft('theirs', 'b', later(1));
    quarantineDraft('mine, newer', 'a', later(2));
    const seen = listQuarantinedDrafts('a');
    expect(seen.map((d) => readQuarantinedDraft(d.key))).toEqual([
      'mine, newer',
      'mine, older',
      'set aside by 1.1',
    ]);
    expect(seen.map((d) => d.owner)).toEqual(['a', 'a', null]);
  });

  it('can be let go of, one by one', () => {
    const outcome = quarantineDraft('raw', 'a', AT);
    if (outcome.status !== 'quarantined') throw new Error('not kept');
    forgetQuarantinedDraft(outcome.key);
    expect(listQuarantinedDrafts('a')).toEqual([]);
    // Only quarantine keys: anything else is left alone.
    localStorage.setItem('musicAtlas:daw:autosave', 'x');
    forgetQuarantinedDraft('musicAtlas:daw:autosave');
    expect(localStorage.getItem('musicAtlas:daw:autosave')).toBe('x');
  });
});

describe('a quarantined draft this build can read now', () => {
  it('is offered to its owner, a kept slot read through to its session', () => {
    const draft = serializeSession();
    draft.data.projectName = 'Back Again';
    quarantineDraft(JSON.stringify(draft), 'a', AT);
    quarantineDraft(
      JSON.stringify({
        keptAt: AT.toISOString(),
        projectName: 'Kept One',
        session: { ...draft, data: { ...draft.data, projectName: 'Kept One' } },
      }),
      'a',
      later(1),
    );
    quarantineDraft(fromLater('still too new'), 'a', later(2));
    quarantineDraft(JSON.stringify(draft) + ' ', 'b', later(3));
    const found = recoverableDrafts('a');
    expect(found.map((d) => d.projectName)).toEqual(['Kept One', 'Back Again']);
    expect(found.every((d) => d.result.ok && d.result.from === 3)).toBe(true);
  });

  it('never when it has no owner', () => {
    localStorage.setItem(
      `${UNREADABLE_PREFIX}2026-10-01T08:00:00.000Z`,
      JSON.stringify(serializeSession()),
    );
    expect(recoverableDrafts('a')).toEqual([]);
    expect(recoverableDrafts(null)).toEqual([]);
  });
});

describe('the pre-migration backup', () => {
  it(`keeps each user’s newest ${MAX_BACKUPS_PER_USER}, the same content once`, () => {
    expect(backupBeforeMigration('first v2', 'a', AT)).toBe('written');
    expect(backupBeforeMigration('first v2', 'a', later(1))).toBe('kept');
    expect(backupBeforeMigration('second v2', 'a', later(2))).toBe('written');
    expect(backupBeforeMigration('their v2', 'b', later(3))).toBe('written');
    expect(backupBeforeMigration('third v2', 'a', later(4))).toBe('written');
    const raws = (user: string) =>
      listMigrationBackups(user).map((b) => readQuarantinedDraft(b.key));
    expect(raws('a')).toEqual(['third v2', 'second v2']);
    expect(raws('b')).toEqual(['their v2']);
    expect(readMigrationBackup('a')).toBe('third v2');
    expect(readMigrationBackup('c')).toBeNull();
    expect(listMigrationBackups('a')[0].key).toBe(
      `${MIGRATION_BACKUP_PREFIX}a:${draftContentHash('third v2')}:${later(4).toISOString()}`,
    );
  });

  it(`lets go of a backup ${BACKUP_LIFETIME_DAYS} days after it was taken`, () => {
    backupBeforeMigration('old v2', 'a', AT);
    backupBeforeMigration('their v2', 'b', later(DAY));
    pruneMigrationBackups(later(BACKUP_LIFETIME_DAYS * DAY - 1));
    expect(readMigrationBackup('a')).toBe('old v2');
    pruneMigrationBackups(later(BACKUP_LIFETIME_DAYS * DAY + 1));
    expect(readMigrationBackup('a')).toBeNull();
    expect(readMigrationBackup('b')).toBe('their v2');
    // Taking a new one lets go of the expired ones too.
    backupBeforeMigration(
      'new v2',
      'c',
      later((BACKUP_LIFETIME_DAYS + 2) * DAY),
    );
    expect(readMigrationBackup('b')).toBeNull();
  });

  it('can be read and let go of as an entry can', () => {
    backupBeforeMigration('v2', 'a', AT);
    const [backup] = listMigrationBackups('a');
    expect(readQuarantinedDraft(backup.key)).toBe('v2');
    forgetQuarantinedDraft(backup.key);
    expect(readMigrationBackup('a')).toBeNull();
  });
});

describe('their share of storage', () => {
  it('counts every entry and backup, keys included', () => {
    quarantineDraft('12345', 'a', AT);
    backupBeforeMigration('1234567890', 'a', AT);
    localStorage.setItem('musicAtlas:daw:kept:a:2026-10-07T09:00:00.000Z', 'x');
    const keys = quarantineStorageKeys();
    expect(keys).toHaveLength(2);
    expect(quarantinedChars()).toBe(
      keys.reduce((sum, key) => sum + key.length, 0) + 5 + 10,
    );
  });

  // Kept work and the autosave hold the only copy of what they hold; these
  // never do, so they give way first when either needs the room.
  it('gives up copies kept elsewhere, then backups oldest first, and never an only copy', () => {
    const only = quarantineDraft('only copy', 'a', AT);
    const twice = 'set aside twice';
    localStorage.setItem(`${UNREADABLE_PREFIX}2026-10-07T08:00:00.000Z`, twice);
    localStorage.setItem(`${UNREADABLE_PREFIX}2026-10-07T08:30:00.000Z`, twice);
    backupBeforeMigration('older v2', 'b', later(1));
    backupBeforeMigration('newer v2', 'a', later(2));

    const keys = draftCopiesThatGiveWay();
    expect(keys.map((key) => readQuarantinedDraft(key))).toEqual([
      twice,
      'older v2',
      'newer v2',
    ]);
    expect(keys[0]).toBe(`${UNREADABLE_PREFIX}2026-10-07T08:30:00.000Z`);
    expect(only.status).toBe('quarantined');
    expect(keys).not.toContain(only.status === 'quarantined' ? only.key : '');
  });
});

describe('what the quarantine is for', () => {
  it('holds a draft that migrateSession refuses, exactly as storage had it', () => {
    const raw = '{"version": 2, "data": {"tracks": [}';
    expect(migrateSession(raw)).toMatchObject({
      ok: false,
      reason: 'unparseable',
    });
    const outcome = quarantineDraft(raw, 'a', AT);
    expect(outcome.status).toBe('quarantined');
    expect(
      readQuarantinedDraft(outcome.status === 'quarantined' ? outcome.key : ''),
    ).toBe(raw);
  });
});
