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
import { useAdminAudioAnalytics } from '@/hooks/data/admin/useAdminTelemetry';
import { StatCard } from './components/StatCard';
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

export const AdminAudioPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = timeRangeToParams(range);
  const { data, isLoading } = useAdminAudioAnalytics(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audio / Keyboard</h2>
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

          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Audio Events Over Time
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
                  dataKey="inputCount"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Inputs"
                />
                <Line
                  type="monotone"
                  dataKey="triggerCount"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  name="Triggers"
                />
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
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Failures by Type
            </h3>
            {data.failuresByType.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No failures recorded
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Error Name</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.failuresByType.map((row) => (
                    <TableRow key={row.errorName}>
                      <TableCell className="font-mono text-sm text-red-400">
                        {row.errorName}
                      </TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Recent Audio Errors
            </h3>
            {data.recentErrors.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No recent errors
              </p>
            ) : (
              <Table>
                <TableHeader>
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
                      <TableCell className="font-mono text-sm">
                        {row.eventName}
                      </TableCell>
                      <TableCell className="text-red-400">
                        {row.errorName}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate text-muted-foreground"
                        title={row.errorMessage}
                      >
                        {row.errorMessage}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.route}
                      </TableCell>
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
