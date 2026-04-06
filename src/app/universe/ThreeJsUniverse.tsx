"use client";
import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  DEFAULT_UNIVERSE_TITLE_SCALE,
  getUniverseTitleAnchorX,
} from "@/components/3D/universeLayout";
import { useRouter } from "next/navigation";

const NAVIGATION_SURGE_MS = 420;

function setObjectVisibility(
  object: THREE.Object3D | null | undefined,
  visible: boolean,
) {
  if (object) {
    object.visible = visible;
  }
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

function LiveEnvironmentMap({
  onEnvMapReady,
  excludedRef,
  textScale = DEFAULT_UNIVERSE_TITLE_SCALE,
}: {
  onEnvMapReady: (texture: THREE.Texture | null) => void;
  excludedRef?: RefObject<THREE.Object3D | null>;
  textScale?: number;
}) {
  const { gl, scene, size } = useThree();
  const cubeCameraRef = useRef<THREE.CubeCamera | null>(null);
  const capturePosition = useMemo(
    () =>
      new THREE.Vector3(
        getUniverseTitleAnchorX(size.width, textScale),
        DEFAULT_UNIVERSE_ANCHOR_Y,
        DEFAULT_UNIVERSE_ANCHOR_Z,
      ),
    [size.width, textScale],
  );
  const renderTarget = useMemo(() => {
    const target = new THREE.WebGLCubeRenderTarget(256, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    target.texture.type = THREE.HalfFloatType;
    target.texture.mapping = THREE.CubeReflectionMapping;
    return target;
  }, []);

  useEffect(() => {
    const cubeCamera = new THREE.CubeCamera(0.1, 500, renderTarget);
    cubeCamera.position.copy(capturePosition);
    cubeCameraRef.current = cubeCamera;
    scene.add(cubeCamera);
    onEnvMapReady(renderTarget.texture);

    return () => {
      onEnvMapReady(null);
      scene.remove(cubeCamera);
      cubeCameraRef.current = null;
      renderTarget.dispose();
    };
  }, [capturePosition, onEnvMapReady, renderTarget, scene]);

  useFrame(() => {
    const cubeCamera = cubeCameraRef.current;
    const excludedObject = excludedRef?.current;
    if (!cubeCamera) return;
    const previousVisibility = excludedObject?.visible;

    setObjectVisibility(excludedObject, false);
    cubeCamera.position.copy(capturePosition);
    cubeCamera.update(gl, scene);
    setObjectVisibility(excludedObject, previousVisibility ?? true);
  });

  return null;
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
      <UniverseSkyDome />
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
  const [surgingSectionId, setSurgingSectionId] =
    useState<UniverseSectionId | null>(null);
  const titleGroupRef = useRef<THREE.Group | null>(null);
  const [environmentMap, setEnvironmentMap] = useState<THREE.Texture | null>(
    null,
  );
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
  useEffect(() => {
    return () => {
      if (hudExitTimeoutRef.current) {
        window.clearTimeout(hudExitTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
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
        <color attach="background" args={["#02040a"]} />
        <LiveEnvironmentMap
          onEnvMapReady={setEnvironmentMap}
          excludedRef={titleGroupRef}
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
        <UniverseTitle
          viewIndex={activeViewIndex}
          envMap={environmentMap}
          groupRef={titleGroupRef}
        />
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
          edgeColor={edgeColor}
          noiseAmount={noiseAmount}
          poleNoiseFloor={poleNoiseFloor}
          equatorPower={equatorPower}
          yNoiseScale={yNoiseScale}
          displaceYScale={displaceYScale}
          cylinderMorph={cylinderMorph}
          glowColor={isGlowVisible ? sphereGlowColor : undefined}
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
    </div>
  );
};
