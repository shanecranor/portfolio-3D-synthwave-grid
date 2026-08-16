"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { CameraHoverFocus } from "@/components/3D/CameraRig";
import { stepDampedSpring } from "@/components/3D/stepDampedSpring";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  getUniverseResponsiveWidthFactor,
  getUniverseTitleAnchorX,
} from "@/components/3D/universeLayout";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  visible?: boolean;
  revealProgress?: number;
  targetSize?: number;
  onHoverStateChange?: (
    sectionId: UniverseSectionId,
    isHovered: boolean,
    focus: CameraHoverFocus,
  ) => void;
  onSelect?: (sectionId: UniverseSectionId, focus: CameraHoverFocus) => void;
  activeSectionId?: UniverseSectionId | null;
  surgingSectionId?: UniverseSectionId | null;
};

type UniverseBassProps = {
  viewIndex: number;
  visible?: boolean;
  revealProgress?: number;
  onHoverStateChange?: (
    sectionId: UniverseSectionId,
    isHovered: boolean,
    focus: CameraHoverFocus,
  ) => void;
  onSelect?: (sectionId: UniverseSectionId, focus: CameraHoverFocus) => void;
  activeSectionId?: UniverseSectionId | null;
  surgingSectionId?: UniverseSectionId | null;
};

type UniverseReflexCameraProps = {
  viewIndex: number;
  visible?: boolean;
  revealProgress?: number;
  onHoverStateChange?: (
    sectionId: UniverseSectionId,
    isHovered: boolean,
    focus: CameraHoverFocus,
  ) => void;
  onSelect?: (sectionId: UniverseSectionId, focus: CameraHoverFocus) => void;
  activeSectionId?: UniverseSectionId | null;
  surgingSectionId?: UniverseSectionId | null;
};

type AnchoredPlacementConfig = {
  xOffset: number;
  yOffset: number;
  zOffset: number;
};

type UniverseAnchoredObjectProps = {
  sectionId: UniverseSectionId;
  viewIndex: number;
  visible: boolean;
  revealProgress: number;
  placement: AnchoredPlacementConfig;
  objectScale: [number, number, number];
  hoverScale?: number;
  hitbox?: HitboxConfig;
  onHoverStateChange?: (
    sectionId: UniverseSectionId,
    isHovered: boolean,
    focus: CameraHoverFocus,
  ) => void;
  onSelect?: (sectionId: UniverseSectionId, focus: CameraHoverFocus) => void;
  isForcedActive?: boolean;
  isSurging?: boolean;
  children: (state: {
    isHighlighted: boolean;
    isSurging: boolean;
  }) => ReactNode;
};

type WireframeModelConfig = {
  path: string;
  targetSize: number;
  fillColor: string;
  wireframeColor: string;
  wireframeColorIntensity?: number;
  wireframeOpacity: number;
  isHighlighted?: boolean;
  isSurging?: boolean;
  hoverWireframeOpacityMultiplier?: number;
};

type HitboxConfig = {
  size: [number, number, number];
  offset?: [number, number, number];
};

const COMPUTER_MODELS = ["/assets/computer/old_computer/scene.gltf"] as const;
const BASS_MODEL_PATH = "/assets/universe/bass/scene.gltf";
const REFLEX_CAMERA_MODEL_PATH = "/assets/cam/reflex_camera/scene.gltf";

export const UNIVERSE_COMPUTER_MODEL_COUNT = COMPUTER_MODELS.length;

const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;
const DEFAULT_LAYOUT_ASPECT = 16 / 9;
const PORTRAIT_STACK_ASPECT = 0.95;

// These scale the model and its hitbox together. The values are applied before
// the responsive, reveal, hover, and click-surge scale animations.
export const COMPUTER_SCALE: [number, number, number] = [1, 1, 1];
export const REFLEX_CAMERA_SCALE: [number, number, number] = [1, 1, 1];
export const BASS_SCALE: [number, number, number] = [1, 1, 1];

const REFLEX_CAMERA_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 2.15,
  yOffset: 0.35,
  zOffset: -1.4,
};

const COMPUTER_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.2,
  yOffset: 0.42,
  zOffset: -1.45,
};

const BASS_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.15,
  yOffset: 0.3,
  zOffset: -1.55,
};

const COMPUTER_HITBOX: HitboxConfig = {
  size: [3.2, 2, 3],
};

const REFLEX_CAMERA_HITBOX: HitboxConfig = {
  size: [2, 1.4, 2],
};

const BASS_HITBOX: HitboxConfig = {
  size: [1.5, 1.5, 6],
  offset: [0.2, 0, 0],
};

function getHorizontalSpreadScale(width: number, height: number) {
  if (height <= 0) {
    return 1;
  }

  return THREE.MathUtils.clamp(
    (width / height - PORTRAIT_STACK_ASPECT) /
      (DEFAULT_LAYOUT_ASPECT - PORTRAIT_STACK_ASPECT),
    0,
    1,
  );
}

function WireframeModel({
  path,
  targetSize,
  fillColor,
  wireframeColor,
  wireframeColorIntensity = 1,
  wireframeOpacity,
  isHighlighted = false,
  isSurging = false,
  hoverWireframeOpacityMultiplier = 5,
}: WireframeModelConfig) {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const wireframeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const highlightRef = useRef(isHighlighted ? 1 : 0);
  const highlightVelocityRef = useRef(0);
  const surgeRef = useRef(isSurging ? 1 : 0);
  const surgeVelocityRef = useRef(0);
  const opacityRef = useRef(wireframeOpacity);
  const opacityVelocityRef = useRef(0);

  const normalizedScale = useMemo(() => {
    clonedScene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);

    return maxDimension > 0 ? targetSize / maxDimension : 1;
  }, [clonedScene, targetSize]);

  useEffect(() => {
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillColor),
      side: THREE.DoubleSide,
    });
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(wireframeColor).multiplyScalar(
        wireframeColorIntensity,
      ),
      wireframe: true,
      transparent: true,
      opacity: wireframeOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    wireframeMaterialRef.current = wireframeMaterial;
    const originalMeshes: THREE.Mesh[] = [];
    const wireframeOverlays: THREE.Mesh[] = [];

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMeshes.push(child);
      }
    });

    for (const child of originalMeshes) {
      child.material = fillMaterial;

      const wireframeOverlay = new THREE.Mesh(
        child.geometry,
        wireframeMaterial,
      );
      wireframeOverlay.renderOrder = 1;
      child.add(wireframeOverlay);
      wireframeOverlays.push(wireframeOverlay);
    }

    return () => {
      for (const overlay of wireframeOverlays) {
        overlay.removeFromParent();
      }
      wireframeMaterialRef.current = null;
      fillMaterial.dispose();
      wireframeMaterial.dispose();
    };
  }, [
    clonedScene,
    fillColor,
    wireframeColor,
    wireframeColorIntensity,
    wireframeOpacity,
  ]);

  useFrame((_, delta) => {
    const wireframeMaterial = wireframeMaterialRef.current;
    if (!wireframeMaterial) return;

    const highlightSpring = stepDampedSpring(
      highlightRef.current,
      highlightVelocityRef.current,
      isHighlighted ? 1 : 0,
      delta,
      HOVER_SPRING_FREQUENCY,
      HOVER_SPRING_DAMPING,
    );
    highlightRef.current = highlightSpring.value;
    highlightVelocityRef.current = highlightSpring.velocity;

    const surgeSpring = stepDampedSpring(
      surgeRef.current,
      surgeVelocityRef.current,
      isSurging ? 1 : 0,
      delta,
      HOVER_SPRING_FREQUENCY,
      HOVER_SPRING_DAMPING,
    );
    surgeRef.current = surgeSpring.value;
    surgeVelocityRef.current = surgeSpring.velocity;

    const targetOpacity =
      wireframeOpacity *
      (1 +
        highlightRef.current * (hoverWireframeOpacityMultiplier - 1) +
        surgeRef.current * 2.25);
    const opacitySpring = stepDampedSpring(
      opacityRef.current,
      opacityVelocityRef.current,
      targetOpacity,
      delta,
      HOVER_SPRING_FREQUENCY,
      HOVER_SPRING_DAMPING,
    );

    const nextOpacity = Math.max(wireframeOpacity, opacitySpring.value);
    opacityRef.current = nextOpacity;
    opacityVelocityRef.current = opacitySpring.velocity;
    wireframeMaterial.opacity = nextOpacity;
  });

  return (
    <Center>
      <primitive object={clonedScene} scale={normalizedScale} />
    </Center>
  );
}

function UniverseAnchoredObject({
  sectionId,
  viewIndex,
  visible,
  revealProgress,
  placement,
  objectScale,
  hoverScale = 1.12,
  hitbox,
  onHoverStateChange,
  onSelect,
  isForcedActive = false,
  isSurging = false,
  children,
}: UniverseAnchoredObjectProps) {
  const canvasSize = useThree((state) => state.size);
  const anchorRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const hoverScaleRef = useRef(1);
  const hoverVelocityRef = useRef(0);
  const surgeScaleRef = useRef(isSurging ? 1 : 0);
  const surgeVelocityRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const isDefaultView = viewIndex === 0;
  const isActivelyHovered = isDefaultView && visible && isHovered;
  const isHighlighted = isActivelyHovered || isForcedActive;

  const responsiveScale = useMemo(() => {
    const minScale = 0.3;
    const maxScale = 0.76;
    const t = getUniverseResponsiveWidthFactor(canvasSize.width);

    return THREE.MathUtils.lerp(minScale, maxScale, t);
  }, [canvasSize.width]);
  const horizontalSpreadScale = useMemo(() => {
    return getHorizontalSpreadScale(canvasSize.width, canvasSize.height);
  }, [canvasSize.height, canvasSize.width]);
  const titleAnchorX = useMemo(() => {
    return getUniverseTitleAnchorX(canvasSize.width);
  }, [canvasSize.width]);
  const hoverFocus = useMemo<CameraHoverFocus>(
    () => ({
      point: [
        titleAnchorX + placement.xOffset * horizontalSpreadScale,
        DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset,
        DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
      ],
      positionInfluence: 0.03,
      targetInfluence: 0.05,
    }),
    [
      horizontalSpreadScale,
      placement.xOffset,
      placement.yOffset,
      placement.zOffset,
      titleAnchorX,
    ],
  );

  useEffect(() => {
    onHoverStateChange?.(sectionId, isActivelyHovered, hoverFocus);

    return () => {
      onHoverStateChange?.(sectionId, false, hoverFocus);
    };
  }, [hoverFocus, isActivelyHovered, onHoverStateChange, sectionId]);

  useFrame((_, delta) => {
    const anchor = anchorRef.current;
    const model = modelRef.current;
    if (!anchor || !model) return;

    const reveal = THREE.MathUtils.clamp(revealProgress, 0, 1);
    anchor.visible = isDefaultView && reveal > 0.002;
    if (!isDefaultView) return;
    const section = UNIVERSE_SECTIONS[sectionId];
    if (section.type !== "full") return;
    const modelPose = section.modelPose;
    anchor.position.set(
      titleAnchorX + placement.xOffset * horizontalSpreadScale,
      DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset - (1 - reveal) * 0.5,
      DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
    );
    model.rotation.set(
      modelPose.rotation[0] + modelPose.revealRotationOffset[0] * (1 - reveal),
      modelPose.rotation[1] + modelPose.revealRotationOffset[1] * (1 - reveal),
      modelPose.rotation[2] + modelPose.revealRotationOffset[2] * (1 - reveal),
    );

    const targetObjectScale = isHighlighted ? hoverScale : 1;
    const hoverSpring = stepDampedSpring(
      hoverScaleRef.current,
      hoverVelocityRef.current,
      targetObjectScale,
      delta,
      HOVER_SPRING_FREQUENCY,
      HOVER_SPRING_DAMPING,
    );

    hoverScaleRef.current = hoverSpring.value;
    hoverVelocityRef.current = hoverSpring.velocity;

    const surgeSpring = stepDampedSpring(
      surgeScaleRef.current,
      surgeVelocityRef.current,
      isSurging ? 1 : 0,
      delta,
      HOVER_SPRING_FREQUENCY,
      HOVER_SPRING_DAMPING,
    );

    surgeScaleRef.current = surgeSpring.value;
    surgeVelocityRef.current = surgeSpring.velocity;
    anchor.scale.setScalar(
      responsiveScale *
        modelPose.scale *
        hoverScaleRef.current *
        reveal *
        (1 + surgeScaleRef.current * 0.18),
    );
  });

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    if (!isDefaultView || !visible) return;

    event.stopPropagation();
    setIsHovered(true);
  };

  const handlePointerLeave = (event: ThreeEvent<PointerEvent>) => {
    if (!visible) return;

    event.stopPropagation();
    setIsHovered(false);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isDefaultView || !visible) return;

    event.stopPropagation();
    onSelect?.(sectionId, hoverFocus);
  };

  return (
    <group ref={anchorRef}>
      <group
        ref={modelRef}
        scale={objectScale}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        {hitbox ? (
          <mesh position={hitbox.offset}>
            <boxGeometry args={hitbox.size} />
            <meshBasicMaterial
              color="#ff4fd8"
              wireframe
              opacity={0}
              depthWrite={false}
              depthTest={false}
              colorWrite={false}
            />
          </mesh>
        ) : null}
        {children({ isHighlighted, isSurging })}
      </group>
    </group>
  );
}

export function UniverseReflexCamera({
  viewIndex,
  visible = true,
  revealProgress = visible ? 1 : 0,
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseReflexCameraProps) {
  const section = UNIVERSE_SECTIONS.photography;
  if (section.type !== "full") return null;

  return (
    <UniverseAnchoredObject
      sectionId="photography"
      viewIndex={viewIndex}
      visible={visible}
      revealProgress={revealProgress}
      placement={REFLEX_CAMERA_PLACEMENT}
      objectScale={REFLEX_CAMERA_SCALE}
      hitbox={REFLEX_CAMERA_HITBOX}
      onHoverStateChange={onHoverStateChange}
      onSelect={onSelect}
      isForcedActive={activeSectionId === "photography"}
      isSurging={surgingSectionId === "photography"}
    >
      {({ isHighlighted, isSurging: isItemSurging }) => (
        <WireframeModel
          path={REFLEX_CAMERA_MODEL_PATH}
          targetSize={3.7}
          fillColor={section.modelAppearance.fillColor}
          wireframeColor={section.modelAppearance.wireframeColor}
          wireframeColorIntensity={
            section.modelAppearance.wireframeColorIntensity
          }
          wireframeOpacity={section.modelAppearance.wireframeOpacity}
          isHighlighted={isHighlighted}
          isSurging={isItemSurging}
        />
      )}
    </UniverseAnchoredObject>
  );
}

export function UniverseComputer({
  viewIndex,
  modelIndex,
  visible = true,
  revealProgress = visible ? 1 : 0,
  targetSize = 4.5,
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseComputerProps) {
  const activeModelPath = COMPUTER_MODELS[modelIndex % COMPUTER_MODELS.length];
  const section = UNIVERSE_SECTIONS.projects;
  if (section.type !== "full") return null;

  return (
    <UniverseAnchoredObject
      sectionId="projects"
      viewIndex={viewIndex}
      visible={visible}
      revealProgress={revealProgress}
      placement={COMPUTER_PLACEMENT}
      objectScale={COMPUTER_SCALE}
      hitbox={COMPUTER_HITBOX}
      onHoverStateChange={onHoverStateChange}
      onSelect={onSelect}
      isForcedActive={activeSectionId === "projects"}
      isSurging={surgingSectionId === "projects"}
    >
      {({ isHighlighted, isSurging: isItemSurging }) => (
        <WireframeModel
          path={activeModelPath}
          targetSize={targetSize}
          fillColor={section.modelAppearance.fillColor}
          wireframeColor={section.modelAppearance.wireframeColor}
          wireframeColorIntensity={
            section.modelAppearance.wireframeColorIntensity
          }
          wireframeOpacity={section.modelAppearance.wireframeOpacity}
          isHighlighted={isHighlighted}
          isSurging={isItemSurging}
        />
      )}
    </UniverseAnchoredObject>
  );
}

export function UniverseBass({
  viewIndex,
  visible = true,
  revealProgress = visible ? 1 : 0,
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseBassProps) {
  const section = UNIVERSE_SECTIONS.music;
  if (section.type !== "full") return null;

  return (
    <UniverseAnchoredObject
      sectionId="music"
      viewIndex={viewIndex}
      visible={visible}
      revealProgress={revealProgress}
      placement={BASS_PLACEMENT}
      objectScale={BASS_SCALE}
      hoverScale={1.08}
      hitbox={BASS_HITBOX}
      onHoverStateChange={onHoverStateChange}
      onSelect={onSelect}
      isForcedActive={activeSectionId === "music"}
      isSurging={surgingSectionId === "music"}
    >
      {({ isHighlighted, isSurging: isItemSurging }) => (
        <WireframeModel
          path={BASS_MODEL_PATH}
          targetSize={5.4}
          fillColor={section.modelAppearance.fillColor}
          wireframeColor={section.modelAppearance.wireframeColor}
          wireframeColorIntensity={
            section.modelAppearance.wireframeColorIntensity
          }
          wireframeOpacity={section.modelAppearance.wireframeOpacity}
          isHighlighted={isHighlighted}
          isSurging={isItemSurging}
        />
      )}
    </UniverseAnchoredObject>
  );
}

for (const modelPath of [
  ...COMPUTER_MODELS,
  BASS_MODEL_PATH,
  REFLEX_CAMERA_MODEL_PATH,
]) {
  useGLTF.preload(modelPath);
}
