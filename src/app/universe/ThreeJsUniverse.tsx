"use client";
import { useEffect, useState } from "react";
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
import { SynthwaveGrid } from "@/components/3D/SynthwaveGrid";
import {
  Cloud,
  Clouds,
  Edges,
  GradientTexture,
  Loader,
  OrbitControls,
  Stars,
  // Stats,
} from "@react-three/drei";
function SetCameraPosition() {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.set(0.25, 0, 0);
  }, [camera]);

  return null;
}

export const ThreeJsUniverse = () => {
  return (
    <>
      <Canvas
        dpr={[0.25 / 2, 0.5 / 2]}
        gl={{ alpha: false }}
        suppressHydrationWarning
      >
        <OrbitControls />
        <mesh>
          <icosahedronGeometry args={[4, 1]} />
          <meshBasicMaterial color={[0, 0, 0]} />
          <Edges lineWidth={2} scale={1} color={[10, 0.9, 7]}>
            <meshBasicMaterial />
          </Edges>
        </mesh>
        {/* <Stats /> */}
        {/* <SetCameraPosition /> */}
        {/* 
        <Stars
          radius={50}
          depth={500}
          count={2000}
          factor={5}
          saturation={1}
          speed={1}
        /> */}

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
      <Loader />
    </>
  );
};
