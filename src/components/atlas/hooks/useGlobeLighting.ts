import { useEffect, useRef } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { DirectionalLight, AmbientLight } from 'three';

export function useGlobeLighting(
  globeRef: React.MutableRefObject<GlobeMethods | undefined>,
) {
  const lightsSetUp = useRef(false);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || lightsSetUp.current) return;

    const camera = globe.camera();
    const scene = globe.scene();

    // Dim ambient so the night side isn't pure black
    const ambient = new AmbientLight(0x404050, 0.4 * Math.PI);

    // Warm directional "sun" light, attached to the camera so it's screen-relative
    const sunLight = new DirectionalLight(0xfff5e0, 1.2 * Math.PI);
    // Camera-local coords: -X = left, +Y = up, -Z = forward
    sunLight.position.set(-1, 0.3, 0);

    // Ensure camera is in the scene graph so children get world-matrix updates
    if (!camera.parent) {
      scene.add(camera);
    }
    camera.add(sunLight);

    // Replace default globe lights with just the ambient
    // (sunLight lives on the camera, not via this API)
    globe.lights([ambient]);

    lightsSetUp.current = true;

    return () => {
      camera.remove(sunLight);
      sunLight.dispose();
      ambient.dispose();
      lightsSetUp.current = false;
    };
  }, [globeRef]);
}
