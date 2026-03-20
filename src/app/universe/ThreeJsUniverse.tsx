"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  CameraRig,
  type CameraHoverFocus,
  VIEWS,
} from "@/components/3D/CameraRig";
import { UniverseTitle } from "@/app/universe/UniverseTitle";
import {
  UniverseBass,
  UniverseComputer,
  UniverseReflexCamera,
  UNIVERSE_COMPUTER_MODEL_COUNT,
} from "@/components/3D/UniverseComputer";
import { UniverseHudOverlay } from "@/app/universe/UniverseHudOverlay";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";
import { useRouter } from "next/navigation";

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
// const EDGE_COLOR = [245, 61, 171]; //[247, 100, 188];
const EDGE_COLOR = [209, 109, 169];
const SPHERE_GLOW_COLOR = [69, 49, 99];

const UniverseBackdrop = memo(function UniverseBackdrop({
  edgeColor,
  noiseAmount,
  poleNoiseFloor,
  equatorPower,
  yNoiseScale,
  displaceYScale,
  cylinderMorph,
  glowColor,
}: {
  edgeColor: THREE.Color;
  noiseAmount: number;
  poleNoiseFloor: number;
  equatorPower: number;
  yNoiseScale: number;
  displaceYScale: number;
  cylinderMorph: number;
  glowColor?: THREE.Color;
}) {
  return (
    <>
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
      <GlowSphere radius={10} glowColor={glowColor} />
      <RotatingStars />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0}
          intensity={1.2}
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
        <BrightnessContrast brightness={0} contrast={0.14} />
        <Scanline density={1} opacity={0.1} scrollSpeed={0.01} />
      </EffectComposer>
    </>
  );
});

export const ThreeJsUniverse = () => {
  const router = useRouter();
  const edgeBrightness = 1.0;
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
  const [hoverState, setHoverState] = useState<{
    sectionId: UniverseSectionId;
    focus: CameraHoverFocus;
  } | null>(null);
  const [isGlowVisible, setIsGlowVisible] = useState(true);
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
  const initialView = VIEWS[0];
  const hoveredSection = hoverState
    ? UNIVERSE_SECTIONS[hoverState.sectionId]
    : null;
  const isComputerHovered = hoverState?.sectionId === "projects";

  const handleSectionHoverStateChange = useCallback((
    sectionId: UniverseSectionId,
    isHovered: boolean,
    focus: CameraHoverFocus,
  ) => {
    setHoverState((current) => {
      if (isHovered) {
        return { sectionId, focus };
      }

      if (current?.sectionId !== sectionId) {
        return current;
      }

      return null;
    });
  }, []);

  const handleSectionSelect = useCallback((sectionId: UniverseSectionId) => {
    const section = UNIVERSE_SECTIONS[sectionId];

    if (section.external) {
      window.location.assign(section.href);
      return;
    }

    router.push(section.href);
  }, [router]);

  return (
    <div
      className={`universe-shell${isComputerHovered ? " is-computer-hovered" : ""}`}
    >
      <Canvas
        camera={{ fov: 75, position: initialView.position }}
        dpr={[1 / 2, 1]}
        gl={{ alpha: false }}
      >
        <color attach="background" args={["black"]} />
        <CameraRig
          viewIndex={activeViewIndex}
          manualControlEnabled={isTrackballView}
          hoverFocus={hoverState?.focus ?? null}
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
        <UniverseReflexCamera
          viewIndex={activeViewIndex}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
        />
        <UniverseComputer
          viewIndex={activeViewIndex}
          modelIndex={activeComputerIndex}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
        />
        <UniverseBass
          viewIndex={activeViewIndex}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
        />
        <UniverseBackdrop
          edgeColor={edgeColor}
          noiseAmount={noiseAmount}
          poleNoiseFloor={poleNoiseFloor}
          equatorPower={equatorPower}
          yNoiseScale={yNoiseScale}
          displaceYScale={displaceYScale}
          cylinderMorph={cylinderMorph}
          glowColor={isGlowVisible ? sphereGlowColor : undefined}
        />
      </Canvas>

      <div
        className={`universe-phosphor-pass${isComputerHovered ? " is-active" : ""}`}
        aria-hidden="true"
      />
      <CodeSnippetsOverlay active={isComputerHovered} />
      <UniverseHudOverlay section={hoveredSection} />

      {activeView && (
        <div
          className="universe-view-indicator"
          style={{ position: "absolute", top: 20, left: 20, color: "white" }}
        >
          {`${activeView.label}`}
        </div>
      )}
      <Loader />
    </div>
  );
};
