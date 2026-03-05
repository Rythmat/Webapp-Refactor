import { useRef, useState } from 'react';
import { Zap, Plus, Info, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

// ── PrismLogo (gradient triangle) ────────────────────────────────────────

function PrismLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 4L5 18h14L12 4z" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface DawDockProps {
  mixerOpen: boolean;
  prismOpen: boolean;
  addTrackOpen: boolean;
  fxOpen: boolean;
  infoOpen: boolean;
  controlsOpen: boolean;
  onMixerToggle: () => void;
  onPrismToggle: () => void;
  onAddTrackToggle: () => void;
  onFxToggle: () => void;
  onInfoToggle: () => void;
  onControlsToggle: () => void;
}

// ── Dock icon with magnification ─────────────────────────────────────────

function DockIcon({
  mouseX,
  item,
}: {
  mouseX: MotionValue<number>;
  item: DockItem;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 150;
    return val - rect.x - rect.width / 2;
  });

  const sizeTransform = useTransform(distance, [-100, 0, 100], [40, 52, 40]);
  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 200,
    damping: 12,
  });

  return (
    <motion.button
      ref={ref}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center rounded-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={item.onClick}
      whileTap={{ scale: 0.85 }}
    >
      {/* Background highlight */}
      <div
        className="absolute inset-0 rounded-xl transition-colors duration-150"
        style={{
          backgroundColor: item.active
            ? 'rgba(255, 255, 255, 0.12)'
            : hovered
              ? 'rgba(255, 255, 255, 0.06)'
              : 'transparent',
        }}
      />

      {/* Icon */}
      <div
        className="relative z-10"
        style={{ color: item.active ? '#e8e8f0' : '#6b6b80' }}
      >
        {item.icon}
      </div>

      {/* Tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px]"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#e8e8f0',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {item.label}
        </motion.div>
      )}
    </motion.button>
  );
}

// ── DawDock ──────────────────────────────────────────────────────────────

export function DawDock({
  mixerOpen,
  prismOpen,
  addTrackOpen,
  fxOpen,
  infoOpen,
  controlsOpen,
  onMixerToggle,
  onPrismToggle,
  onAddTrackToggle,
  onFxToggle,
  onInfoToggle,
  onControlsToggle,
}: DawDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass-panel flex items-center gap-1 rounded-2xl px-2 py-1.5"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
      >
        {/* Add Track */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'add-track',
            icon: <Plus size={18} strokeWidth={1.5} />,
            label: 'Add Track',
            active: addTrackOpen,
            onClick: onAddTrackToggle,
          }}
        />

        <div
          className="mx-1 h-8 w-px shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* Controls */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'controls',
            icon: <Zap size={18} strokeWidth={1.5} />,
            label: 'Controls',
            active: controlsOpen,
            onClick: onControlsToggle,
          }}
        />

        {/* FX */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'fx',
            icon: <Sparkles size={18} strokeWidth={1.5} />,
            label: 'FX',
            active: fxOpen,
            onClick: onFxToggle,
          }}
        />

        {/* Prism */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'prism',
            icon: <PrismLogo size={18} />,
            label: 'Prism',
            active: prismOpen,
            onClick: onPrismToggle,
          }}
        />

        <div
          className="mx-1 h-8 w-px shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* Info */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'info',
            icon: <Info size={18} strokeWidth={1.5} />,
            label: 'Info',
            active: infoOpen,
            onClick: onInfoToggle,
          }}
        />

        <div
          className="mx-1 h-8 w-px shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* Mixer */}
        <DockIcon
          mouseX={mouseX}
          item={{
            id: 'mixer',
            icon: <SlidersHorizontal size={18} strokeWidth={1.5} />,
            label: 'Mixer',
            active: mixerOpen,
            onClick: onMixerToggle,
          }}
        />
      </motion.div>

      {/* Reflection effect */}
      <div
        className="mx-auto mt-0.5 h-1 w-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
