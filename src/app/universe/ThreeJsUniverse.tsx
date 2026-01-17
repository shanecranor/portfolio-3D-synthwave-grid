"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
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
  Detailed,
  Edges,
  Loader,
  Stars,
} from "@react-three/drei";

type ViewConfig = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

const VIEWS: ViewConfig[] = [
  { label: "Default", position: [0, 2, 7], target: [0, 5.6, 0] },
  { label: "Low Orbit", position: [5, 2, 0], target: [0, 1, 0] },
  { label: "Top Down", position: [0, 8, 0.01], target: [0, 0, 0] },
];

function CameraRig({ viewIndex }: { viewIndex: number }) {
  const [controls, setControls] = useState<CameraControls | null>(null);

  const view = VIEWS[viewIndex];

  useEffect(() => {
    if (!controls || !view) return;

    controls.setLookAt(
      ...view.position,
      ...view.target,
      true, // enable transition
    );
  }, [controls, view]);

  return <CameraControls ref={(ref) => setControls(ref)} smoothTime={1.0} />;
}

export const ThreeJsUniverse = () => {
  const edgeColor = useMemo(() => new THREE.Color(10, 0.9, 7), []);
  const [activeViewIndex, setActiveViewIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setActiveViewIndex((current) => (current + 1) % VIEWS.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeView = VIEWS[activeViewIndex];

  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 7], fov: 20 }}
        dpr={[1 / 4, 2 / 4]}
        gl={{ alpha: false }}
      >
        <CameraRig viewIndex={activeViewIndex} />
        <Detailed distances={[5, 40]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <sphereGeometry args={[5, 180, 90]} />
            <meshBasicMaterial color={[0, 0, 0]} />
            <Edges lineWidth={2} scale={1} color={edgeColor} threshold={0.9}>
              <meshBasicMaterial />
            </Edges>
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <sphereGeometry args={[5, 32, 32]} />
            <meshBasicMaterial color={[0, 0, 0]} />
            <Edges lineWidth={2} scale={1} color={edgeColor} threshold={0.9}>
              <meshBasicMaterial />
            </Edges>
          </mesh>
        </Detailed>

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
            intensity={1}
            levels={7}
            mipmapBlur
            opacity={0.9}
          />
          <Noise opacity={0.01} />
          <Vignette
            offset={0.4}
            darkness={0.6}
            blendFunction={BlendFunction.DARKEN}
          />
          <BrightnessContrast brightness={0} contrast={0.1} />
          <Scanline density={1} opacity={0.1} scrollSpeed={0.01} />
        </EffectComposer>
      </Canvas>

      {activeView && (
        <div
          className="universe-view-indicator"
          style={{ position: "absolute", top: 20, left: 20, color: "white" }}
        >
          {`${activeView.label}`}
        </div>
      )}
      <Loader />
    </>
  );
};
