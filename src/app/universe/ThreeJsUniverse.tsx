"use client";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

  const isTrackballView = activeViewIndex === 2;
  const initialView = VIEWS[0];
  const hoveredSection = hoverState
    ? UNIVERSE_SECTIONS[hoverState.sectionId]
    : null;
  const isTuning = Boolean(hoveredSection);
  const shellStyle = useMemo(
    () =>
      ({
        "--universe-wireframe-green": hoveredSection?.accent ?? "#73d1ad",
        "--universe-wireframe-green-rgb":
          hoveredSection?.accentRgb ?? "115, 209, 173",
      }) as CSSProperties,
    [hoveredSection],
  );

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
      className={`universe-shell${isTuning ? " is-tuning" : ""}`}
      style={shellStyle}
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
        className={`universe-phosphor-pass${isTuning ? " is-active" : ""}`}
        aria-hidden="true"
      />
      <UniverseHudOverlay section={hoveredSection} />

      <Loader />
    </div>
  );
};
