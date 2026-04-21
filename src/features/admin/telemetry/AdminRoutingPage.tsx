import { format } from 'date-fns';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { useAdminRoutingAnalytics } from '@/hooks/data/admin/useAdminTelemetry';
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

export const AdminRoutingPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = timeRangeToParams(range);
  const { data, isLoading } = useAdminRoutingAnalytics(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Routing</h2>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">
          No routing data available
        </div>
      ) : (
        <>
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Page Navigations Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeSeries}>
                <defs>
                  <linearGradient
                    id="routingGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  labelFormatter={(v) => formatBucketLabel(String(v))}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#routingGradient)"
                  name="Navigations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Top Routes
            </h3>
            {data.topRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topRoutes.map((row) => (
                    <TableRow key={row.route}>
                      <TableCell className="font-mono text-sm">
                        {row.route}
                      </TableCell>
                      <TableCell>{row.count.toLocaleString()}</TableCell>
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
