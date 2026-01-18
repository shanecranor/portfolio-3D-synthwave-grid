"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
import { CameraControls, Detailed, Loader, Stars } from "@react-three/drei";
import { NoisySphere } from "@/components/3D/NoisySphere";

type ViewConfig = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

const VIEWS: ViewConfig[] = [
  { label: "Default", position: [0, 2.3, 5], target: [0, 10, 0] },
  { label: "Low Orbit", position: [5, 2, 0], target: [0, 1, 0] },
  { label: "Top Down", position: [0, 8, 0.01], target: [0, 0, 0] },
];

function CameraRig({ viewIndex }: { viewIndex: number }) {
  const [controls, setControls] = useState<CameraControls | null>(null);
  const initializedRef = useRef(false);
  const orbitAngleRef = useRef(0);
  const cameraRadiusRef = useRef(0);
  const targetRadiusRef = useRef(0);
  const targetAngleRef = useRef(0);

  const view = VIEWS[viewIndex];

  useEffect(() => {
    if (!controls || !view) return;

    // Initialize orbit angles and radii based on starting positions
    if (!initializedRef.current) {
      orbitAngleRef.current = Math.atan2(view.position[2], view.position[1]);
      cameraRadiusRef.current = Math.sqrt(
        view.position[1] ** 2 + view.position[2] ** 2,
      );
      targetAngleRef.current = Math.atan2(view.target[2], view.target[1]);
      targetRadiusRef.current = Math.sqrt(
        view.target[1] ** 2 + view.target[2] ** 2,
      );
      initializedRef.current = true;
    } else {
      // When switching views, smoothly transition
      orbitAngleRef.current = Math.atan2(view.position[2], view.position[1]);
      cameraRadiusRef.current = Math.sqrt(
        view.position[1] ** 2 + view.position[2] ** 2,
      );
      targetAngleRef.current = Math.atan2(view.target[2], view.target[1]);
      targetRadiusRef.current = Math.sqrt(
        view.target[1] ** 2 + view.target[2] ** 2,
      );
    }

    controls.setLookAt(
      ...view.position,
      ...view.target,
      initializedRef.current, // disable transition for the first load
    );
  }, [controls, view]);

  useFrame((state, delta) => {
    if (!controls) return;

    // Update orbit angle (opposite direction to cancel sphere rotation on x-axis)
    const rotationSpeed = -0.027;
    orbitAngleRef.current -= delta * rotationSpeed;
    targetAngleRef.current -= delta * rotationSpeed;

    // Orbit camera around X axis
    const newCamY = Math.cos(orbitAngleRef.current) * cameraRadiusRef.current;
    const newCamZ = Math.sin(orbitAngleRef.current) * cameraRadiusRef.current;

    // Orbit target around X axis to maintain viewing angle
    const newTargetY =
      Math.cos(targetAngleRef.current) * targetRadiusRef.current;
    const newTargetZ =
      Math.sin(targetAngleRef.current) * targetRadiusRef.current;

    // Calculate up vector perpendicular to orbital plane (around X-axis)
    // Up vector should point in the direction perpendicular to the view
    const upY = Math.sin(orbitAngleRef.current);
    const upZ = -Math.cos(orbitAngleRef.current);

    // Update camera position, target, and up vector
    controls.camera.position.set(view.position[0], newCamY, newCamZ);
    controls.camera.up.set(0, upY, upZ);
    controls.camera.lookAt(view.target[0], newTargetY, newTargetZ);
    controls.camera.updateProjectionMatrix();
  });

  return <CameraControls ref={(ref) => setControls(ref)} smoothTime={1.0} />;
}

export const ThreeJsUniverse = () => {
  const edgeBrightness = 0.2;
  const edgeColor = useMemo(
    () =>
      new THREE.Color(
        10 * edgeBrightness,
        1.2 * edgeBrightness,
        7 * edgeBrightness,
      ),
    [],
  );
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
      <Canvas camera={{ fov: 100 }} dpr={[1 / 2, 1]} gl={{ alpha: false }}>
        <CameraRig viewIndex={activeViewIndex} />
        <Detailed distances={[5, 15]}>
          <NoisySphere
            radius={5}
            widthSegments={350}
            heightSegments={70}
            noiseAmount={0.3}
            edgeColor={edgeColor}
          />
          <NoisySphere
            radius={5}
            widthSegments={32}
            heightSegments={32}
            noiseAmount={0.3}
            edgeColor={edgeColor}
          />
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
