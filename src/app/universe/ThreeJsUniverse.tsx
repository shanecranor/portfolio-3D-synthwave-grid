"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
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
import { Detailed, Loader, Stars } from "@react-three/drei";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { RX7Model } from "@/components/3D/RX7Model";
import { CameraRig, VIEWS } from "@/components/3D/CameraRig";

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
        <color attach="background" args={["black"]} />
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
