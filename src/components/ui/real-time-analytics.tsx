import React, { useState, useMemo, useRef, type FC } from "react"

export interface ExternalDataPoint {
  label: string
  value: number
}

interface XpTrackerProps {
  /** This week's daily XP data (Mon–Sun) */
  thisWeek: ExternalDataPoint[]
  /** Last week's daily XP data (Mon–Sun) */
  lastWeek: ExternalDataPoint[]
  /** Additional className */
  className?: string
}

const DAYS = ['Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat', 'Sun']

export const RealTimeAnalytics: FC<XpTrackerProps> = ({
  thisWeek,
  lastWeek,
  className = "",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const width = 700
  const height = 140
  const padding = { top: 12, right: 16, bottom: 28, left: 36 }

  const maxValue = useMemo(() => {
    const allValues = [...thisWeek.map(d => d.value), ...lastWeek.map(d => d.value)]
    const peak = Math.max(...allValues, 10)
    return Math.ceil(peak / 20) * 20 // round up to nearest 20
  }, [thisWeek, lastWeek])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let v = 0; v <= maxValue; v += 20) ticks.push(v)
    return ticks
  }, [maxValue])

  const getX = (i: number) => {
    return padding.left + (i / (DAYS.length - 1)) * (width - padding.left - padding.right)
  }

  const getY = (value: number) => {
    return padding.top + (1 - value / maxValue) * (height - padding.top - padding.bottom)
  }

  const makePath = (data: ExternalDataPoint[]) => {
    if (data.length < 2) return ""
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)},${getY(d.value)}`)
      .join(" ")
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * width
    const chartLeft = padding.left
    const chartRight = width - padding.right
    const chartWidth = chartRight - chartLeft

    if (x < chartLeft || x > chartRight) {
      setHoveredIndex(null)
      return
    }

    const ratio = (x - chartLeft) / chartWidth
    const idx = Math.round(ratio * (DAYS.length - 1))
    setHoveredIndex(Math.max(0, Math.min(DAYS.length - 1, idx)))
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header: "XP" left, legend right */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">XP</span>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">This Week</span>
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last Week</span>
            <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
          className="cursor-crosshair"
        >
          {/* Y-axis labels + grid lines */}
          {yTicks.map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={padding.left - 12}
                y={getY(val)}
                fill="rgba(255,255,255,0.35)"
                fontSize="12"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {val}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {DAYS.map((day, i) => (
            <text
              key={day}
              x={getX(i)}
              y={height - 8}
              fill="rgba(255,255,255,0.35)"
              fontSize="12"
              textAnchor="middle"
            >
              {day}
            </text>
          ))}

          {/* Last Week line (grey, behind) */}
          <path
            d={makePath(lastWeek)}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Last Week dots */}
          {lastWeek.map((d, i) => (
            <circle
              key={`lw-${i}`}
              cx={getX(i)}
              cy={getY(d.value)}
              r={hoveredIndex === i ? 5 : 4}
              fill="#6b7280"
              style={{ transition: "r 0.15s ease" }}
            />
          ))}

          {/* This Week line (white, front) */}
          <path
            d={makePath(thisWeek)}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* This Week dots */}
          {thisWeek.map((d, i) => (
            <circle
              key={`tw-${i}`}
              cx={getX(i)}
              cy={getY(d.value)}
              r={hoveredIndex === i ? 6 : 4.5}
              fill="white"
              style={{ transition: "r 0.15s ease" }}
            />
          ))}

          {/* Hover crosshair */}
          {hoveredIndex != null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padding.top}
              x2={getX(hoveredIndex)}
              y2={height - padding.bottom}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hoveredIndex != null && (
          <div
            className="absolute pointer-events-none z-10 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 -translate-x-1/2"
            style={{
              left: `${(getX(hoveredIndex) / width) * 100}%`,
              bottom: `${((height - getY(Math.max(thisWeek[hoveredIndex]?.value ?? 0, lastWeek[hoveredIndex]?.value ?? 0))) / height) * 100 + 8}%`,
            }}
          >
            <div className="text-[10px] text-gray-500 mb-1">{DAYS[hoveredIndex]}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="text-white font-semibold">{thisWeek[hoveredIndex]?.value ?? 0} XP</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              <span className="text-gray-400">{lastWeek[hoveredIndex]?.value ?? 0} XP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
