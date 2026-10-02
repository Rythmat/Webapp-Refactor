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
import { cn } from '@/components/utilities';
import { useAdminRoutingAnalytics } from '@/hooks/data/admin/useAdminTelemetry';
import { ConsoleSectionTitle } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL, CONSOLE_PANEL, CONSOLE_TABLE_HEAD } from '../ui/styles';
import {
  CHART_SERIES,
  chartAxisProps,
  chartGridProps,
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

export const AdminRoutingPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = useTimeRangeParams(range);
  const { data, isLoading } = useAdminRoutingAnalytics(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ConsoleSectionTitle>Routing</ConsoleSectionTitle>
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
          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>
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
                    <stop
                      offset="5%"
                      stopColor={CHART_SERIES.blue}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_SERIES.blue}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_SERIES.blue}
                  strokeWidth={2}
                  fill="url(#routingGradient)"
                  name="Navigations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className={cn(CONSOLE_PANEL, 'p-4')}>
            <h3 className={cn(CONSOLE_LABEL, 'mb-4')}>Top Routes</h3>
            {data.topRoutes.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topRoutes.map((row) => (
                    <TableRow key={row.route}>
                      <TableCell className="text-sm">{row.route}</TableCell>
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
