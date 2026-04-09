import { useRef, useState, useCallback, useEffect } from 'react';
import { SynthEngine } from '../audio/SynthEngine';

export function useAudioEngine() {
  const engineRef = useRef<SynthEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  const initEngine = useCallback(async () => {
    if (engineRef.current?.getIsInitialized()) return;
    const engine = new SynthEngine();
    await engine.init();
    engineRef.current = engine;
    setIsReady(true);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  return { engineRef, isReady, initEngine };
}
