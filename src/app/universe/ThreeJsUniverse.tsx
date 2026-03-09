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
import { Detailed, Loader, Stars, TrackballControls } from "@react-three/drei";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { GlowSphere } from "@/components/3D/GlowSphere";
import { CameraRig, VIEWS } from "@/components/3D/CameraRig";
import { UniverseTitle } from "@/app/universe/UniverseTitle";
import {
  UniverseBass,
  UniverseComputer,
  UniverseReflexCamera,
  UNIVERSE_COMPUTER_MODEL_COUNT,
} from "@/components/3D/UniverseComputer";

const CODE_SNIPPETS = [
  "const signal = await universe.boot({ target: 'shane.cranor.org' });",
  "camera.position.lerp(desiredPos, 1 - Math.exp(-4 * delta));",
  "if (hoveredComputer) overlay.tint = '#66ff99';",
  "glitchBuffer.push(renderFrame({ phosphor: true, bloom: 0.9 }));",
  `const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: wireframeColor,
        wireframe: true,
        transparent: true,
        opacity: wireframeOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })`,

  "requestAnimationFrame(() => stars.rotateY(0.03 * delta));",
];

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

function CodeSnippetsOverlay({ active }: { active: boolean }) {
  const snippetNodes = useMemo(() => {
    return CODE_SNIPPETS.map((snippet, index) => ({
      id: `${index}-${snippet}`,
      snippet,
      style: {
        left: `${8 + (index % 4) * 22}%`,
        top: `${12 + index * 10}%`,
        animationDelay: `${index * 0.35}s`,
        animationDuration: `${8 + (index % 3) * 2.5}s`,
      },
    }));
  }, []);

  return (
    <div
      className={`universe-code-overlay${active ? " is-active" : ""}`}
      aria-hidden="true"
    >
      {snippetNodes.map(({ id, snippet, style }) => (
        <pre className="universe-code-snippet" key={id} style={style}>
          {snippet}
        </pre>
      ))}
    </div>
  );
}
const EDGE_COLOR = [245, 61, 171]; //[247, 100, 188];
const SPHERE_GLOW_COLOR = [69, 49, 99];

type GlowTuningState = {
  glowOpacity: number;
  glowPower: number;
  glowEdgePower: number;
  fogStrength: number;
  fogScale: number;
  fogSpeed: number;
  fogContrast: number;
  fogBrightness: number;
};

const DEFAULT_GLOW_SETTINGS: GlowTuningState = {
  glowOpacity: 0.22,
  glowPower: 30,
  glowEdgePower: 100,
  fogStrength: 0.62,
  fogScale: 1.8,
  fogSpeed: 0.018,
  fogContrast: 1.8,
  fogBrightness: 1.0,
};

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="universe-control">
      <span className="universe-control__label">
        <span>{label}</span>
        <span className="universe-control__value">{value.toFixed(3)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export const ThreeJsUniverse = () => {
  const edgeBrightness = 2.3;
  const edgeColor = useMemo(
    () => new THREE.Color(...EDGE_COLOR.map((c) => (c / 255) * edgeBrightness)),
    [],
  );
  const sphereGlowColor = useMemo(
    () => new THREE.Color(...SPHERE_GLOW_COLOR.map((c) => c / 255)),
    [],
  );
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [activeComputerIndex, setActiveComputerIndex] = useState(0);
  const [isComputerHovered, setIsComputerHovered] = useState(false);
  const [isGlowVisible, setIsGlowVisible] = useState(true);
  const [glowSettings, setGlowSettings] =
    useState<GlowTuningState>(DEFAULT_GLOW_SETTINGS);
  const noiseAmount = 0.3;
  const displaceYScale = 0.0;
  const poleNoiseFloor = 0.0;
  const equatorPower = 0.85;
  const yNoiseScale = 0.4;
  const cylinderMorph = 0.25;

  const setGlowSetting = (key: keyof GlowTuningState, value: number) => {
    setGlowSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setActiveViewIndex((current) => (current + 1) % VIEWS.length);
      }
      if (event.code === "KeyC") {
        event.preventDefault();
        setActiveComputerIndex(
          (current) => (current + 1) % UNIVERSE_COMPUTER_MODEL_COUNT,
        );
      }
      if (event.code === "KeyG") {
        event.preventDefault();
        setIsGlowVisible((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeView = VIEWS[activeViewIndex];
  const isTrackballView = activeViewIndex === 2;

  return (
    <div
      className={`universe-shell${isComputerHovered ? " is-computer-hovered" : ""}`}
    >
      <Canvas camera={{ fov: 75 }} dpr={[1 / 2, 1]} gl={{ alpha: false }}>
        <color attach="background" args={["black"]} />
        <CameraRig
          viewIndex={activeViewIndex}
          manualControlEnabled={isTrackballView}
        />
        {isTrackballView && (
          <TrackballControls
            rotateSpeed={2.5}
            zoomSpeed={1.2}
            panSpeed={0.8}
            dynamicDampingFactor={0.15}
          />
        )}
        <UniverseTitle viewIndex={activeViewIndex} />
        <UniverseReflexCamera viewIndex={activeViewIndex} />
        <UniverseComputer
          viewIndex={activeViewIndex}
          modelIndex={activeComputerIndex}
          onHoverChange={setIsComputerHovered}
        />
        <UniverseBass viewIndex={activeViewIndex} />
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
        <GlowSphere
          radius={10}
          glowColor={isGlowVisible ? sphereGlowColor : undefined}
          glowOpacity={glowSettings.glowOpacity}
          glowPower={glowSettings.glowPower}
          glowEdgePower={glowSettings.glowEdgePower}
          fogStrength={glowSettings.fogStrength}
          fogScale={glowSettings.fogScale}
          fogSpeed={glowSettings.fogSpeed}
          fogContrast={glowSettings.fogContrast}
          fogBrightness={glowSettings.fogBrightness}
        />
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

      <div
        className={`universe-phosphor-pass${isComputerHovered ? " is-active" : ""}`}
        aria-hidden="true"
      />
      <CodeSnippetsOverlay active={isComputerHovered} />

      {activeView && (
        <div
          className="universe-view-indicator"
          style={{ position: "absolute", top: 20, left: 20, color: "white" }}
        >
          {`${activeView.label}`}
        </div>
      )}
      <div className="universe-controls">
        <div className="universe-controls__header">
          <span className="universe-controls__title">Glow Fog</span>
          <button
            type="button"
            className="universe-controls__button"
            onClick={() => setGlowSettings(DEFAULT_GLOW_SETTINGS)}
          >
            Reset
          </button>
        </div>
        <button
          type="button"
          className="universe-controls__button universe-controls__button--toggle"
          onClick={() => setIsGlowVisible((current) => !current)}
        >
          Glow {isGlowVisible ? "On" : "Off"}
        </button>
        <SliderControl
          label="Opacity"
          value={glowSettings.glowOpacity}
          min={0}
          max={0.5}
          step={0.005}
          onChange={(value) => setGlowSetting("glowOpacity", value)}
        />
        <SliderControl
          label="Fog Strength"
          value={glowSettings.fogStrength}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setGlowSetting("fogStrength", value)}
        />
        <SliderControl
          label="Fog Scale"
          value={glowSettings.fogScale}
          min={0.2}
          max={4}
          step={0.05}
          onChange={(value) => setGlowSetting("fogScale", value)}
        />
        <SliderControl
          label="Fog Speed"
          value={glowSettings.fogSpeed}
          min={0}
          max={0.12}
          step={0.002}
          onChange={(value) => setGlowSetting("fogSpeed", value)}
        />
        <SliderControl
          label="Fog Contrast"
          value={glowSettings.fogContrast}
          min={0.5}
          max={4}
          step={0.05}
          onChange={(value) => setGlowSetting("fogContrast", value)}
        />
        <SliderControl
          label="Fog Brightness"
          value={glowSettings.fogBrightness}
          min={0.25}
          max={3}
          step={0.05}
          onChange={(value) => setGlowSetting("fogBrightness", value)}
        />
        <SliderControl
          label="Glow Power"
          value={glowSettings.glowPower}
          min={1}
          max={80}
          step={1}
          onChange={(value) => setGlowSetting("glowPower", value)}
        />
        <SliderControl
          label="Edge Power"
          value={glowSettings.glowEdgePower}
          min={1}
          max={180}
          step={1}
          onChange={(value) => setGlowSetting("glowEdgePower", value)}
        />
      </div>
      <Loader />
    </div>
  );
};
