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
import type { UniverseSectionId } from "@/data/universeSections";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  visible?: boolean;
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
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  spinX?: number;
  spinY?: number;
  spinZ?: number;
};

type UniverseAnchoredObjectProps = {
  sectionId: UniverseSectionId;
  viewIndex: number;
  visible: boolean;
  placement: AnchoredPlacementConfig;
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
  fillColor?: THREE.ColorRepresentation;
  wireframeColor?: THREE.ColorRepresentation;
  wireframeOpacity?: number;
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

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
// const GREEN_WIREFRAME_COLOR = new THREE.Color("#66ff99");
const GREEN_WIREFRAME_COLOR = new THREE.Color("#73d1ad");
const BLUE_WIREFRAME_COLOR = new THREE.Color("#3694cb").multiplyScalar(1.35);
const BASS_FILL_COLOR = new THREE.Color("#040814");
const CAMERA_FILL_COLOR = new THREE.Color("#050505");
// const CAMERA_WIREFRAME_COLOR = new THREE.Color("#ba9f79");
const CAMERA_WIREFRAME_COLOR = new THREE.Color("#ba9379");

const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;
const DEFAULT_LAYOUT_ASPECT = 16 / 9;
const PORTRAIT_STACK_ASPECT = 0.95;

const REFLEX_CAMERA_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.2,
  yOffset: 0.42,
  zOffset: -1.45,
  rotationX: 0.8,
  rotationY: -1.5,
  rotationZ: 0,
  spinY: 0.3,
  spinZ: 0.1,
};

const COMPUTER_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 2.15,
  yOffset: 0.35,
  zOffset: -1.4,
  rotationX: 0.5,
  rotationY: -Math.PI / 2,
  rotationZ: 0,
  spinY: 0.1,
};

const BASS_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.15,
  yOffset: 0.3,
  zOffset: -1.55,
  rotationX: Math.PI / 2,
  rotationY: Math.PI - 0.2,
  rotationZ: 0,
  spinY: 0,
  spinZ: -0.4,
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
  fillColor = BLACK_FILL_COLOR,
  wireframeColor = GREEN_WIREFRAME_COLOR,
  wireframeOpacity = 0.95,
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
      color: fillColor,
      side: THREE.DoubleSide,
    });
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: wireframeColor,
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
  }, [clonedScene, fillColor, wireframeColor, wireframeOpacity]);

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
  placement,
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
  const revealRef = useRef(visible ? 1 : 0);
  const revealVelocityRef = useRef(0);
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

  useFrame(({ clock }, delta) => {
    const anchor = anchorRef.current;
    const model = modelRef.current;
    if (!anchor || !model) return;

    anchor.visible = isDefaultView && (visible || revealRef.current > 0.002);
    if (!isDefaultView) return;

    const revealSpring = stepDampedSpring(
      revealRef.current,
      revealVelocityRef.current,
      visible ? 1 : 0,
      delta,
      6,
      1,
    );
    revealRef.current = THREE.MathUtils.clamp(revealSpring.value, 0, 1);
    revealVelocityRef.current = revealSpring.velocity;

    const elapsed = clock.getElapsedTime();
    anchor.position.set(
      titleAnchorX + placement.xOffset * horizontalSpreadScale,
      DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset - (1 - revealRef.current) * 0.5,
      DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
    );
    model.rotation.set(
      (placement.rotationX ?? 0) + elapsed * (placement.spinX ?? 0),
      (placement.rotationY ?? 0) + elapsed * (placement.spinY ?? 0),
      (placement.rotationZ ?? 0) + elapsed * (placement.spinZ ?? 0),
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
        hoverScaleRef.current *
        revealRef.current *
        (1 + surgeScaleRef.current * 0.18),
    );
  });

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (isDefaultView && visible) {
      setIsHovered(true);
    }
  };

  const handlePointerLeave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(false);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect?.(sectionId, hoverFocus);
  };

  return (
    <group ref={anchorRef}>
      <group
        ref={modelRef}
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
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseReflexCameraProps) {
  return (
    <UniverseAnchoredObject
      sectionId="photography"
      viewIndex={viewIndex}
      visible={visible}
      placement={REFLEX_CAMERA_PLACEMENT}
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
          fillColor={CAMERA_FILL_COLOR}
          wireframeColor={CAMERA_WIREFRAME_COLOR}
          wireframeOpacity={0.14}
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
  targetSize = 4.5,
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseComputerProps) {
  const activeModelPath = COMPUTER_MODELS[modelIndex % COMPUTER_MODELS.length];

  return (
    <UniverseAnchoredObject
      sectionId="projects"
      viewIndex={viewIndex}
      visible={visible}
      placement={COMPUTER_PLACEMENT}
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
          fillColor={BLACK_FILL_COLOR}
          wireframeColor={GREEN_WIREFRAME_COLOR}
          wireframeOpacity={0.14}
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
  onHoverStateChange,
  onSelect,
  activeSectionId,
  surgingSectionId,
}: UniverseBassProps) {
  return (
    <UniverseAnchoredObject
      sectionId="music"
      viewIndex={viewIndex}
      visible={visible}
      placement={BASS_PLACEMENT}
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
          fillColor={BASS_FILL_COLOR}
          wireframeColor={BLUE_WIREFRAME_COLOR}
          wireframeOpacity={0.14}
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
