import { Home, User } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ClassroomRoutes } from '@/constants/routes';
import { useScrollGradient } from '@/hooks/useScrollGradient';

export const StudentLayout = (props: { fallback?: React.ReactNode }) => {
  const [mainRef, bottomGradientElement, topGradientElement] =
    useScrollGradient();
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Main content area with scroll */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-16">
        <Suspense fallback={props.fallback}>
          <Outlet />
        </Suspense>
        {bottomGradientElement}
        {topGradientElement}
      </main>

      {/* Fixed bottom navigation bar */}
      <nav className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="flex h-16 w-full items-center justify-around">
          <TabItem
            icon={<Home className="size-5" />}
            isActive={
              location.pathname.startsWith('/s/dashboard') ||
              location.pathname === '/s'
            }
            label="Home"
            to={ClassroomRoutes.picker()}
          />
          <TabItem
            icon={<User className="size-5" />}
            isActive={location.pathname.startsWith('/s/profile')}
            label="Profile"
            to={ClassroomRoutes.home({ classroomId: '1' })}
          />
        </div>
      </nav>
    </div>
  );
};

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isActive: boolean;
}

const TabItem = ({ icon, label, to }: TabItemProps) => {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center py-2',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
      to={to}
    >
      <div className="flex size-6 items-center justify-center">{icon}</div>
      <span className="mt-1 text-xs font-medium">{label}</span>
    </NavLink>
  );
};
