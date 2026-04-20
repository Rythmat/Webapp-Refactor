import { format } from 'date-fns';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminTelemetryErrors } from '@/hooks/data/admin/useAdminTelemetry';
import {
  TimeRangeSelect,
  timeRangeToParams,
  type TimeRange,
} from './components/TimeRangeSelect';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'api', label: 'API' },
  { value: 'audio', label: 'Audio' },
  { value: 'routing', label: 'Routing' },
  { value: 'product', label: 'Product' },
];

function TruncatedCell({ text, maxWidth = 200 }: { text: string; maxWidth?: number }) {
  if (text.length <= 40) {
    return <span>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="block truncate"
            style={{ maxWidth }}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="whitespace-pre-wrap text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const AdminErrorsPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const [category, setCategory] = useState('all');
  const params = timeRangeToParams(range);

  const { data, isLoading } = useAdminTelemetryErrors({
    ...params,
    category: category !== 'all' ? category : undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Errors</h2>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimeRangeSelect value={range} onChange={setRange} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data || data.errors.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No errors found for this time range
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Lesson / Activity</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Trace ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.errors.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(row.timestamp), 'MMM d HH:mm:ss')}
                    </TableCell>
                    <TableCell className="capitalize">{row.category}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.eventName}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {row.route ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lessonId || row.activityId
                        ? `${row.lessonId ?? ''}${row.activityId ? ` / ${row.activityId}` : ''}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-red-400">
                      {row.errorName}
                    </TableCell>
                    <TableCell>
                      <TruncatedCell text={row.errorMessage} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.userId ? row.userId.slice(0, 8) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.traceId ? row.traceId.slice(0, 8) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-muted-foreground">
            {data.errors.length} error{data.errors.length !== 1 ? 's' : ''} shown
          </div>
        </>
      )}
    </div>
  );
};
