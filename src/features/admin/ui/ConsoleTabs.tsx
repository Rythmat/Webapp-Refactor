import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { consoleTabClass } from './styles';

/** Route tabs as landing step pills. */
export const ConsoleTabs = ({
  items,
  className,
}: {
  items: { to: string; label: ReactNode; end?: boolean }[];
  className?: string;
}) => (
  <nav className={cn('flex flex-wrap gap-2', className)}>
    {items.map((item) => (
      <NavLink
        key={item.to}
        className={({ isActive }) => consoleTabClass(isActive)}
        end={item.end}
        to={item.to}
      >
        {item.label}
      </NavLink>
    ))}
  </nav>
);
