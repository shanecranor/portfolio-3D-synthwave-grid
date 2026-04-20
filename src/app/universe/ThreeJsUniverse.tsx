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
import { UniverseSkyDome } from "@/components/3D/UniverseSkyDome";
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
import {
  HUD_FONT_OPTIONS,
  type HudFontOption,
  UniverseHudOverlay,
} from "@/app/universe/UniverseHudOverlay";
import { UniverseAppearanceEditor } from "@/app/universe/UniverseAppearanceEditor";
import {
  DEFAULT_UNIVERSE_APPEARANCE,
  type UniverseAppearanceSettings,
} from "@/app/universe/universeAppearance";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";
import { useRouter } from "next/navigation";

const NAVIGATION_SURGE_MS = 420;
const EXPORT_STATUS_TIMEOUT_MS = 2200;

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function UniverseSceneFog({
  color,
  near,
  far,
}: {
  color: UniverseAppearanceSettings["fogColor"];
  near: UniverseAppearanceSettings["fogNear"];
  far: UniverseAppearanceSettings["fogFar"];
}) {
  return <fog attach="fog" args={[color, near, far]} />;
}

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
const UniverseBackdrop = memo(function UniverseBackdrop({
  noiseAmount,
  poleNoiseFloor,
  equatorPower,
  yNoiseScale,
  displaceYScale,
  cylinderMorph,
  appearance,
  glowVisible,
}: {
  noiseAmount: number;
  poleNoiseFloor: number;
  equatorPower: number;
  yNoiseScale: number;
  displaceYScale: number;
  cylinderMorph: number;
  appearance: UniverseAppearanceSettings;
  glowVisible: boolean;
}) {
  const edgeColor = useMemo(
    () => new THREE.Color(appearance.wireframeColor),
    [appearance.wireframeColor],
  );
  const sphereFillColor = useMemo(
    () => new THREE.Color(appearance.sphereBaseColor),
    [appearance.sphereBaseColor],
  );
  const glowColor = useMemo(() => {
    if (!glowVisible) {
      return undefined;
    }

    return new THREE.Color(appearance.sphereGlowColor);
  }, [appearance.sphereGlowColor, glowVisible]);

  return (
    <>
      <UniverseSkyDome
        topColor={appearance.skyTopColor}
        bottomColor={appearance.skyBottomColor}
        horizonColor={appearance.horizonColor}
        horizonGlowColor={appearance.horizonGlowColor}
        glowStrength={appearance.horizonGlowStrength}
      />
      <Detailed distances={[3, 25]}>
        <NoisySphere
          radius={10}
          widthSegments={350}
          heightSegments={70}
          noiseAmount={noiseAmount}
          fillColor={sphereFillColor}
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
          fillColor={sphereFillColor}
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
        glowColor={glowColor}
        glowOpacity={appearance.sphereGlowOpacity}
      />
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
          offset={0.1}
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
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [activeComputerIndex, setActiveComputerIndex] = useState(0);
  const [appearance, setAppearance] = useState<UniverseAppearanceSettings>(
    DEFAULT_UNIVERSE_APPEARANCE,
  );
  const [isAppearanceEditorVisible, setIsAppearanceEditorVisible] =
    useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const hudFontOption: HudFontOption = HUD_FONT_OPTIONS[0];
  const [hoverState, setHoverState] = useState<{
    sectionId: UniverseSectionId;
    focus: CameraHoverFocus;
  } | null>(null);
  const [hudState, setHudState] = useState<{
    sectionId: UniverseSectionId;
    focus: CameraHoverFocus;
  } | null>(null);
  const [isGlowVisible, setIsGlowVisible] = useState(true);
  const hudExitTimeoutRef = useRef<number | undefined>(undefined);
  const navigationTimeoutRef = useRef<number | undefined>(undefined);
  const exportStatusTimeoutRef = useRef<number | undefined>(undefined);
  const [surgingSectionId, setSurgingSectionId] =
    useState<UniverseSectionId | null>(null);
  const noiseAmount = 0.3;
  const displaceYScale = 0.0;
  const poleNoiseFloor = 0.0;
  const equatorPower = 0.85;
  const yNoiseScale = 0.4;
  const cylinderMorph = 0.25;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

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
      if (event.code === "KeyE") {
        event.preventDefault();
        setIsAppearanceEditorVisible((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isTrackballView = activeViewIndex === 2;
  const initialView = VIEWS[0];
  useEffect(() => {
    return () => {
      if (hudExitTimeoutRef.current) {
        window.clearTimeout(hudExitTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
      if (exportStatusTimeoutRef.current) {
        window.clearTimeout(exportStatusTimeoutRef.current);
      }
    };
  }, []);

  const activeSectionId = surgingSectionId ?? hoverState?.sectionId ?? null;
  const hoveredSection = activeSectionId
    ? UNIVERSE_SECTIONS[activeSectionId]
    : null;
  const hudSection = hudState ? UNIVERSE_SECTIONS[hudState.sectionId] : null;
  const isTuning = Boolean(activeSectionId);
  const isSurging = Boolean(surgingSectionId);
  const shellStyle = useMemo(
    () =>
      ({
        "--universe-wireframe-green": hoveredSection?.accent ?? "#73d1ad",
        "--universe-wireframe-green-rgb":
          hoveredSection?.accentRgb ?? "115, 209, 173",
      }) as CSSProperties,
    [hoveredSection],
  );

  const setFlashStatus = useCallback((message: string) => {
    if (exportStatusTimeoutRef.current) {
      window.clearTimeout(exportStatusTimeoutRef.current);
    }

    setExportStatus(message);
    exportStatusTimeoutRef.current = window.setTimeout(() => {
      setExportStatus(null);
      exportStatusTimeoutRef.current = undefined;
    }, EXPORT_STATUS_TIMEOUT_MS);
  }, []);

  const handleAppearanceColorChange = useCallback(
    (
      key:
        | "backgroundColor"
        | "skyTopColor"
        | "skyBottomColor"
        | "horizonColor"
        | "horizonGlowColor"
        | "fogColor"
        | "sphereBaseColor"
        | "wireframeColor"
        | "sphereGlowColor",
      value: string,
    ) => {
      setAppearance((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const handleAppearanceNumberChange = useCallback(
    (
      key:
        | "horizonGlowStrength"
        | "sphereGlowOpacity"
        | "fogNear"
        | "fogFar",
      value: number,
    ) => {
      setAppearance((current) => {
        if (key === "fogNear") {
          return {
            ...current,
            fogNear: Math.min(value, current.fogFar - 1),
          };
        }

        if (key === "fogFar") {
          return {
            ...current,
            fogFar: Math.max(value, current.fogNear + 1),
          };
        }

        return {
          ...current,
          [key]: value,
        };
      });
    },
    [],
  );

  const handleAppearanceReset = useCallback(() => {
    setAppearance(DEFAULT_UNIVERSE_APPEARANCE);
    setFlashStatus("Universe appearance reset");
  }, [setFlashStatus]);

  const handleAppearanceExport = useCallback(() => {
    const payload = JSON.stringify(appearance, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "universe-appearance.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setFlashStatus("Downloaded universe-appearance.json");
  }, [appearance, setFlashStatus]);

  const handleSectionHoverStateChange = useCallback(
    (
      sectionId: UniverseSectionId,
      isHovered: boolean,
      focus: CameraHoverFocus,
    ) => {
      if (navigationTimeoutRef.current) {
        return;
      }

      if (surgingSectionId === sectionId && !isHovered) {
        return;
      }

      if (hudExitTimeoutRef.current) {
        window.clearTimeout(hudExitTimeoutRef.current);
        hudExitTimeoutRef.current = undefined;
      }

      setHoverState((current) => {
        if (isHovered) {
          return { sectionId, focus };
        }

        if (current?.sectionId !== sectionId) {
          return current;
        }

        return null;
      });

      if (isHovered) {
        setHudState({ sectionId, focus });
        return;
      }

      hudExitTimeoutRef.current = window.setTimeout(() => {
        setHudState((current) => {
          if (current?.sectionId !== sectionId) {
            return current;
          }

          return null;
        });
        hudExitTimeoutRef.current = undefined;
      }, 280);
    },
    [surgingSectionId],
  );

  const handleSectionSelect = useCallback(
    (sectionId: UniverseSectionId, focus: CameraHoverFocus) => {
      if (navigationTimeoutRef.current) {
        return;
      }

      const section = UNIVERSE_SECTIONS[sectionId];
      if (hudExitTimeoutRef.current) {
        window.clearTimeout(hudExitTimeoutRef.current);
        hudExitTimeoutRef.current = undefined;
      }

      setHoverState({ sectionId, focus });
      setHudState({ sectionId, focus });
      setSurgingSectionId(sectionId);

      navigationTimeoutRef.current = window.setTimeout(() => {
        navigationTimeoutRef.current = undefined;

        if (section.external) {
          window.location.assign(section.href);
          return;
        }

        router.push(section.href);
      }, NAVIGATION_SURGE_MS);
    },
    [router],
  );

  return (
    <div
      className={`universe-shell${isTuning ? " is-tuning" : ""}${isSurging ? " is-routing" : ""}`}
      style={shellStyle}
    >
      <Canvas
        camera={{ fov: 75, position: initialView.position }}
        dpr={[1 / 2, 1]}
        gl={{ alpha: false }}
      >
        <color attach="background" args={[appearance.backgroundColor]} />
        <UniverseSceneFog
          color={appearance.fogColor}
          near={appearance.fogNear}
          far={appearance.fogFar}
        />
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
          activeSectionId={activeSectionId}
          surgingSectionId={surgingSectionId}
        />
        <UniverseComputer
          viewIndex={activeViewIndex}
          modelIndex={activeComputerIndex}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={activeSectionId}
          surgingSectionId={surgingSectionId}
        />
        <UniverseBass
          viewIndex={activeViewIndex}
          onHoverStateChange={handleSectionHoverStateChange}
          onSelect={handleSectionSelect}
          activeSectionId={activeSectionId}
          surgingSectionId={surgingSectionId}
        />
        <UniverseBackdrop
          noiseAmount={noiseAmount}
          poleNoiseFloor={poleNoiseFloor}
          equatorPower={equatorPower}
          yNoiseScale={yNoiseScale}
          displaceYScale={displaceYScale}
          cylinderMorph={cylinderMorph}
          appearance={appearance}
          glowVisible={isGlowVisible}
        />
        <UniverseHudOverlay
          active={Boolean(activeSectionId)}
          fontOption={hudFontOption}
          section={hudSection}
          surging={isSurging}
        />
      </Canvas>

      <div
        className={`universe-phosphor-pass${isTuning ? " is-active" : ""}${isSurging ? " is-surging" : ""}`}
        aria-hidden="true"
      />

      <Loader />

      <UniverseAppearanceEditor
        settings={appearance}
        visible={isAppearanceEditorVisible}
        exportStatus={exportStatus}
        onToggleVisibility={() =>
          setIsAppearanceEditorVisible((current) => !current)
        }
        onReset={handleAppearanceReset}
        onExport={handleAppearanceExport}
        onColorChange={handleAppearanceColorChange}
        onNumberChange={handleAppearanceNumberChange}
      />
    </div>
  );
};
