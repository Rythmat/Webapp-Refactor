import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminTelemetryOverview } from '@/hooks/data/admin/useAdminTelemetry';
import { StatCard } from './components/StatCard';
import {
  TimeRangeSelect,
  useTimeRangeParams,
  type TimeRange,
} from './components/TimeRangeSelect';

export const AdminTelemetryOverviewPage = () => {
  const [range, setRange] = useState<TimeRange>('24h');
  const params = useTimeRangeParams(range);
  const { data, isLoading } = useAdminTelemetryOverview(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <TimeRangeSelect value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">
          No telemetry data available for this time range
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Events"
            value={data.totalEvents.toLocaleString()}
          />
          <StatCard
            label="API Success Rate"
            value={`${(data.apiSuccessRate * 100).toFixed(1)}%`}
            variant="success"
          />
          <StatCard
            label="API Failure Rate"
            value={`${(data.apiFailureRate * 100).toFixed(1)}%`}
            variant={data.apiFailureRate > 0.05 ? 'danger' : 'default'}
          />
          <StatCard
            label="Avg API Latency"
            value={
              data.avgApiLatencyMs != null
                ? `${Math.round(data.avgApiLatencyMs)} ms`
                : '-'
            }
          />
          <StatCard
            label="P95 API Latency"
            value={
              data.p95ApiLatencyMs != null
                ? `${Math.round(data.p95ApiLatencyMs)} ms`
                : '-'
            }
          />
          <StatCard
            label="Routing Events"
            value={data.totalRoutingEvents.toLocaleString()}
          />
          <StatCard
            label="Audio Events"
            value={data.totalAudioEvents.toLocaleString()}
          />
          <StatCard
            label="Product Events"
            value={data.totalProductEvents.toLocaleString()}
          />
          <StatCard
            label="Recent Errors"
            value={data.recentErrorCount}
            variant={data.recentErrorCount > 0 ? 'danger' : 'default'}
          />
        </div>
      )}
    </div>
  );
};
