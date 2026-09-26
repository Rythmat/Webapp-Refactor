import { useEffect, useRef } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { DirectionalLight, AmbientLight } from 'three';

/**
 * Attach the warm camera-mounted "sun" plus a dim ambient.
 *
 * `ready` is not optional in practice: the <Globe> element does not exist on
 * the first render, so an effect keyed only on the ref object (whose identity
 * never changes) found `globeRef.current === undefined`, returned early and
 * never ran again — both globes shipped with globe.gl's default lights instead
 * of these. Pass the `onGlobeReady` flag.
 */
export function useGlobeLighting(
  globeRef: React.MutableRefObject<GlobeMethods | undefined>,
  ready: boolean,
) {
  const lightsSetUp = useRef(false);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe || lightsSetUp.current) return;

    const camera = globe.camera();
    const scene = globe.scene();

    // Warm dim ambient so the night side keeps its colour instead of a cold cast
    const ambient = new AmbientLight(0x4a463c, 0.45 * Math.PI);

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
  }, [globeRef, ready]);
}
