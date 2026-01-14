"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  GradientTexture,
  Loader,
  Stars,
  // Stats,
} from "@react-three/drei";
import { Background } from "@/components/3D/Background";
import { FastVhsEffect } from "@/components/3D/effects/FastVhsEffect";
import { Perf } from "r3f-perf";
class GlowMaterial extends THREE.MeshBasicMaterial {
  constructor() {
    super();
    // Set custom properties
    this.blending = THREE.AdditiveBlending;
    // ... other customizations
  }
}
function SetCameraPosition() {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.set(0.25, 0, 0);
  }, [camera]);

  return null;
}

export const ThreeJsCanvas = () => {
  const [effectMode, setEffectMode] = useState<"classic" | "fast">("fast");
  const [windowDimensions, setWindowDimensions] = useState(
    typeof window !== "undefined"
      ? {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.innerWidth / window.innerHeight,
      }
      : { width: 1920, height: 1080, ratio: 1920 / 1080 }
  );
  const isClassicEffect = effectMode === "classic";
  const toggleEffectMode = useCallback(() => {
    setEffectMode((prev) => (prev === "classic" ? "fast" : "classic"));
  }, []);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key.toLowerCase() === "c") {
        toggleEffectMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleEffectMode]);
  const postProcessing = useMemo(() => {
    if (isClassicEffect) {
      return (
        <EffectComposer>
          <Bloom
            luminanceThreshold={2}
            luminanceSmoothing={2}
            intensity={0.6}
            levels={4}
            radius={0.4}
            mipmapBlur={true}
            opacity={0.2}
          />
          <Bloom
            luminanceThreshold={0}
            luminanceSmoothing={0}
            intensity={0.3}
            levels={9}
            radius={0.6}
            mipmapBlur={true}
            opacity={1}
          />
          <Noise opacity={0.01} />

          <Vignette
            offset={0.4}
            darkness={0.6}
            eskil={false}
            blendFunction={BlendFunction.DARKEN}
          />

          <BrightnessContrast brightness={0} contrast={0.1} />
          <Scanline density={1} opacity={0.1} scrollSpeed={0.01} />
        </EffectComposer>
      );
    }

    return (
      <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
        <FastVhsEffect vignetteStrength={2} />
      </EffectComposer>
    );
  }, [isClassicEffect]);
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.innerWidth / window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (<div style={{ position: "relative", minHeight: "100vh" }}>
    <Canvas
      dpr={[0.5, 1]}
      suppressHydrationWarning
      style={{ width: "100%", height: "100%" }}
    >
      <Perf position="top-right" />
      {/* <Stats /> */}
      <SetCameraPosition />
      <Background windowDimensions={windowDimensions} />
      <Stars
        radius={50}
        depth={500}
        count={2000}
        factor={5}
        saturation={1}
        speed={1}
      />
      {/* <ambientLight intensity={2.0} /> */}
      <ambientLight intensity={1.0} />
      {postProcessing}
      <Clouds limit={300} material={GlowMaterial}>
        <Cloud
          seed={129}
          segments={50}
          bounds={[50 * windowDimensions.ratio, 3 * windowDimensions.ratio, 10]}
          growth={2}
          position={[-40 * windowDimensions.ratio, 0, -80]}
          volume={40 * (windowDimensions.ratio * 1.3)}
          color={[1400, 100, 1400]}
          speed={0.1}
          opacity={0.00001}
        />
        <Cloud
          seed={9189}
          segments={50}
          bounds={[50 * windowDimensions.ratio, 3 * windowDimensions.ratio, 10]}
          growth={2}
          position={[40 * windowDimensions.ratio, 0, -80]}
          volume={40 * (windowDimensions.ratio * 1.3)}
          color={[100, 500, 1400]}
          speed={0.1}
          opacity={0.00001}
        />

        <Cloud
          seed={169}
          segments={60}
          bounds={[80 * windowDimensions.ratio, 30, 9]}
          growth={2}
          position={[40 * windowDimensions.ratio, 40, -50]}
          volume={100}
          color={[50 / 4, 100 / 4, 400 / 4]}
          speed={0.01}
          opacity={0.0001}
        />
        <Cloud
          seed={169}
          segments={60}
          bounds={[80 * windowDimensions.ratio, 30, 9]}
          growth={2}
          position={[-40 * windowDimensions.ratio, 40, -50]}
          volume={100}
          color={[100 / 4, 0, 100 / 4]}
          speed={0.01}
          opacity={0.0001}
        />
      </Clouds>
      {/* BLACK PHYSICAL GROUND */}
      <mesh
        scale={250}
        position={[0, -1.2, -50]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <planeGeometry />
        <meshBasicMaterial blending={THREE.NoBlending} color={[0, 0, 0]} />
      </mesh>

      <mesh
        scale={[90, 200 * windowDimensions.ratio, 1]}
        position={[0, -46, -100]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <planeGeometry />
        <meshBasicMaterial
          // blending={THREE.NormalBlending}
          color={[3, 2, 3]}
          depthTest={false}
          depthWrite={false}
        >
          <GradientTexture
            stops={[0, 1]} // As many stops as you want
            colors={["#4d003d", "#002440"]} // Colors need to match the number of stops
            size={1024} // Size is optional, default = 1024
          />
        </meshBasicMaterial>
      </mesh>

      <SynthwaveGrid
        color={[15, 2, 20]}
        endColor={[0, 10, 10]}
        position={[0, -1.2, -80]}
      />
    </Canvas>
    <button
      type="button"
      onClick={toggleEffectMode}
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        zIndex: 20,
        padding: "0.5rem 1rem",
        background: "rgba(17, 17, 17, 0.75)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "999px",
        cursor: "pointer",
        fontSize: "0.85rem",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",
      }}
    >
      {isClassicEffect ? "Switch to fast VHS" : "Switch to classic bloom"}
    </button>
    <Loader />
  </div>
  );
};
