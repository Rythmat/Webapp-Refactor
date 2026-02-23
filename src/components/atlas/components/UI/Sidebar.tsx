import * as Icons from 'lucide-react'
import { SIDEBAR_ITEMS } from '@/components/atlas/data'

function LucideIcon({ name, ...props }: { name: string } & Icons.LucideProps) {
  const IconComponent = (Icons as unknown as Record<string, Icons.LucideIcon>)[name]
  if (!IconComponent) return null
  return <IconComponent {...props} />
}

export function Sidebar() {
  return (
    <aside className="w-16 lg:w-48 flex flex-col bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800/50 py-4 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-6 flex items-center gap-2">
        <div className="w-10 h-10 border border-zinc-600 rounded-lg flex items-center justify-center">
          <Icons.Diamond className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="hidden lg:flex items-center gap-1 text-zinc-500">
          <button className="p-1 hover:text-white transition-colors">
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-white transition-colors">
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              item.id === 'atlas'
                ? 'bg-zinc-700/50 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <LucideIcon name={item.icon} className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="px-2 space-y-1 text-xs text-zinc-500">
        <button className="w-full flex items-center gap-2 px-3 py-1 hover:text-zinc-300 transition-colors">
          <Icons.Plus className="w-3 h-3" />
          <span className="hidden lg:inline">Add Credits</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-1 hover:text-zinc-300 transition-colors">
          <Icons.RefreshCw className="w-3 h-3" />
          <span className="hidden lg:inline">Update Plan</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-1 hover:text-zinc-300 transition-colors">
          <Icons.Settings className="w-3 h-3" />
          <span className="hidden lg:inline">Settings</span>
        </button>
      </div>
    </aside>
  )
}
