import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { label: 'Overview', path: '/console/telemetry' },
  { label: 'API Performance', path: '/console/telemetry/api' },
  { label: 'Routing', path: '/console/telemetry/routing' },
  { label: 'Audio', path: '/console/telemetry/audio' },
  { label: 'Product Funnel', path: '/console/telemetry/product' },
  { label: 'Errors', path: '/console/telemetry/errors' },
];

export const AdminTelemetryLayout = () => {
  return (
    <div className="animate-fade-in-bottom space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Telemetry</h1>
        <p className="text-muted-foreground">
          Monitor application performance and usage
        </p>
      </div>

      <nav className="flex gap-1 border-b border-white/10 pb-px">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/console/telemetry'}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-white text-white'
                  : 'text-muted-foreground hover:text-white'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};
