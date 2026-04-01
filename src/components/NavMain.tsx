import { type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Collapsible } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from './utilities';

export function NavMain({
  title,
  items,
}: {
  title?: string;
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    comingSoon?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  return (
    <SidebarGroup>
      {title && (
        <h2 className="pb-2 pl-2 text-sm font-medium text-muted-foreground">
          {title}
        </h2>
      )}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            className="group/collapsible"
            defaultOpen={isActive(item.url)}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={
                  item.comingSoon ? `${item.title} (Coming Soon)` : item.title
                }
              >
                <Link
                  className={cn(
                    item.comingSoon && 'pointer-events-none opacity-50',
                    isActive(item.url) && 'bg-zinc-200',
                  )}
                  to={item.url}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
