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
import { useAdminApiPerformance } from '@/hooks/data/admin/useAdminTelemetry';
import { ConsoleSectionTitle } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL, CONSOLE_PANEL, CONSOLE_TABLE_HEAD } from '../ui/styles';
import {
  CHART_SERIES,
  chartAxisProps,
  chartGridProps,
  chartLegendProps,
  chartTooltipProps,
} from './chartTheme';
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

export const AdminApiPerformancePage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = useTimeRangeParams(range);
  const { data, isLoading } = useAdminApiPerformance(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ConsoleSectionTitle>API Performance</ConsoleSectionTitle>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">
          No API performance data available
        </div>
      ) : (
        <>
          {/* Request counts chart */}
          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>
              Request Count Over Time
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
                <Line
                  type="monotone"
                  dataKey="requestCount"
                  stroke={CHART_SERIES.blue}
                  strokeWidth={2}
                  dot={false}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Latency chart */}
          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Latency Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  {...chartAxisProps}
                  dataKey="bucket"
                  tickFormatter={formatBucketLabel}
                />
                <YAxis {...chartAxisProps} unit=" ms" />
                <RechartsTooltip
                  {...chartTooltipProps}
                  labelFormatter={(v) => formatBucketLabel(String(v))}
                />
                <Legend {...chartLegendProps} />
                <Line
                  type="monotone"
                  dataKey="avgLatencyMs"
                  stroke={CHART_SERIES.amber}
                  strokeWidth={2}
                  dot={false}
                  name="Avg Latency (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="p95LatencyMs"
                  stroke={CHART_SERIES.violet}
                  strokeWidth={2}
                  dot={false}
                  name="P95 Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Slowest routes table */}
          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Slowest Routes</h3>
            {data.slowestRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Avg Latency</TableHead>
                    <TableHead>P95 Latency</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slowestRoutes.map((row) => (
                    <TableRow key={row.route}>
                      <TableCell className="text-sm">{row.route}</TableCell>
                      <TableCell>{Math.round(row.avgLatencyMs)} ms</TableCell>
                      <TableCell>{Math.round(row.p95LatencyMs)} ms</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Failing routes table */}
          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Most Failing Routes</h3>
            {data.failingRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Failure Rate</TableHead>
                    <TableHead>Total Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.failingRoutes.map((row) => (
                    <TableRow key={row.route}>
                      <TableCell className="text-sm">{row.route}</TableCell>
                      <TableCell className="text-red-400">
                        {row.failureCount}
                      </TableCell>
                      <TableCell className="text-red-400">
                        {(row.failureRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
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
