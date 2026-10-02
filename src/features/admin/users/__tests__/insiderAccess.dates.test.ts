import { format } from 'date-fns';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  formatRuleDate,
  isValidExpiryInput,
  minExpiryDateInputValue,
  parseDateInputValue,
  toDateInputValue,
} from '../insiderAccess';

/**
 * The server stores an expiry `YYYY-MM-DD` as midnight UTC of that day, so the
 * date helpers must read and write UTC whatever the admin's own zone is. Run
 * each case west of UTC (where local formatting shows the day before), at the
 * far east edge (UTC+14, where it shows the day after) and in UTC itself.
 */

describe.each(['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC'])(
  'in %s',
  (zone) => {
    let previousTZ: string | undefined;

    beforeAll(() => {
      previousTZ = process.env.TZ;
      process.env.TZ = zone;
    });

    afterAll(() => {
      if (previousTZ === undefined) delete process.env.TZ;
      else process.env.TZ = previousTZ;
    });

    it('runs in that zone', () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
    });

    if (zone === 'America/Los_Angeles') {
      it('shows the bug the helpers avoid: local formatting is a day early', () => {
        expect(format(new Date('2026-10-01'), 'MMM d, yyyy')).toBe(
          'Sep 30, 2026',
        );
      });
    }

    it('writes a date input value as the UTC day', () => {
      expect(toDateInputValue(new Date('2026-10-01T00:00:00Z'))).toBe(
        '2026-10-01',
      );
    });

    it('reads a date input value as midnight UTC, round-tripping', () => {
      const date = parseDateInputValue('2026-10-01');
      expect(date?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(toDateInputValue(date!)).toBe('2026-10-01');
    });

    it.each(['2026-02-30', '', '10/01/2026'])(
      'rejects the date input value %j',
      (value) => {
        expect(parseDateInputValue(value)).toBeNull();
      },
    );

    it('formats the stored UTC day', () => {
      expect(formatRuleDate(new Date('2026-10-01'))).toBe('Oct 1, 2026');
    });

    it('sets the earliest expiry to tomorrow in UTC', () => {
      expect(minExpiryDateInputValue(new Date('2026-09-29T12:00:00Z'))).toBe(
        '2026-09-30',
      );
      expect(minExpiryDateInputValue(new Date('2026-09-30T02:00:00Z'))).toBe(
        '2026-10-01',
      );
    });

    it('accepts the earliest expiry and rejects today', () => {
      const now = new Date('2026-09-29T12:00:00Z');
      expect(isValidExpiryInput(minExpiryDateInputValue(now), now)).toBe(true);
      expect(isValidExpiryInput(toDateInputValue(now), now)).toBe(false);
    });
  },
);
