import { GrainGradient } from '@paper-design/shaders-react';

export function GradientBackground() {
  return (
    <div className="absolute inset-0 -z-10 isolate">
      {/* Warm gradient — biased toward one side */}
      <div className="absolute inset-0">
        <GrainGradient
          style={{ height: '100%', width: '100%' }}
          colorBack="hsl(0, 0%, 0%)"
          softness={0.76}
          intensity={0.45}
          noise={0}
          shape="corners"
          offsetX={-0.5}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={1}
          colors={[
            'hsl(14, 100%, 57%)',
            'hsl(45, 100%, 51%)',
            'hsl(340, 82%, 52%)',
          ]}
        />
      </div>

      {/* Cool gradient — screen-blended over warm, biased to the other side */}
      <div className="absolute inset-0 mix-blend-screen">
        <GrainGradient
          style={{ height: '100%', width: '100%' }}
          colorBack="hsl(0, 0%, 0%)"
          softness={0.76}
          intensity={0.45}
          noise={0}
          shape="corners"
          offsetX={0.5}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={1}
          colors={[
            'hsl(210, 100%, 56%)',
            'hsl(150, 90%, 45%)',
            'hsl(270, 85%, 60%)',
          ]}
        />
      </div>
    </div>
  );
}
