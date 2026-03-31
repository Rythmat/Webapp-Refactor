import { FIFTHS_ORDER, ROOTS, KEY_COLORS } from './constants';

interface CircleOfFifthsSelectorProps {
  onSelect: (rootVal: number) => void;
  currentRoot: number;
  onClose: () => void;
}

export function CircleOfFifthsSelector({
  onSelect,
  currentRoot,
  onClose,
}: CircleOfFifthsSelectorProps) {
  const size = 320;
  const center = size / 2;
  const outerRadius = 150;
  const innerRadius = 80;

  const getCoordinatesForAngle = (angleInDegrees: number, radius: number) => {
    const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angleInRadians),
      y: center + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 bg-black rounded-full blur-xl opacity-50 transform scale-90" />

        <svg
          width={size}
          height={size}
          className="relative z-10 drop-shadow-2xl"
        >
          {FIFTHS_ORDER.map((rootVal, index) => {
            const root = ROOTS.find((r) => r.val === rootVal);
            if (!root) return null;

            const sliceCenterAngle = index * 30;
            const startAngle = sliceCenterAngle - 15;
            const endAngle = sliceCenterAngle + 15;

            const startOuter = getCoordinatesForAngle(startAngle, outerRadius);
            const endOuter = getCoordinatesForAngle(endAngle, outerRadius);
            const startInner = getCoordinatesForAngle(startAngle, innerRadius);
            const endInner = getCoordinatesForAngle(endAngle, innerRadius);

            const pathData = `
              M ${startOuter.x} ${startOuter.y}
              A ${outerRadius} ${outerRadius} 0 0 1 ${endOuter.x} ${endOuter.y}
              L ${endInner.x} ${endInner.y}
              A ${innerRadius} ${innerRadius} 0 0 0 ${startInner.x} ${startInner.y}
              Z
            `;

            const isSelected = currentRoot === rootVal;
            const color = KEY_COLORS[rootVal];
            const labelPos = getCoordinatesForAngle(
              sliceCenterAngle,
              (outerRadius + innerRadius) / 2,
            );

            return (
              <g
                key={rootVal}
                onClick={() => onSelect(rootVal)}
                className="cursor-pointer group"
              >
                <path
                  d={pathData}
                  fill={color}
                  className={`transition-all duration-200 hover:brightness-125 ${
                    isSelected
                      ? 'stroke-white stroke-2 brightness-110'
                      : 'opacity-90'
                  }`}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none drop-shadow-md"
                >
                  {root.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-center">
            <div className="text-xs text-zinc-400 font-medium tracking-widest uppercase">
              Select Key
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
