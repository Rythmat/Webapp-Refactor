'use client';

import type React from 'react';

const BLOB_STYLE: React.CSSProperties = {
  '--border-radius': '115% 140% 145% 110% / 125% 140% 110% 125%',
  '--border-width': '1px',
  aspectRatio: '1',
  display: 'block',
  gridArea: 'stack',
  backgroundSize: 'calc(100% + var(--border-width) * 2)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  border: 'var(--border-width) solid transparent',
  borderRadius: 'var(--border-radius)',
  maskImage:
    'linear-gradient(transparent, transparent), linear-gradient(black, white)',
  maskClip: 'padding-box, border-box',
  maskComposite: 'intersect',
  mixBlendMode: 'screen',
  height: '100%',
  filter: 'blur(0.5px)',
} as React.CSSProperties;

const BLOBS = [
  {
    backgroundColor: '#0074D9',
    backgroundImage: 'linear-gradient(#0074D9, #39CCCC, #0074D9)',
    transform: 'rotate(30deg) scale(1.03)',
  },
  {
    backgroundColor: '#FF4136',
    backgroundImage: 'linear-gradient(#FF4136, #FF851B, #FF4136)',
    transform: 'rotate(60deg) scale(0.95)',
  },
  {
    backgroundColor: '#3D9970',
    backgroundImage: 'linear-gradient(#3D9970, #01FF70, #3D9970)',
    transform: 'rotate(90deg) scale(0.97)',
  },
  {
    backgroundColor: '#B10DC9',
    backgroundImage: 'linear-gradient(#B10DC9, #85144B, #B10DC9)',
    transform: 'rotate(120deg) scale(1.02)',
  },
];

interface AnimatedBlobsProps {
  size?: number;
}

export function AnimatedBlobs({ size = 16 }: AnimatedBlobsProps) {
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="grid animate-[blob-spin_5s_linear_infinite]"
        style={{
          gridTemplateAreas: "'stack'",
          width: size,
          height: size,
        }}
      >
        {BLOBS.map((blob, i) => (
          <span key={i} style={{ ...BLOB_STYLE, ...blob }} />
        ))}
      </span>
    </span>
  );
}
