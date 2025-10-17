import { NavLink } from 'react-router-dom';
import { cn } from '@/components/utilities';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
};

export function SidebarSecondaryNavItem(
  props: Omit<NavItemProps, 'icon'> & {
    external?: boolean;
  },
) {
  return (
    <li className="overflow-hidden whitespace-nowrap">
      {props.external ? (
        <a
          className="block py-1 pr-4 text-foreground/60 hover:text-primary"
          href={props.to}
          rel="noreferrer"
          target="_blank"
        >
          {props.label}
        </a>
      ) : (
        <NavLink
          className={({ isActive }) =>
            cn('block py-1 pr-4 text-zinc-500 hover:text-zinc-800', {
              'text-zinc-800': isActive,
            })
          }
          to={props.to}
        >
          {props.label}
        </NavLink>
      )}
    </li>
  );
}
