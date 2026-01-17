"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  Noise,
  Scanline,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";
import {
  CameraControls,
  Cloud,
  Clouds,
  Edges,
  GradientTexture,
  Loader,
  OrbitControls,
  Stars,
  // Stats,
} from "@react-three/drei";

type CameraView = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};
//react three fiber interpolate between cameras
export const ThreeJsUniverse = () => {
  const edgeColor = useMemo(() => new THREE.Color(10, 0.9, 7), []);
  const cameraControlRef = useRef<CameraControls | null>(null);
  const views = useMemo<CameraView[]>(
    () => [
      {
        label: "Default",
        position: [0, 2, 7],
        target: [0, 5, 0],
      },
      {
        label: "Low Orbit",
        position: [5, 2, 0],
        target: [0, 1, 0],
      },
      {
        label: "Top Down",
        position: [0, 8, 0.01],
        target: [0, 0, 0],
      },
    ],
    [],
  );
  const [activeViewIndex, setActiveViewIndex] = useState(0);

  const moveToView = useCallback(
    (index: number) => {
      const view = views[index];
      if (!view) {
        return;
      }

      const [positionX, positionY, positionZ] = view.position;
      const [targetX, targetY, targetZ] = view.target;

      cameraControlRef.current?.setLookAt(
        positionX,
        positionY,
        positionZ,
        targetX,
        targetY,
        targetZ,
        true,
      );
    },
    [cameraControlRef, views],
  );

  useEffect(() => {
    moveToView(activeViewIndex);
  }, [activeViewIndex, moveToView]);

  useEffect(() => {
    const totalViews = views.length;
    if (totalViews === 0) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setActiveViewIndex((current) => (current + 1) % totalViews);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [views]);

  const activeView = views[activeViewIndex];

  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 7], fov: 50 }}
        dpr={[0.25 / 2, 0.5 / 2]}
        gl={{ alpha: false }}
        suppressHydrationWarning
      >
        <CameraControls ref={cameraControlRef} smoothTime={1.0} />
        {/* <SetCameraPosition /> */}
        {/* <OrbitControls /> */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[5, 30, 30]} />
          {/* rotate the sphere */}

          <meshBasicMaterial color={[0, 0, 0]} />
          <Edges lineWidth={2} scale={1.02} color={edgeColor} threshold={0.9}>
            <meshBasicMaterial />
          </Edges>
        </mesh>
        {/* <Stats /> */}
        {/* <SetCameraPosition /> */}

        <Stars
          radius={50}
          depth={500}
          count={2000}
          factor={5}
          saturation={1}
          speed={1}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0}
            luminanceSmoothing={0}
            intensity={1}
            levels={7}
            radius={0.8}
            mipmapBlur={true}
            opacity={0.9}
          />
          <Noise opacity={0.01} />

          <Vignette
            offset={0.4}
            darkness={0.6}
            eskil={false}
            blendFunction={BlendFunction.DARKEN}
          />
          <BrightnessContrast brightness={0} contrast={0.1} />
          <Scanline
            // blendFunction={BlendFunction.NORMAL}
            density={1}
            opacity={0.1}
            scrollSpeed={0.01}
          />
        </EffectComposer>
      </Canvas>
      {activeView && (
        <div className="universe-view-indicator">{`${activeView.label}: ${activeView.position} -> ${activeView.target}`}</div>
      )}
      <Loader />
    </>
  );
};
