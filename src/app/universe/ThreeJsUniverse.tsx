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
import { Detailed, Loader, Stars } from "@react-three/drei";
import { BlendFunction } from "postprocessing";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { CameraRig, type CameraHoverFocus } from "@/components/3D/CameraRig";
import { GlowSphere } from "@/components/3D/GlowSphere";
import { NoisySphere } from "@/components/3D/NoisySphere";
import {
  UniverseBass,
  UniverseComputer,
  UniverseReflexCamera,
} from "@/components/3D/UniverseComputer";
import { UniverseTitle } from "@/app/universe/UniverseTitle";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";

const NAVIGATION_SURGE_MS = 360;
const TERRAIN_COLOR = [194, 91, 163];
const SPHERE_GLOW_COLOR = [55, 35, 83];

type ThreeJsUniverseProps = {
  activeSectionId: UniverseSectionId | null;
};

function RotatingStars() {
  const starfieldRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const starfield = starfieldRef.current;
    if (!starfield) return;

    starfield.rotation.y += delta * 0.018;
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
        count={1300}
        factor={4}
        saturation={0.8}
        speed={0}
      />
    </group>
  );
}

const UniverseBackdrop = memo(function UniverseBackdrop({
  edgeColor,
  glowColor,
}: {
  edgeColor: THREE.Color;
  glowColor: THREE.Color;
}) {
  return (
    <>
      <Detailed distances={[3, 25]}>
        <NoisySphere
          radius={10}
          widthSegments={140}
          heightSegments={34}
          noiseAmount={0.24}
          edgeColor={edgeColor}
          edgeOpacity={0.62}
          flatCenter
          poleNoiseFloor={0}
          equatorPower={0.85}
          yNoiseScale={0.4}
          displaceYScale={0}
          cylinderMorph={0.25}
          rotateAnimation={[0.006, 0, 0]}
        />
        <NoisySphere
          radius={10}
          widthSegments={36}
          heightSegments={18}
          noiseAmount={0.24}
          edgeColor={edgeColor}
          edgeOpacity={0.5}
          flatCenter
          poleNoiseFloor={0}
          equatorPower={0.85}
          yNoiseScale={0.4}
          displaceYScale={0}
          cylinderMorph={0.25}
          rotateAnimation={[0.006, 0, 0]}
        />
      </Detailed>
      <GlowSphere
        radius={10}
        glowColor={glowColor}
        glowOpacity={0.08}
        glowSpread={2.8}
      />
      <RotatingStars />

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0}
          intensity={0.86}
          levels={6}
          mipmapBlur
          opacity={0.72}
        />
        <Noise opacity={0.008} />
        <Vignette
          offset={0.32}
          darkness={0.68}
          blendFunction={BlendFunction.DARKEN}
        />
        <BrightnessContrast brightness={-0.01} contrast={0.1} />
        <Scanline density={1} opacity={0.065} scrollSpeed={0.006} />
      </EffectComposer>
    </>
  );
});

export function ThreeJsUniverse({ activeSectionId }: ThreeJsUniverseProps) {
  const router = useRouter();
  const edgeColor = useMemo(
    () => new THREE.Color(...TERRAIN_COLOR.map((channel) => channel / 255)),
    [],
  );
  const sphereGlowColor = useMemo(
    () => new THREE.Color(...SPHERE_GLOW_COLOR.map((channel) => channel / 255)),
    [],
  );
  const [hoverState, setHoverState] = useState<{
    sectionId: UniverseSectionId;
    focus: CameraHoverFocus;
  } | null>(null);
  const [surgingSectionId, setSurgingSectionId] =
    useState<UniverseSectionId | null>(null);
  const navigationTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHoverState((current) =>
        current?.sectionId === activeSectionId ? current : null,
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSectionId]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleSectionHoverStateChange = useCallback(
    (
      sectionId: UniverseSectionId,
      isHovered: boolean,
      focus: CameraHoverFocus,
    ) => {
      if (navigationTimeoutRef.current || sectionId !== activeSectionId) return;

      setHoverState((current) => {
        if (isHovered) return { sectionId, focus };
        return current?.sectionId === sectionId ? null : current;
      });
    },
    [activeSectionId],
  );

  const handleSectionSelect = useCallback(
    (sectionId: UniverseSectionId, focus: CameraHoverFocus) => {
      if (
        navigationTimeoutRef.current ||
        sectionId !== activeSectionId
      ) {
        return;
      }

      const section = UNIVERSE_SECTIONS[sectionId];
      setHoverState({ sectionId, focus });
      setSurgingSectionId(sectionId);

      navigationTimeoutRef.current = window.setTimeout(() => {
        navigationTimeoutRef.current = undefined;
        if (section.external) {
          window.location.assign(section.href);
        } else {
          router.push(section.href);
        }
      }, NAVIGATION_SURGE_MS);
    },
    [activeSectionId, router],
  );

  const accentSection = hoverState?.sectionId ?? activeSectionId;
  const accent = accentSection ? UNIVERSE_SECTIONS[accentSection] : null;
  const shellStyle = useMemo(
    () =>
      ({
        "--universe-wireframe-green": accent?.accent ?? "#73d1ad",
        "--universe-wireframe-green-rgb":
          accent?.accentRgb ?? "115, 209, 173",
      }) as CSSProperties,
    [accent],
  );

  return (
    <div
      className={`universe-shell${hoverState ? " is-tuning" : ""}${
        surgingSectionId ? " is-routing" : ""
      }`}
      style={shellStyle}
    >
      <Canvas
        camera={{ fov: 75, position: [0, 10.3, 0] }}
        dpr={[0.6, 1.25]}
        gl={{ alpha: false, antialias: true }}
      >
        <color attach="background" args={["#020105"]} />
        <CameraRig viewIndex={0} hoverFocus={hoverState?.focus ?? null} />
        <UniverseTitle visible={activeSectionId === null} />
        <UniverseReflexCamera
          viewIndex={0}
          visible={activeSectionId === "photography"}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={hoverState?.sectionId ?? null}
          surgingSectionId={surgingSectionId}
        />
        <UniverseComputer
          viewIndex={0}
          modelIndex={0}
          visible={activeSectionId === "projects"}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={hoverState?.sectionId ?? null}
          surgingSectionId={surgingSectionId}
        />
        <UniverseBass
          viewIndex={0}
          visible={activeSectionId === "music"}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={hoverState?.sectionId ?? null}
          surgingSectionId={surgingSectionId}
        />
        <UniverseBackdrop edgeColor={edgeColor} glowColor={sphereGlowColor} />
      </Canvas>
      <Loader />
    </div>
  );
}
