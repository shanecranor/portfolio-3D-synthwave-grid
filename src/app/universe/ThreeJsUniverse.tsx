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
import { HackerSymbolRain } from "@/components/3D/HackerSymbolRain";
import { GlowSphere } from "@/components/3D/GlowSphere";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { UniversePerformanceProfiler } from "@/components/3D/UniversePerformanceProfiler";
import {
  UniverseBass,
  UniverseComputer,
  UniverseReflexCamera,
} from "@/components/3D/UniverseComputer";
import { UniverseTitle } from "@/app/universe/UniverseTitle";
import {
  createHueShiftedColor,
  DEFAULT_SPHERE_GLOW_COLOR,
  DEFAULT_SPHERE_TERRAIN_COLOR,
} from "@/components/3D/universeSphereColor";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";

const NAVIGATION_SURGE_MS = 360;
type ThreeJsUniverseProps = {
  activeSectionId: UniverseSectionId | null;
  revealProgress: Record<"intro" | UniverseSectionId, number>;
  spherePosition: [number, number, number];
  sphereHue: number;
  sphereColorSaturationMultiplier: number;
  actionHoverSectionId: UniverseSectionId | null;
};

function RotatingStars() {
  const starfieldRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const starfield = starfieldRef.current;
    if (!starfield) return;

    starfield.rotation.x += delta * 0.008;
    // starfield.rotation.x = THREE.MathUtils.lerp(
    //   starfield.rotation.x,
    //   0.12,
    //   1 - Math.exp(-2 * delta),
    // );
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
  spherePosition,
}: {
  edgeColor: THREE.Color;
  glowColor: THREE.Color;
  spherePosition: [number, number, number];
}) {
  return (
    <>
      <group position={spherePosition}>
        <Detailed distances={[3, 25]}>
          <NoisySphere
            radius={10}
            widthSegments={160}
            heightSegments={61}
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
            heightSegments={19}
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
      </group>

      <EffectComposer>
        <Bloom
          luminanceThreshold={0}
          intensity={0.86}
          levels={6}
          mipmapBlur
          opacity={0.72}
        />
        <Noise opacity={0.026} blendFunction={BlendFunction.PIN_LIGHT} />
        <Scanline density={1} opacity={0.1} scrollSpeed={0} />
        <Vignette
          offset={0.32}
          darkness={0.68}
          blendFunction={BlendFunction.DARKEN}
        />
        <BrightnessContrast brightness={-0.01} contrast={0.1} />
      </EffectComposer>
    </>
  );
});

export function ThreeJsUniverse({
  activeSectionId,
  revealProgress,
  spherePosition,
  sphereHue,
  sphereColorSaturationMultiplier,
  actionHoverSectionId,
}: ThreeJsUniverseProps) {
  const router = useRouter();
  const edgeColor = useMemo(
    () =>
      createHueShiftedColor(
        DEFAULT_SPHERE_TERRAIN_COLOR,
        sphereHue,
        sphereColorSaturationMultiplier,
      ),
    [sphereColorSaturationMultiplier, sphereHue],
  );
  const sphereGlowColor = useMemo(
    () => createHueShiftedColor(DEFAULT_SPHERE_GLOW_COLOR, sphereHue),
    [sphereHue],
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
      if (navigationTimeoutRef.current || sectionId !== activeSectionId) {
        return;
      }

      const section = UNIVERSE_SECTIONS[sectionId];
      if (section.type !== "full") return;

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

  const highlightedSectionId =
    actionHoverSectionId ?? hoverState?.sectionId ?? null;
  const accentSection = highlightedSectionId ?? activeSectionId;
  const accent = accentSection ? UNIVERSE_SECTIONS[accentSection] : null;
  const shellStyle = useMemo(
    () =>
      ({
        "--universe-wireframe-green": accent?.accent ?? "#73d1ad",
        "--universe-wireframe-green-rgb": accent?.accentRgb ?? "115, 209, 173",
      }) as CSSProperties,
    [accent],
  );

  return (
    <div
      className={`universe-shell${
        hoverState || actionHoverSectionId ? " is-tuning" : ""
      }${surgingSectionId ? " is-routing" : ""}`}
      style={shellStyle}
    >
      <Canvas
        camera={{ fov: 75, position: [0, 10.3, 0] }}
        dpr={[0.5, 2]}
        // gl={{ alpha: false, antialias: true }}
      >
        <UniversePerformanceProfiler />
        <color attach="background" args={["#020105"]} />
        <CameraRig viewIndex={0} hoverFocus={hoverState?.focus ?? null} />
        <UniverseTitle revealProgress={revealProgress.intro} />
        <UniverseReflexCamera
          viewIndex={0}
          visible={activeSectionId === "photography"}
          revealProgress={revealProgress.photography}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={highlightedSectionId}
          surgingSectionId={surgingSectionId}
        />
        <UniverseComputer
          viewIndex={0}
          modelIndex={0}
          visible={activeSectionId === "projects"}
          revealProgress={revealProgress.projects}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={highlightedSectionId}
          surgingSectionId={surgingSectionId}
        />
        <group position={spherePosition}>
          <HackerSymbolRain active={highlightedSectionId === "projects"} />
        </group>
        <UniverseBass
          viewIndex={0}
          visible={activeSectionId === "music"}
          revealProgress={revealProgress.music}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={highlightedSectionId}
          surgingSectionId={surgingSectionId}
        />
        <UniverseBackdrop
          edgeColor={edgeColor}
          glowColor={sphereGlowColor}
          spherePosition={spherePosition}
        />
      </Canvas>
      <Loader />
    </div>
  );
}
