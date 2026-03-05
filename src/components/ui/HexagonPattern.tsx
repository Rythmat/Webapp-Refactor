import React, { useMemo } from 'react';

export interface ThemeColors {
  [key: string]: string;
}

export const DEFAULT_THEMES: ThemeColors = {
  red: '#D65A65',
  darkGrey: '#5C6B73',
  beige: '#C2C5AA',
  darkRed: '#9D5C63',
  yellow: '#E9C46A',
  teal: '#2A9D8F',
  purple: '#9D4EDD',
  orange: '#E76F51',
  blue: '#457B9D',
  indigo: '#264653',
};

export interface PatternCoord {
  r: number;
  c: number;
}

interface HexagonPatternProps {
  className?: string;
  colorsOverride?: string[];
  variant?: 'default' | 'diagonal' | 'cluster' | 'split' | 'dense';
  fixedPattern?: string | PatternCoord[];
}

export const HexagonPattern: React.FC<HexagonPatternProps> = ({
  className,
  colorsOverride,
  variant = 'default',
  fixedPattern,
}) => {
  const hexs = useMemo(() => {
    const generatedHexs: React.JSX.Element[] = [];
    const colors = colorsOverride || [
      DEFAULT_THEMES.red,
      DEFAULT_THEMES.red,
      DEFAULT_THEMES.darkGrey,
      DEFAULT_THEMES.beige,
      DEFAULT_THEMES.beige,
      DEFAULT_THEMES.darkRed,
    ];

    if (fixedPattern) {
      const patterns: { [key: string]: PatternCoord[] } = {
        flower: [
          { r: 2, c: 2 },
          { r: 2, c: 3 },
          { r: 3, c: 2 },
          { r: 3, c: 3 },
          { r: 1, c: 2 },
          { r: 1, c: 3 },
          { r: 2, c: 1 },
        ],
        vShape: [
          { r: 1, c: 1 },
          { r: 2, c: 2 },
          { r: 3, c: 3 },
          { r: 2, c: 4 },
          { r: 1, c: 5 },
          { r: 1, c: 2 },
          { r: 2, c: 3 },
          { r: 1, c: 4 },
        ],
        cluster: [
          { r: 1, c: 4 },
          { r: 2, c: 3 },
          { r: 2, c: 4 },
          { r: 2, c: 5 },
          { r: 3, c: 3 },
          { r: 3, c: 4 },
          { r: 3, c: 5 },
        ],
        pyramid: [
          { r: 1, c: 3 },
          { r: 2, c: 2 },
          { r: 2, c: 3 },
          { r: 2, c: 4 },
          { r: 3, c: 1 },
          { r: 3, c: 2 },
          { r: 3, c: 3 },
          { r: 3, c: 4 },
          { r: 3, c: 5 },
        ],
      };

      const coords =
        typeof fixedPattern === 'string'
          ? patterns[fixedPattern] || []
          : fixedPattern;

      coords.forEach((pos, i) => {
        const x = pos.c * 26 + (pos.r % 2) * 13;
        const y = pos.r * 22;
        const color = colors[i % colors.length];
        generatedHexs.push(
          <path
            key={`fixed-${i}`}
            className="opacity-90"
            d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z"
            fill={color}
            transform={`translate(${x}, ${y}) scale(0.95)`}
          />,
        );
      });
    } else {
      const rows = 12;
      const cols = 16;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldRender = false;
          if (variant === 'diagonal') {
            shouldRender = r + c > 8 && r + c < 18 && Math.random() > 0.3;
          } else if (variant === 'cluster') {
            shouldRender = Math.sqrt(r * r + c * c) < 10 && Math.random() > 0.4;
          } else if (variant === 'split') {
            shouldRender = (c < 6 || c > 10) && Math.random() > 0.3;
          } else if (variant === 'dense') {
            shouldRender = Math.random() > 0.2;
          } else {
            shouldRender = Math.random() > 0.4;
          }

          if (shouldRender) {
            const x = c * 26 + (r % 2) * 13;
            const y = r * 22;
            const color = colors[Math.floor(Math.random() * colors.length)];
            generatedHexs.push(
              <path
                key={`${r}-${c}`}
                className="opacity-90"
                d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z"
                fill={color}
                transform={`translate(${x}, ${y}) scale(0.95)`}
              />,
            );
          }
        }
      }
    }
    return generatedHexs;
  }, [colorsOverride, variant, fixedPattern]);

  return (
    <svg
      className={className}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 300"
    >
      <g transform="translate(20, 20)">{hexs}</g>
    </svg>
  );
};
