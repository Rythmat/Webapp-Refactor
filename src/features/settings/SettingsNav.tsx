import {
  CreditCard,
  Info,
  LifeBuoy,
  type LucideIcon,
  Piano,
  Settings2,
  Sliders,
  Volume2,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/components/utilities';

interface NavItem {
  slug: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const SETTINGS_ROOT = '/settings';

const GROUPS: NavGroup[] = [
  {
    title: 'Account',
    items: [
      { slug: 'account', label: 'Account', icon: Settings2 },
      { slug: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { slug: 'audio', label: 'Audio', icon: Volume2 },
      { slug: 'look-and-feel', label: 'Look & Feel', icon: Sliders },
      { slug: 'midi', label: 'MIDI', icon: Piano },
    ],
  },
  {
    title: 'Support',
    items: [
      { slug: 'help', label: 'Help', icon: LifeBuoy },
      { slug: 'about', label: 'About', icon: Info },
    ],
  },
];

/**
 * Grouped left-nav for the Settings hub. Each item links to a sub-route
 * under /home/user/settings/*; the active pill styling comes from NavLink's
 * className callback.
 */
export const SettingsNav = () => {
  return (
    <nav
      aria-label="Settings navigation"
      className="hidden w-[240px] flex-shrink-0 flex-col gap-6 border-r border-white/[0.06] p-6 md:flex"
    >
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <div className="px-3 text-xs uppercase tracking-wider text-white/50">
            {group.title}
          </div>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.slug}>
                <NavLink
                  to={`${SETTINGS_ROOT}/${item.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      isActive
                        ? 'bg-white/5 font-medium text-white'
                        : 'text-white/80 hover:bg-white/[0.03] hover:text-white',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};
