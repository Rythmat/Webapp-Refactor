import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useAdminProductFunnel } from '@/hooks/data/admin/useAdminTelemetry';
import {
  TimeRangeSelect,
  useTimeRangeParams,
  type TimeRange,
} from './components/TimeRangeSelect';

export const AdminProductFunnelPage = () => {
  const [range, setRange] = useState<TimeRange>('7d');
  const params = useTimeRangeParams(range);
  const { data, isLoading } = useAdminProductFunnel(params);

  const learningFunnelData = data
    ? [
        { name: 'Lesson Started', value: data.learningFunnel.lessonStarted },
        {
          name: 'Activity Started',
          value: data.learningFunnel.activityStarted,
        },
        {
          name: 'Activity Completed',
          value: data.learningFunnel.activityCompleted,
        },
        {
          name: 'Lesson Completed',
          value: data.learningFunnel.lessonCompleted,
        },
      ]
    : [];

  const activityFailedData = data
    ? [{ name: 'Activity Failed', value: data.learningFunnel.activityFailed }]
    : [];

  const subscriptionFunnelData = data
    ? [
        {
          name: 'Paywall Viewed',
          value: data.subscriptionFunnel.paywallViewed,
        },
        {
          name: 'Checkout Started',
          value: data.subscriptionFunnel.checkoutStarted,
        },
        {
          name: 'Subscription Activated',
          value: data.subscriptionFunnel.subscriptionActivated,
        },
      ]
    : [];

  const LEARNING_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#34d399'];
  const SUBSCRIPTION_COLORS = ['#fbbf24', '#60a5fa', '#34d399'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Product Funnel</h2>
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
          No product funnel data available
        </div>
      ) : (
        <>
          {/* Learning Funnel */}
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Learning Funnel
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={learningFunnelData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
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
                />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {learningFunnelData.map((_, index) => (
                    <Cell key={index} fill={LEARNING_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {activityFailedData[0] && activityFailedData[0].value > 0 && (
              <p className="mt-2 text-sm text-red-400">
                Activity Failed: {activityFailedData[0].value.toLocaleString()}
              </p>
            )}
          </Card>

          {/* Subscription Funnel */}
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Subscription Funnel
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subscriptionFunnelData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
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
                />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {subscriptionFunnelData.map((_, index) => (
                    <Cell key={index} fill={SUBSCRIPTION_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Per-lesson stats */}
          <Card className="border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Per-Lesson Stats
            </h3>
            {data.perLessonStats.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lesson ID</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Failure Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.perLessonStats.map((row) => (
                    <TableRow key={row.lessonId}>
                      <TableCell className="font-mono text-sm">
                        {row.lessonId}
                      </TableCell>
                      <TableCell>{row.started}</TableCell>
                      <TableCell>{row.completed}</TableCell>
                      <TableCell
                        className={row.failureRate > 0.2 ? 'text-red-400' : ''}
                      >
                        {(row.failureRate * 100).toFixed(1)}%
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
