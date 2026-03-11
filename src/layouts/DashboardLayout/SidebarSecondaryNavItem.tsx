import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';

type NavItemProps = {
  to: string;
  label: string;
  icon?: LucideIcon;
  external?: boolean;
  isCollapsed?: boolean;
};

export function SidebarSecondaryNavItem(props: NavItemProps) {
  const Icon = props.icon;

  if (props.isCollapsed && Icon) {
    const linkContent = (
      <span className="flex size-6 items-center justify-center">
        <Icon className="h-5 w-5 text-foreground/60 transition-colors hover:text-white" />
      </span>
    );

    return (
      <li className="flex justify-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {props.external ? (
                <a
                  className="flex items-center justify-center rounded-md py-2"
                  href={props.to}
                  rel="noreferrer"
                  target="_blank"
                >
                  {linkContent}
                </a>
              ) : (
                <NavLink
                  className="flex items-center justify-center rounded-md py-2"
                  to={props.to}
                >
                  {linkContent}
                </NavLink>
              )}
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] text-white shadow-2xl"
            >
              {props.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </li>
    );
  }

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
