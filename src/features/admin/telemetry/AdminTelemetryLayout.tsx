import { Outlet } from 'react-router-dom';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { ConsoleTabs } from '../ui/ConsoleTabs';

const tabs = [
  { label: 'Overview', to: '/console/telemetry', end: true },
  { label: 'API Performance', to: '/console/telemetry/api' },
  { label: 'Routing', to: '/console/telemetry/routing' },
  { label: 'Audio', to: '/console/telemetry/audio' },
  { label: 'Product Funnel', to: '/console/telemetry/product' },
  { label: 'Errors', to: '/console/telemetry/errors' },
  { label: 'Database', to: '/console/telemetry/database' },
];

export const AdminTelemetryLayout = () => {
  return (
    <div className="animate-fade-in-bottom space-y-6">
      <ConsolePageHeader
        title="Telemetry"
        description="Monitor application performance and usage"
      />

      <ConsoleTabs items={tabs} />

      <Outlet />
    </div>
  );
};
