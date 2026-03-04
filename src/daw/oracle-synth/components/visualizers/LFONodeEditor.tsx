import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LFONode } from '../../audio/types';
import styles from './LFONodeEditor.module.css';

interface LFONodeEditorProps {
  nodes: LFONode[];
  onChange: (nodes: LFONode[]) => void;
  color?: string;
  gridSnap?: boolean;
}

const PAD = 6;
const NODE_RADIUS = 4;
const CURVE_HANDLE_SIZE = 3.5;
const CURVE_SEGMENTS = 20;
const GRID_DIVISIONS_X = 16;
const GRID_DIVISIONS_Y = 8;

function snapToGrid(value: number, divisions: number): number {
  const step = 1 / divisions;
  return Math.round(value / step) * step;
}

/** Apply curve shaping to a linear fraction */
function shapeFrac(frac: number, curve: number): number {
  if (curve === 0) return frac;
  return Math.pow(frac, Math.pow(2, -curve * 2));
}

/**
 * SVG-based node editor for LFO waveforms.
 * - Drag nodes to reshape the waveform
 * - Click on empty space to add a node
 * - Double-click a node to delete it (if not first/last)
 * - Drag diamond handles between nodes to adjust curve shape
 * - Double-click a curve handle to reset to linear
 */
export const LFONodeEditor: React.FC<LFONodeEditorProps> = React.memo(
  ({
    nodes,
    onChange,
    color = '#7ecfcf',
    gridSnap = true,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [size, setSize] = useState({ width: 200, height: 100 });
    const [localNodes, setLocalNodes] = useState<LFONode[] | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [curveDragIdx, setCurveDragIdx] = useState<number | null>(null);
    const curveDragStartY = useRef<number>(0);
    const curveDragStartValue = useRef<number>(0);

    // Track container size
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setSize({ width: Math.round(width), height: Math.round(height) });
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const { width, height } = size;
    const displayNodes = localNodes ?? nodes;

    const drawW = width - PAD * 2;
    const drawH = height - PAD * 2;

    const toSvgX = useCallback(
      (t: number) => PAD + t * drawW,
      [drawW]
    );
    const toSvgY = useCallback(
      (v: number) => PAD + (1 - v) * drawH,
      [drawH]
    );

    const fromSvg = useCallback(
      (clientX: number, clientY: number): { time: number; value: number } => {
        const svg = svgRef.current;
        if (!svg) return { time: 0, value: 0 };

        const rect = svg.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let time = (x - PAD) / drawW;
        let value = 1 - (y - PAD) / drawH;

        time = Math.max(0, Math.min(1, time));
        value = Math.max(0, Math.min(1, value));

        if (gridSnap) {
          time = snapToGrid(time, GRID_DIVISIONS_X);
          value = snapToGrid(value, GRID_DIVISIONS_Y);
        }

        return { time, value };
      },
      [drawW, drawH, gridSnap]
    );

    // Build the waveform path from sorted nodes (with curves)
    const sorted = [...displayNodes].sort((a, b) => a.time - b.time);

    let pathD = '';
    let fillD = '';
    if (sorted.length > 0) {
      pathD = `M${toSvgX(sorted[0].time)},${toSvgY(sorted[0].value)} `;
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const c = a.curve ?? 0;
        if (c === 0) {
          pathD += `L${toSvgX(b.time)},${toSvgY(b.value)} `;
        } else {
          for (let s = 1; s <= CURVE_SEGMENTS; s++) {
            const frac = s / CURVE_SEGMENTS;
            const shaped = shapeFrac(frac, c);
            const t = a.time + (b.time - a.time) * frac;
            const v = a.value + (b.value - a.value) * shaped;
            pathD += `L${toSvgX(t)},${toSvgY(v)} `;
          }
        }
      }
      fillD = pathD + `L${PAD + drawW},${toSvgY(0)} L${PAD},${toSvgY(0)} Z`;
    }

    // --- Node dragging ---
    const handlePointerDown = useCallback(
      (e: React.PointerEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as SVGElement).setPointerCapture(e.pointerId);
        setLocalNodes([...displayNodes]);
        setDragIndex(index);
      },
      [displayNodes]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        // Curve handle dragging
        if (curveDragIdx !== null && localNodes) {
          const deltaY = e.clientY - curveDragStartY.current;
          const sensitivity = 3 / drawH;
          const newCurve = Math.max(-1, Math.min(1, curveDragStartValue.current - deltaY * sensitivity));

          const sortedLocal = [...localNodes].sort((a, b) => a.time - b.time);
          const targetNode = sortedLocal[curveDragIdx];
          const origIdx = localNodes.findIndex(
            (n) => n.time === targetNode.time && n.value === targetNode.value
          );
          if (origIdx >= 0) {
            const updated = [...localNodes];
            updated[origIdx] = { ...updated[origIdx], curve: Math.round(newCurve * 100) / 100 };
            setLocalNodes(updated);
          }
          return;
        }

        // Node dragging
        if (dragIndex === null || !localNodes) return;
        const { time, value } = fromSvg(e.clientX, e.clientY);

        const updated = [...localNodes];
        const isFirst = dragIndex === 0;
        const isLast = dragIndex === updated.length - 1;

        const sortedCopy = [...updated].sort((a, b) => a.time - b.time);
        const sortedIdx = sortedCopy.findIndex(
          (n) =>
            n.time === updated[dragIndex].time &&
            n.value === updated[dragIndex].value
        );

        updated[dragIndex] = {
          ...updated[dragIndex],
          time: isFirst ? 0 : isLast ? 1 : time,
          value,
        };

        if (!isFirst && !isLast && sortedIdx > 0 && sortedIdx < sortedCopy.length - 1) {
          const prevTime = sortedCopy[sortedIdx - 1].time;
          const nextTime = sortedCopy[sortedIdx + 1].time;
          updated[dragIndex].time = Math.max(
            prevTime + 0.001,
            Math.min(nextTime - 0.001, updated[dragIndex].time)
          );
        }

        setLocalNodes(updated);
      },
      [dragIndex, curveDragIdx, localNodes, fromSvg, drawH]
    );

    const handlePointerUp = useCallback(() => {
      if (localNodes) {
        onChange(localNodes);
      }
      setLocalNodes(null);
      setDragIndex(null);
      setCurveDragIdx(null);
    }, [localNodes, onChange]);

    // Click on empty space to add a node
    const handleSvgClick = useCallback(
      (e: React.MouseEvent) => {
        if (dragIndex !== null || curveDragIdx !== null) return;
        const { time, value } = fromSvg(e.clientX, e.clientY);
        const updated = [...nodes, { time, value }].sort(
          (a, b) => a.time - b.time
        );
        onChange(updated);
      },
      [nodes, onChange, fromSvg, dragIndex, curveDragIdx]
    );

    // Delete a node
    const deleteNode = useCallback(
      (index: number) => {
        const sortedCopy = [...nodes].sort((a, b) => a.time - b.time);
        const node = nodes[index];
        const sortedIdx = sortedCopy.findIndex(
          (n) => n.time === node.time && n.value === node.value
        );
        if (sortedIdx === 0 || sortedIdx === sortedCopy.length - 1) return;
        if (nodes.length <= 2) return;

        const updated = nodes.filter((_, i) => i !== index);
        onChange(updated);
      },
      [nodes, onChange]
    );

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        deleteNode(index);
      },
      [deleteNode]
    );

    const handleContextMenu = useCallback(
      (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        deleteNode(index);
      },
      [deleteNode]
    );

    const handleNodeClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    // --- Curve handle events ---
    const handleCurvePointerDown = useCallback(
      (e: React.PointerEvent, sortedIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as SVGElement).setPointerCapture(e.pointerId);
        const currentNodes = [...displayNodes];
        setLocalNodes(currentNodes);
        setCurveDragIdx(sortedIndex);
        curveDragStartY.current = e.clientY;
        const sortedCopy = [...currentNodes].sort((a, b) => a.time - b.time);
        curveDragStartValue.current = sortedCopy[sortedIndex].curve ?? 0;
      },
      [displayNodes]
    );

    const handleCurveClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const handleCurveDoubleClick = useCallback(
      (e: React.MouseEvent, sortedIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const sortedCopy = [...nodes].sort((a, b) => a.time - b.time);
        const targetNode = sortedCopy[sortedIndex];
        const origIdx = nodes.findIndex(
          (n) => n.time === targetNode.time && n.value === targetNode.value
        );
        if (origIdx >= 0) {
          const updated = [...nodes];
          updated[origIdx] = { ...updated[origIdx], curve: 0 };
          onChange(updated);
        }
      },
      [nodes, onChange]
    );

    // Grid lines
    const gridLines: React.ReactNode[] = [];
    for (let i = 0; i <= GRID_DIVISIONS_X; i++) {
      const x = PAD + (i / GRID_DIVISIONS_X) * drawW;
      gridLines.push(
        <line
          key={`vg${i}`}
          x1={x}
          y1={PAD}
          x2={x}
          y2={PAD + drawH}
          stroke={i % 4 === 0 ? '#333' : '#252525'}
          strokeWidth={i % 4 === 0 ? 1 : 0.5}
        />
      );
    }
    for (let i = 0; i <= GRID_DIVISIONS_Y; i++) {
      const y = PAD + (i / GRID_DIVISIONS_Y) * drawH;
      gridLines.push(
        <line
          key={`hg${i}`}
          x1={PAD}
          y1={y}
          x2={PAD + drawW}
          y2={y}
          stroke={i === GRID_DIVISIONS_Y / 2 ? '#444' : '#252525'}
          strokeWidth={i === GRID_DIVISIONS_Y / 2 ? 1 : 0.5}
        />
      );
    }

    // Curve handles between each consecutive pair of sorted nodes
    const curveHandles: React.ReactNode[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const c = a.curve ?? 0;
      const midT = (a.time + b.time) / 2;
      const shaped = shapeFrac(0.5, c);
      const midV = a.value + (b.value - a.value) * shaped;
      const hx = toSvgX(midT);
      const hy = toSvgY(midV);
      const isDragging = curveDragIdx === i;

      curveHandles.push(
        <rect
          key={`ch${i}`}
          x={hx - CURVE_HANDLE_SIZE}
          y={hy - CURVE_HANDLE_SIZE}
          width={CURVE_HANDLE_SIZE * 2}
          height={CURVE_HANDLE_SIZE * 2}
          rx={1}
          fill={isDragging ? '#fff' : color}
          fillOpacity={isDragging ? 1 : 0.6}
          stroke={isDragging ? color : 'none'}
          strokeWidth={1}
          transform={`rotate(45 ${hx} ${hy})`}
          className={styles.curveHandle}
          onPointerDown={(e) => handleCurvePointerDown(e, i)}
          onClick={handleCurveClick}
          onDoubleClick={(e) => handleCurveDoubleClick(e, i)}
        />
      );
    }

    return (
      <div ref={containerRef} className={styles.container}>
        <svg
          ref={svgRef}
          className={styles.editor}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onClick={handleSvgClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Grid */}
          {gridLines}

          {/* Fill under curve */}
          {fillD && <path d={fillD} fill={color + '10'} />}

          {/* Waveform line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          )}

          {/* Curve handles */}
          {curveHandles}

          {/* Draggable nodes */}
          {displayNodes.map((node, i) => (
            <circle
              key={i}
              cx={toSvgX(node.time)}
              cy={toSvgY(node.value)}
              r={NODE_RADIUS}
              fill={dragIndex === i ? '#fff' : color}
              stroke={dragIndex === i ? color : '#1a1a1a'}
              strokeWidth={1.5}
              className={styles.node}
              onPointerDown={(e) => handlePointerDown(e, i)}
              onClick={handleNodeClick}
              onDoubleClick={(e) => handleDoubleClick(e, i)}
              onContextMenu={(e) => handleContextMenu(e, i)}
            />
          ))}
        </svg>
      </div>
    );
  }
);
