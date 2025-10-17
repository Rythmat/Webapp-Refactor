import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogoType } from '@/components/LogoType';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { useComponentSize } from '@/hooks/useComponentSize';
import backgroundImage from './assets/musicatlas-swooshy-gradient-improved.png';

export const AuthLayout = () => {
  const [childRef, childSize] = useComponentSize();
  const [pianoLeftOffset, setPianoLeftOffset] = useState(0);
  const octaveCount = Math.floor(childSize.height / 168);

  useEffect(() => {
    setPianoLeftOffset(-7);
  }, []);

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center">
      <div className="absolute inset-0 z-10 size-full bg-black/90 backdrop-blur-sm" />
      <div
        className="absolute inset-0 z-0 size-full animate-fade-in-bottom bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />

      {/* Card Outer Container */}
      <div className="relative z-20 flex flex-col items-center justify-center gap-8">
        <LogoType className="h-10" />

        <div
          className="absolute left-0 top-[39px] z-10 h-full w-32 overflow-hidden py-8 transition-all duration-1000"
          style={{ left: `${pianoLeftOffset}rem` }}
        >
          <div className="relative flex h-full flex-col justify-center px-2">
            {octaveCount > 0 && (
              <PianoKeyboard
                endC={4 + octaveCount}
                startC={4}
                vertical={true}
              />
            )}
          </div>
        </div>

        {/* Card Inner Container */}
        <div
          ref={childRef}
          className="z-10 flex min-h-[600px] min-w-[440px] flex-col items-center justify-center gap-12 rounded-2xl bg-surface-box px-6"
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};
