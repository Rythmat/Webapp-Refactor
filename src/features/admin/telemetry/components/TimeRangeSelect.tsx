import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': 'Last 1 hour',
  '6h': 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

export function timeRangeToParams(range: TimeRange): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = now.toISOString();

  const msMap: Record<TimeRange, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const from = new Date(now.getTime() - msMap[range]).toISOString();
  return { from, to };
}

// Snapshots `from`/`to` when `range` changes so query keys stay stable across
// renders — calling `timeRangeToParams` inline produces a fresh `new Date()`
// every render, which re-keys React Query and triggers an infinite refetch.
export function useTimeRangeParams(range: TimeRange) {
  return useMemo(() => timeRangeToParams(range), [range]);
}

export const TimeRangeSelect = ({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
          <SelectItem key={key} value={key}>
            {TIME_RANGE_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
