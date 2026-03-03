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
import { Detailed, Loader, Stars } from "@react-three/drei";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { CameraRig, VIEWS } from "@/components/3D/CameraRig";
import { UniverseTitle } from "@/app/universe/UniverseTitle";
import { UniverseComputer } from "@/components/3D/UniverseComputer";

function RotatingStars() {
  const starfieldRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const starfield = starfieldRef.current;
    if (!starfield) return;

    starfield.rotation.y += delta * 0.03;
    starfield.rotation.x = THREE.MathUtils.lerp(
      starfield.rotation.x,
      0.12,
      1 - Math.exp(-2 * delta),
    );
  });

  return (
    <group ref={starfieldRef}>
      <Stars
        radius={50}
        depth={500}
        count={2000}
        factor={5}
        saturation={1}
        speed={0}
      />
    </group>
  );
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
  const [activeComputerIndex, setActiveComputerIndex] = useState(0);
  const noiseAmount = 0.3;
  const displaceYScale = 0.0;
  const poleNoiseFloor = 0.0;
  const equatorPower = 0.85;
  const yNoiseScale = 0.4;
  const cylinderMorph = 0.25;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setActiveViewIndex((current) => (current + 1) % VIEWS.length);
      }
      if (event.code === "KeyC") {
        event.preventDefault();
        setActiveComputerIndex((current) => (current + 1) % 3);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeView = VIEWS[activeViewIndex];

  return (
    <>
      <Canvas camera={{ fov: 75 }} dpr={[1 / 2, 1]} gl={{ alpha: false }}>
        <color attach="background" args={["black"]} />
        <CameraRig viewIndex={activeViewIndex} />
        <UniverseTitle viewIndex={activeViewIndex} />
        <UniverseComputer
          viewIndex={activeViewIndex}
          modelIndex={activeComputerIndex}
        />
        <Detailed distances={[3, 25]}>
          <NoisySphere
            radius={10}
            widthSegments={350}
            heightSegments={70}
            noiseAmount={noiseAmount}
            edgeColor={edgeColor}
            flatCenter={true}
            poleNoiseFloor={poleNoiseFloor}
            equatorPower={equatorPower}
            yNoiseScale={yNoiseScale}
            displaceYScale={displaceYScale}
            cylinderMorph={cylinderMorph}
          />
          <NoisySphere
            radius={10}
            widthSegments={32}
            heightSegments={32}
            noiseAmount={noiseAmount}
            edgeColor={edgeColor}
            flatCenter={true}
            poleNoiseFloor={poleNoiseFloor}
            equatorPower={equatorPower}
            yNoiseScale={yNoiseScale}
            displaceYScale={displaceYScale}
            cylinderMorph={cylinderMorph}
          />
        </Detailed>
        <RotatingStars />

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
