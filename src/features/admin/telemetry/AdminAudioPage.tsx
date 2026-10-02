import { format } from 'date-fns';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/components/utilities';
import { useAdminAudioAnalytics } from '@/hooks/data/admin/useAdminTelemetry';
import { ConsoleSectionTitle } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL, CONSOLE_PANEL, CONSOLE_TABLE_HEAD } from '../ui/styles';
import {
  CHART_SERIES,
  chartAxisProps,
  chartGridProps,
  chartLegendProps,
  chartTooltipProps,
} from './chartTheme';
import { StatCard } from './components/StatCard';
import {
  TimeRangeSelect,
  useTimeRangeParams,
  type TimeRange,
} from './components/TimeRangeSelect';

function formatBucketLabel(v: string): string {
  try {
    return format(new Date(v), 'MMM d HH:mm');
  } catch {
    return v;
  }
}

export const AdminAudioPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = useTimeRangeParams(range);
  const { data, isLoading } = useAdminAudioAnalytics(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ConsoleSectionTitle>Audio / Keyboard</ConsoleSectionTitle>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-64 rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">
          No audio data available
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Avg Keyboard-to-Audio Latency"
              value={`${Math.round(data.avgLatencyMs)} ms`}
            />
          </div>

          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>
              Audio Events Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  {...chartAxisProps}
                  dataKey="bucket"
                  tickFormatter={formatBucketLabel}
                />
                <YAxis {...chartAxisProps} />
                <RechartsTooltip
                  {...chartTooltipProps}
                  labelFormatter={(v) => formatBucketLabel(String(v))}
                />
                <Legend {...chartLegendProps} />
                <Line
                  type="monotone"
                  dataKey="inputCount"
                  stroke={CHART_SERIES.blue}
                  strokeWidth={2}
                  dot={false}
                  name="Inputs"
                />
                <Line
                  type="monotone"
                  dataKey="triggerCount"
                  stroke={CHART_SERIES.amber}
                  strokeWidth={2}
                  dot={false}
                  name="Triggers"
                />
                <Line
                  type="monotone"
                  dataKey="successCount"
                  stroke={CHART_SERIES.green}
                  strokeWidth={2}
                  dot={false}
                  name="Success"
                />
                <Line
                  type="monotone"
                  dataKey="failureCount"
                  stroke={CHART_SERIES.red}
                  strokeWidth={2}
                  dot={false}
                  name="Failure"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Failures by Type</h3>
            {data.failuresByType.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No failures recorded
              </p>
            ) : (
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Error Name</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.failuresByType.map((row) => (
                    <TableRow key={row.errorName}>
                      <TableCell className="text-sm text-red-400">
                        {row.errorName}
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Recent Audio Errors</h3>
            {data.recentErrors.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No recent errors
              </p>
            ) : (
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Route</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentErrors.map((row, idx) => (
                    <TableRow key={`${row.timestamp}-${idx}`}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(row.timestamp), 'MMM d HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm">{row.eventName}</TableCell>
                      <TableCell className="text-red-400">
                        {row.errorName}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate text-muted-foreground"
                        title={row.errorMessage}
                      >
                        {row.errorMessage}
                      </TableCell>
                      <TableCell className="text-sm">{row.route}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
