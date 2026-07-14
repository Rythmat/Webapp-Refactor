import * as Icons from 'lucide-react';
import { SIDEBAR_ITEMS } from '@/components/atlas/data';

function LucideIcon({ name, ...props }: { name: string } & Icons.LucideProps) {
  const IconComponent = (Icons as unknown as Record<string, Icons.LucideIcon>)[
    name
  ];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}

export function Sidebar() {
  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-white/10 bg-black/20 py-4 backdrop-blur-md lg:w-48">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-white/15">
          <Icons.Diamond className="size-5 text-white/60" />
        </div>
        <div className="hidden items-center gap-1 text-white/40 lg:flex">
          <button className="p-1 transition-colors hover:text-white">
            <Icons.ChevronLeft className="size-4" />
          </button>
          <button className="p-1 transition-colors hover:text-white">
            <Icons.ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              item.id === 'atlas'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LucideIcon className="size-4 shrink-0" name={item.icon} />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="space-y-1 px-2 text-xs text-white/40">
        <button className="flex w-full items-center gap-2 px-3 py-1 transition-colors hover:text-white">
          <Icons.Plus className="size-3" />
          <span className="hidden lg:inline">Add Credits</span>
        </button>
        <button className="flex w-full items-center gap-2 px-3 py-1 transition-colors hover:text-white">
          <Icons.RefreshCw className="size-3" />
          <span className="hidden lg:inline">Update Plan</span>
        </button>
        <button className="flex w-full items-center gap-2 px-3 py-1 transition-colors hover:text-white">
          <Icons.Settings className="size-3" />
          <span className="hidden lg:inline">Settings</span>
        </button>
      </div>
    </aside>
  );
}
