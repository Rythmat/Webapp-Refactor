import { intervalToDuration } from 'date-fns';

function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function formatTimeRemaining(deadline: string | Date): string {
  const end = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  if (end.getTime() <= now.getTime()) return 'Expired';

  const {
    days = 0,
    hours = 0,
    minutes = 0,
  } = intervalToDuration({
    start: now,
    end,
  });

  const parts: string[] = [];
  if (days > 0) parts.push(pluralize(days, 'day', 'days'));
  if (hours > 0 || days > 0) parts.push(pluralize(hours, 'hour', 'hours'));
  parts.push(pluralize(Math.max(minutes, 0), 'min', 'mins'));

  return parts.join(', ');
}

export function isExpiringSoon(deadline: string | Date): boolean {
  const end = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const msRemaining = end.getTime() - Date.now();
  return msRemaining > 0 && msRemaining < 60 * 60 * 1000;
}
