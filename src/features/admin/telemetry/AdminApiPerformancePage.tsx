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
import { useAdminApiPerformance } from '@/hooks/data/admin/useAdminTelemetry';
import {
  TimeRangeSelect,
  timeRangeToParams,
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
  const params = timeRangeToParams(range);
  const { data, isLoading } = useAdminApiPerformance(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">API Performance</h2>
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
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Request Count Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="bucket"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickFormatter={formatBucketLabel}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'white' }}
                  itemStyle={{ color: 'white' }}
                  labelFormatter={formatBucketLabel}
                />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Line
                  type="monotone"
                  dataKey="successCount"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Success"
                />
                <Line
                  type="monotone"
                  dataKey="failureCount"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={false}
                  name="Failure"
                />
                <Line
                  type="monotone"
                  dataKey="requestCount"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Latency chart */}
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Latency Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="bucket"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  tickFormatter={formatBucketLabel}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  unit=" ms"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'white' }}
                  itemStyle={{ color: 'white' }}
                  labelFormatter={formatBucketLabel}
                />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                <Line
                  type="monotone"
                  dataKey="avgLatencyMs"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Latency (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="p95LatencyMs"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name="P95 Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Slowest routes table */}
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Slowest Routes
            </h3>
            {data.slowestRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader>
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
                      <TableCell className="font-mono text-sm">
                        {row.route}
                      </TableCell>
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
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Most Failing Routes
            </h3>
            {data.failingRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader>
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
                      <TableCell className="font-mono text-sm">
                        {row.route}
                      </TableCell>
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
