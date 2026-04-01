/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import {
  CheckCircle,
  Info,
  AlertCircle,
  Settings,
  MousePointer2,
  Play,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ITEMS, LEVELS } from './data';
import {
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_CLIP_PATH,
  HORIZ_STEP,
  VERT_STEP,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  POWER_RAIL_Y,
  CABLE_COLOR_MAP,
  getHexPos,
  pixelToHex,
  findHexPath,
} from './hexGrid';
import type {
  Item,
  Slot,
  Connection,
  Level,
  SlotStatus,
  ConnectionStatus,
  GameState,
} from './types';

// --- Sub-Components ---

// Renders an icon from an Item (component ref, not JSX element)
function ItemIcon({ item, size = 20 }: { item: Item; size?: number }) {
  const Icon = item.icon;
  return (
    <Icon
      size={item.iconSize ?? size}
      fill={item.iconFill}
      className={item.iconClassName}
    />
  );
}

// Level Select Screen
const LevelSelectScreen = ({
  levels,
  onSelect,
}: {
  levels: Level[];
  onSelect: (id: number) => void;
}) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
    <div className="max-w-5xl w-full">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-6 ring-1 ring-indigo-500/30">
          <Settings size={48} className="text-indigo-500" />
        </div>
        <h1
          className="text-4xl font-bold mb-3 tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          Signal Flow Trainer
        </h1>
        <p
          className="text-lg max-w-lg mx-auto"
          style={{ color: 'var(--color-text-secondary, #a1a1aa)' }}
        >
          Select a mission to begin your certification. Master the signal path
          from source to destination.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level, idx) => (
          <button
            key={level.id}
            onClick={() => onSelect(idx)}
            className="group relative bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-6 text-left transition-all hover:bg-zinc-800/80 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 group-hover:border-indigo-500/30 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors font-mono font-bold text-lg">
                {level.id}
              </div>
              <div className="p-2 rounded-full bg-zinc-950 text-zinc-600 group-hover:text-indigo-500 transition-colors">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
              {level.title}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {level.brief}
            </p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Hex Tile
interface HexTileProps {
  x: number;
  y: number;
  tileType: 'background' | 'slot';
  status?: SlotStatus;
  item?: Item;
  label?: string;
  onClick?: () => void;
  onDrop?: (droppedItemId: string) => void;
}

const HexTile: React.FC<HexTileProps> = ({
  x,
  y,
  tileType,
  status,
  item,
  label,
  onClick,
  onDrop,
}) => {
  const style = { left: x, top: y, width: HEX_WIDTH, height: HEX_HEIGHT };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) onDrop(e.dataTransfer.getData('text/plain'));
  };

  if (tileType === 'background') {
    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={style}
      >
        <div
          className="w-full h-full bg-zinc-800/40"
          style={{ clipPath: HEX_CLIP_PATH }}
        />
        <div
          className="absolute inset-px bg-zinc-900/90"
          style={{ clipPath: HEX_CLIP_PATH }}
        />
      </div>
    );
  }

  const isFilled = status === 'filled' && item;
  const isHighlight = status === 'highlight';
  const isTarget = status === 'target';

  let bgColorClass = 'bg-zinc-800';
  let content: React.ReactNode = null;

  if (isFilled) {
    bgColorClass = 'bg-zinc-800 border-zinc-600';
    content = (
      <>
        <div className="text-zinc-200 mb-1 transform scale-110">
          <ItemIcon item={item} />
        </div>
        <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wide leading-tight px-1 text-center line-clamp-2">
          {item.name}
        </div>
        <div className="absolute bottom-4 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
      </>
    );
  } else {
    bgColorClass = isHighlight
      ? 'bg-indigo-500/20'
      : isTarget
        ? 'bg-white/10'
        : 'bg-zinc-800/80 hover:bg-zinc-800';
    content = (
      <div
        className={`flex flex-col items-center gap-1 ${isHighlight ? 'text-indigo-300' : isTarget ? 'text-white' : 'text-zinc-600'}`}
      >
        {isHighlight ? (
          <CheckCircle size={18} className="animate-bounce" />
        ) : isTarget ? (
          <MousePointer2 size={18} className="animate-bounce" />
        ) : (
          <div className="text-[10px] opacity-40">OPEN</div>
        )}
        <span className="text-[9px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
    );
  }

  let borderClass = 'bg-zinc-700';
  if (isHighlight) borderClass = 'bg-indigo-500';
  if (isFilled) borderClass = 'bg-zinc-600';
  if (isTarget) borderClass = 'bg-white animate-pulse';

  const glow =
    isHighlight || isTarget
      ? 'drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]'
      : 'drop-shadow-xl';

  return (
    <div
      onClick={onClick}
      onDragOver={!isFilled ? handleDragOver : undefined}
      onDrop={!isFilled ? handleDrop : undefined}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group z-10 transition-transform active:scale-95 hover:z-20 ${isFilled ? '' : 'hover:scale-105'}`}
      style={style}
    >
      <div
        className={`w-full h-full absolute transition-all duration-300 ${glow}`}
      >
        <div
          className={`absolute inset-0 transition-colors ${borderClass}`}
          style={{ clipPath: HEX_CLIP_PATH }}
        />
        <div
          className={`absolute inset-[2px] flex flex-col items-center justify-center p-2 transition-colors ${bgColorClass}`}
          style={{ clipPath: HEX_CLIP_PATH }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

// Background hex pattern — renders in board space using getHexPos for perfect alignment with slots.
// Extends beyond the board boundaries to fill the entire wrapper area.
const HexBoardBackground = React.memo(
  ({
    wrapperWidth,
    wrapperHeight,
    boardScale,
    boardOffsetX,
    boardOffsetY,
  }: {
    wrapperWidth: number;
    wrapperHeight: number;
    boardScale: number;
    boardOffsetX: number;
    boardOffsetY: number;
  }) => {
    if (wrapperWidth === 0 || boardScale === 0) return null;

    // Map wrapper edges into board-space coordinates
    const left = -boardOffsetX / boardScale;
    const top = -boardOffsetY / boardScale;
    const right = (wrapperWidth - boardOffsetX) / boardScale;
    const bottom = (wrapperHeight - boardOffsetY) / boardScale;

    // Convert to grid col/row range (with margin)
    const minCol = Math.floor(left / HORIZ_STEP) - 1;
    const maxCol = Math.ceil(right / HORIZ_STEP) + 1;
    const minRow = Math.floor(top / VERT_STEP) - 1;
    const maxRow = Math.ceil(bottom / VERT_STEP) + 1;

    const tiles = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const pos = getHexPos(c, r);
        tiles.push(
          <HexTile
            key={`bg-${c}-${r}`}
            x={pos.x}
            y={pos.y}
            tileType="background"
          />,
        );
      }
    }
    return <div className="absolute inset-0">{tiles}</div>;
  },
);
HexBoardBackground.displayName = 'HexBoardBackground';

// Jack Point (visual node on cable midpoint)
interface JackPointProps {
  status: ConnectionStatus;
  onClick: () => void;
  onDrop?: (droppedId: string) => void;
  cableType: string;
}

const JackPoint: React.FC<JackPointProps> = ({
  status,
  onClick,
  onDrop,
  cableType,
}) => {
  const baseColor = status === 'connected' ? 'bg-zinc-800' : 'bg-zinc-900';
  let borderColorClass = 'bg-zinc-600';
  if (status === 'connected') {
    if (cableType === 'iec_cable') borderColorClass = 'bg-amber-500';
    else if (cableType === 'snake_multi') borderColorClass = 'bg-purple-500';
    else borderColorClass = 'bg-indigo-500';
  } else if (status === 'highlight') {
    borderColorClass = 'bg-indigo-400';
  } else if (status === 'target') {
    borderColorClass = 'bg-white animate-pulse';
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) onDrop(e.dataTransfer.getData('text/plain'));
  };

  return (
    <div
      onClick={onClick}
      onDragOver={status !== 'connected' ? handleDragOver : undefined}
      onDrop={status !== 'connected' ? handleDrop : undefined}
      className="w-8 h-8 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-30 drop-shadow-lg group"
      role="button"
    >
      <div
        className={`absolute inset-0 ${borderColorClass} transition-colors ${status === 'highlight' ? 'animate-pulse' : ''}`}
        style={{ clipPath: HEX_CLIP_PATH }}
      />
      <div
        className={`absolute inset-[2px] ${baseColor}`}
        style={{ clipPath: HEX_CLIP_PATH }}
      />
      <div
        className={`relative w-2 h-2 rounded-full ${status === 'connected' ? 'bg-white' : 'bg-zinc-700'}`}
      />
    </div>
  );
};

// Cable Route (SVG path + midpoint jack)
interface CableRouteProps {
  connection: Connection;
  slots: Slot[];
  status: ConnectionStatus;
  onClick: () => void;
  onDrop: (droppedId: string) => void;
}

const CableRoute: React.FC<CableRouteProps> = ({
  connection,
  slots,
  status,
  onClick,
  onDrop,
}) => {
  if (status === 'locked') return null;

  const fromSlot = slots.find((s) => s.id === connection.from);
  if (!fromSlot) return null;

  const startPos = getHexPos(fromSlot.col, fromSlot.row);

  // Build waypoints along hex grid edges via BFS pathfinding
  let waypoints: { x: number; y: number }[];

  if (connection.to === 'POWER') {
    // Power cables: route down through hex grid, then straight to power rail
    const startHex = { col: fromSlot.col, row: fromSlot.row };
    const endHex = pixelToHex(startPos.x, POWER_RAIL_Y);
    const hexPath = findHexPath(
      startHex.col,
      startHex.row,
      endHex.col,
      endHex.row,
    );
    waypoints = hexPath.map((h) => getHexPos(h.col, h.row));
    waypoints.push({ x: startPos.x, y: POWER_RAIL_Y });
  } else {
    const toSlot = slots.find((s) => s.id === connection.to);
    if (!toSlot) return null;
    const hexPath = findHexPath(
      fromSlot.col,
      fromSlot.row,
      toSlot.col,
      toSlot.row,
    );
    waypoints = hexPath.map((h) => getHexPos(h.col, h.row));
  }

  // Jack point at the middle waypoint
  const jackIdx = Math.floor(waypoints.length / 2);
  const jackPos = waypoints[jackIdx];

  const targetColor = CABLE_COLOR_MAP[connection.required] || '#cbd5e1';
  const strokeColor = status === 'connected' ? targetColor : '#52525b';

  // SVG polyline path through hex centers
  const path = waypoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={
            status === 'connected'
              ? connection.required === 'snake_multi'
                ? '6'
                : '4'
              : '2'
          }
          strokeDasharray={status === 'connected' ? '0' : '6,6'}
          opacity={status === 'connected' ? 0.9 : 0.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {status === 'connected' && connection.required !== 'iec_cable' && (
          <circle r="3" fill="white">
            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </svg>
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
        style={{ left: `${jackPos.x}px`, top: `${jackPos.y}px` }}
      >
        <JackPoint
          status={status}
          cableType={connection.required}
          onClick={onClick}
          onDrop={onDrop}
        />
      </div>
    </>
  );
};

// Toolbox Item — compact vertical pill for horizontal strip
const ToolboxItem: React.FC<{
  itemId: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ itemId, isSelected, onClick }) => {
  const item = ITEMS[itemId.toUpperCase()];
  if (!item) return null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      className={`
        flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-center
        transition-all cursor-grab active:cursor-grabbing shrink-0 min-w-[72px] group
        ${
          isSelected
            ? 'bg-indigo-500/10 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
            : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }
      `}
    >
      <div className="relative w-7 h-7 flex items-center justify-center pointer-events-none">
        <div
          className={`absolute inset-0 ${isSelected ? 'bg-indigo-500' : 'bg-zinc-700 group-hover:bg-zinc-600'} transition-colors`}
          style={{ clipPath: HEX_CLIP_PATH }}
        />
        <div
          className={`relative z-10 ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}
        >
          <ItemIcon item={item} size={14} />
        </div>
      </div>
      <div className="text-[10px] font-medium truncate max-w-[64px] pointer-events-none">
        {item.name}
      </div>
    </button>
  );
};

// Modal
const Modal: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  primaryAction: () => void;
  primaryLabel: string;
}> = ({ title, icon, children, primaryAction, primaryLabel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
      <div
        className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-indigo-500/5"
        style={{ clipPath: HEX_CLIP_PATH }}
      />
      <div
        className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-zinc-800/30"
        style={{ clipPath: HEX_CLIP_PATH }}
      />
      <div className="relative z-10 text-center">
        {icon && (
          <div className="flex justify-center mb-4 text-indigo-400">{icon}</div>
        )}
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <div className="text-zinc-400 mb-8 text-sm leading-relaxed">
          {children}
        </div>
        <button
          onClick={primaryAction}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold tracking-wide rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

interface SignalFlowProps {
  onComplete?: () => void;
}

export default function SignalFlow({ onComplete }: SignalFlowProps) {
  const [levelIndex, setLevelIndex] = useState<number>(-1); // -1 = level select
  const [placedItems, setPlacedItems] = useState<Record<string, string>>({});
  const [connectedCables, setConnectedCables] = useState<
    Record<string, string>
  >({});

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

  const [gameState, setGameState] = useState<GameState>('intro');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive board scaling — fits both width and height, centered
  const boardWrapperRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 });
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = boardWrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scale = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT);
      const offsetX = (width - BOARD_WIDTH * scale) / 2;
      const offsetY = (height - BOARD_HEIGHT * scale) / 2;
      setBoardScale(scale);
      setBoardOffset({ x: offsetX, y: offsetY });
      setWrapperSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [levelIndex]);

  const currentLevel = levelIndex >= 0 ? LEVELS[levelIndex] : LEVELS[0];

  const resetLevel = useCallback(() => {
    setPlacedItems({});
    setConnectedCables({});
    setSelectedTool(null);
    setSelectedSlotId(null);
    setSelectedConnectionId(null);
    setErrorMsg(null);
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 2000);
  }, []);

  // Cleanup error timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const nextLevel = useCallback(() => {
    if (levelIndex < LEVELS.length - 1) {
      setLevelIndex((prev) => prev + 1);
      setGameState('playing');
      resetLevel();
    } else {
      onComplete?.();
    }
  }, [levelIndex, resetLevel, onComplete]);

  // --- Interaction Logic ---

  const handleSlotInteraction = useCallback(
    (slotId: string, itemAttempted: string, requiredItem: string) => {
      if (placedItems[slotId]) {
        showError('Slot already occupied');
        return;
      }
      if (itemAttempted === requiredItem) {
        setPlacedItems((prev) => ({ ...prev, [slotId]: itemAttempted }));
        setSelectedTool(null);
      } else {
        const attemptedName =
          ITEMS[itemAttempted.toUpperCase()]?.name || 'That item';
        showError(`${attemptedName} doesn't go there!`);
      }
    },
    [placedItems, showError],
  );

  const handleConnectionInteraction = useCallback(
    (connectionId: string, itemAttempted: string, requiredCable: string) => {
      if (connectedCables[connectionId]) {
        showError('Connection already established');
        return;
      }
      if (itemAttempted === requiredCable) {
        setConnectedCables((prev) => ({
          ...prev,
          [connectionId]: itemAttempted,
        }));
        setSelectedTool(null);
      } else {
        const attemptedName =
          ITEMS[itemAttempted.toUpperCase()]?.name || 'That item';
        showError(`${attemptedName} is not the right cable!`);
      }
    },
    [connectedCables, showError],
  );

  const handleToolSelect = useCallback(
    (itemId: string) => {
      if (selectedSlotId) {
        const slot = currentLevel.slots.find((s) => s.id === selectedSlotId);
        if (slot) handleSlotInteraction(selectedSlotId, itemId, slot.required);
        setSelectedSlotId(null);
        return;
      }
      if (selectedConnectionId) {
        const conn = currentLevel.connections.find(
          (c) => c.id === selectedConnectionId,
        );
        if (conn)
          handleConnectionInteraction(
            selectedConnectionId,
            itemId,
            conn.required,
          );
        setSelectedConnectionId(null);
        return;
      }
      setSelectedTool(selectedTool === itemId ? null : itemId);
      setErrorMsg(null);
    },
    [
      selectedSlotId,
      selectedConnectionId,
      selectedTool,
      currentLevel,
      handleSlotInteraction,
      handleConnectionInteraction,
    ],
  );

  const handleSlotClick = useCallback(
    (slotId: string, requiredItem: string) => {
      const placedItemId = placedItems[slotId];
      if (placedItemId) {
        setSelectedTool(selectedTool === placedItemId ? null : placedItemId);
        setErrorMsg(null);
        return;
      }
      if (selectedTool) {
        handleSlotInteraction(slotId, selectedTool, requiredItem);
        return;
      }
      if (selectedSlotId === slotId) {
        setSelectedSlotId(null);
      } else {
        setSelectedSlotId(slotId);
        setSelectedConnectionId(null);
        setErrorMsg(null);
      }
    },
    [placedItems, selectedTool, selectedSlotId, handleSlotInteraction],
  );

  const handleConnectionClick = useCallback(
    (connectionId: string, requiredCable: string) => {
      const connectedCableId = connectedCables[connectionId];
      if (connectedCableId) {
        setSelectedTool(
          selectedTool === connectedCableId ? null : connectedCableId,
        );
        setErrorMsg(null);
        return;
      }
      if (selectedTool) {
        handleConnectionInteraction(connectionId, selectedTool, requiredCable);
        return;
      }
      if (selectedConnectionId === connectionId) {
        setSelectedConnectionId(null);
      } else {
        setSelectedConnectionId(connectionId);
        setSelectedSlotId(null);
        setErrorMsg(null);
      }
    },
    [
      connectedCables,
      selectedTool,
      selectedConnectionId,
      handleConnectionInteraction,
    ],
  );

  // Win condition
  useEffect(() => {
    if (gameState !== 'playing' || levelIndex < 0) return;
    const allSlotsFilled = currentLevel.slots.every(
      (s) => placedItems[s.id] === s.required,
    );
    const allCablesConnected = currentLevel.connections.every(
      (c) => connectedCables[c.id] === c.required,
    );

    if (allSlotsFilled && allCablesConnected) {
      const timer = setTimeout(() => setGameState('success'), 600);
      return () => clearTimeout(timer);
    }
  }, [placedItems, connectedCables, currentLevel, gameState, levelIndex]);

  // Status helpers
  const getSlotStatus = (slot: Slot): SlotStatus => {
    if (placedItems[slot.id]) return 'filled';
    if (selectedTool && selectedTool === slot.required) return 'highlight';
    if (selectedSlotId === slot.id) return 'target';
    return 'empty';
  };

  const getConnectionStatus = (conn: Connection): ConnectionStatus => {
    const fromFilled = placedItems[conn.from];
    const toFilled = conn.to === 'POWER' ? true : placedItems[conn.to];
    if (!fromFilled || !toFilled) return 'locked';
    if (connectedCables[conn.id]) return 'connected';
    if (selectedTool && selectedTool === conn.required) return 'highlight';
    if (selectedConnectionId === conn.id) return 'target';
    return 'ready';
  };

  // Level select screen
  if (levelIndex < 0) {
    return (
      <div className="flex flex-col bg-zinc-950 text-zinc-100 font-sans select-none min-h-[600px]">
        <LevelSelectScreen
          levels={LEVELS}
          onSelect={(idx) => {
            setLevelIndex(idx);
            resetLevel();
            setGameState('intro');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[600px] bg-zinc-950 text-zinc-100 font-sans select-none rounded-xl overflow-hidden border border-zinc-800">
      {/* Level Header */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-30">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Mission {levelIndex + 1} {/* // */} {currentLevel.title}
        </div>
        <button
          onClick={() => {
            resetLevel();
            setLevelIndex(-1);
          }}
          className="text-xs font-bold uppercase text-zinc-400 hover:text-white transition-colors"
        >
          Levels
        </button>
      </header>

      {/* Board — fills available space, hex pattern tiles across entire area */}
      <div
        ref={boardWrapperRef}
        className="flex-1 overflow-hidden relative bg-zinc-950"
      >
        {/* Error Toast */}
        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-rose-500/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl text-sm font-medium animate-in slide-in-from-top-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Game board — centered and scaled to fit, overflow-visible so background extends beyond */}
        <div
          className="absolute overflow-visible origin-top-left"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `translate(${boardOffset.x}px, ${boardOffset.y}px) scale(${boardScale})`,
          }}
        >
          {/* Hex background — same coordinate system as slots, extends to fill wrapper */}
          <HexBoardBackground
            wrapperWidth={wrapperSize.width}
            wrapperHeight={wrapperSize.height}
            boardScale={boardScale}
            boardOffsetX={boardOffset.x}
            boardOffsetY={boardOffset.y}
          />
          {/* Power Rail */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent flex items-end px-8 justify-between z-10 pb-4 pointer-events-none">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pl-4">
              Power Distro
            </div>
            <div className="flex gap-24 mr-20 opacity-50">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                  <div className="w-12 h-1 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Cables */}
          {currentLevel.connections.map((conn) => (
            <CableRoute
              key={conn.id}
              connection={conn}
              slots={currentLevel.slots}
              status={getConnectionStatus(conn)}
              onClick={() => handleConnectionClick(conn.id, conn.required)}
              onDrop={(droppedId) =>
                handleConnectionInteraction(conn.id, droppedId, conn.required)
              }
            />
          ))}

          {/* Active Slots */}
          {currentLevel.slots.map((slot) => {
            const pos = getHexPos(slot.col, slot.row);
            return (
              <HexTile
                key={slot.id}
                x={pos.x}
                y={pos.y}
                tileType="slot"
                status={getSlotStatus(slot)}
                item={ITEMS[slot.required.toUpperCase()]}
                label={slot.label}
                onClick={() => handleSlotClick(slot.id, slot.required)}
                onDrop={(droppedId) =>
                  handleSlotInteraction(slot.id, droppedId, slot.required)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Horizontal Toolbox Strip */}
      <div className="border-t border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 shrink-0">
            Toolbox
            <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">
              {currentLevel.toolbox.length}
            </span>
          </h2>
          <div className="flex items-center gap-2 text-zinc-500 ml-auto">
            <Info size={14} className="shrink-0 text-indigo-400" />
            <p className="text-[11px] leading-snug truncate max-w-sm">
              {currentLevel.brief}
            </p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentLevel.toolbox.map((itemId) => (
            <ToolboxItem
              key={itemId}
              itemId={itemId}
              isSelected={selectedTool === itemId}
              onClick={() => handleToolSelect(itemId)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {gameState === 'intro' && (
        <Modal
          title="System Initialization"
          icon={<Settings size={32} />}
          primaryLabel="Start Configuration"
          primaryAction={() => setGameState('playing')}
        >
          <p>
            Welcome, Engineer. Configure the studio signal flow by placing
            equipment into the grid and patching cables correctly.
          </p>
        </Modal>
      )}

      {gameState === 'success' && (
        <Modal
          title="Signal Path Verified"
          icon={<CheckCircle size={32} />}
          primaryLabel={
            levelIndex < LEVELS.length - 1 ? 'Next Stage' : 'Finish Training'
          }
          primaryAction={nextLevel}
        >
          <p>
            Excellent work. All connections are stable and audio is passing
            cleanly.
          </p>
        </Modal>
      )}
    </div>
  );
}
