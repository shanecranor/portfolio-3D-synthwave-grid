"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  getUniverseResponsiveWidthFactor,
  getUniverseTitleAnchorX,
} from "@/components/3D/universeLayout";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  targetSize?: number;
  onHoverChange?: (isHovered: boolean) => void;
};

type UniverseBassProps = {
  viewIndex: number;
};

type UniverseReflexCameraProps = {
  viewIndex: number;
};

type WireframeModelConfig = {
  path: string;
  targetSize: number;
  fillColor?: THREE.ColorRepresentation;
  wireframeColor?: THREE.ColorRepresentation;
  wireframeOpacity?: number;
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
  viewIndex: number;
  placement: AnchoredPlacementConfig;
  hoverScale?: number;
  onHoverChange?: (isHovered: boolean) => void;
  children: ReactNode;
};

const COMPUTER_MODELS = ["/assets/computer/old_computer/scene.gltf"] as const;
const BASS_MODEL_PATH = "/assets/bass/low_polygons_shihos_bass/scene.gltf";
// const REFLEX_CAMERA_MODEL_PATH = "/assets/cam/ae1/scene.gltf";
const REFLEX_CAMERA_MODEL_PATH = "/assets/cam/sa3/scene.gltf";

export const UNIVERSE_COMPUTER_MODEL_COUNT = COMPUTER_MODELS.length;

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
const GREEN_WIREFRAME_COLOR = new THREE.Color(0x66ff99);
const BLUE_WIREFRAME_COLOR = new THREE.Color("#00a2ff").multiplyScalar(1.35);
const BASS_FILL_COLOR = new THREE.Color("#040814");
const CAMERA_FILL_COLOR = new THREE.Color("#050505");
const CAMERA_WIREFRAME_COLOR = new THREE.Color("#f1b634");
const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;
const DEFAULT_LAYOUT_ASPECT = 16 / 9;
const MIN_HORIZONTAL_SPREAD = 0.35;
const MAX_HORIZONTAL_SPREAD = 1;

const REFLEX_CAMERA_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.75,
  yOffset: 1.15,
  zOffset: -1.3,
  rotationX: 0.8,
  rotationY: -1.5,
  rotationZ: 0,
  spinY: 0.3,
  spinZ: 0.1,
};

const COMPUTER_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 0,
  yOffset: 1.15,
  zOffset: -1.15,
  rotationX: 0.5,
  rotationY: -Math.PI / 2,
  rotationZ: 0,
  spinY: 0.1,
};

const BASS_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 2.8,
  yOffset: 1.15,
  zOffset: -1.35,
  rotationX: Math.PI / 2,
  rotationY: Math.PI - 0.2,
  rotationZ: 0,
  spinY: 0,
  spinZ: -0.4,
};

function stepDampedSpring(
  current: number,
  velocity: number,
  target: number,
  delta: number,
  angularFrequency: number,
  dampingRatio: number,
) {
  if (delta <= 0) {
    return { value: current, velocity };
  }

  const displacement = current - target;
  const omega = angularFrequency;
  const zeta = dampingRatio;

  if (zeta < 1) {
    const dampedOmega = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * delta);
    const cosTerm = Math.cos(dampedOmega * delta);
    const sinTerm = Math.sin(dampedOmega * delta);
    const displacementScale =
      (velocity + zeta * omega * displacement) / dampedOmega;
    const nextDisplacement =
      decay * (displacement * cosTerm + displacementScale * sinTerm);
    const nextVelocity =
      decay *
      (velocity * (cosTerm - (zeta * omega * sinTerm) / dampedOmega) -
        displacement * ((omega * omega * sinTerm) / dampedOmega));

    return {
      value: target + nextDisplacement,
      velocity: nextVelocity,
    };
  }

  if (zeta === 1) {
    const decay = Math.exp(-omega * delta);
    const displacementScale = velocity + omega * displacement;
    const nextDisplacement = decay * (displacement + displacementScale * delta);
    const nextVelocity =
      decay * (velocity - omega * (displacement + displacementScale * delta));

    return {
      value: target + nextDisplacement,
      velocity: nextVelocity,
    };
  }

  const dampedOmega = omega * Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * zeta + dampedOmega;
  const r2 = -omega * zeta - dampedOmega;
  const c1 = (velocity - r2 * displacement) / (r1 - r2);
  const c2 = displacement - c1;
  const nextDisplacement =
    c1 * Math.exp(r1 * delta) + c2 * Math.exp(r2 * delta);
  const nextVelocity =
    c1 * r1 * Math.exp(r1 * delta) + c2 * r2 * Math.exp(r2 * delta);

  return {
    value: target + nextDisplacement,
    velocity: nextVelocity,
  };
}

function getHorizontalSpreadScale(width: number, height: number) {
  if (height <= 0) {
    return MAX_HORIZONTAL_SPREAD;
  }

  return THREE.MathUtils.clamp(
    width / height / DEFAULT_LAYOUT_ASPECT,
    MIN_HORIZONTAL_SPREAD,
    MAX_HORIZONTAL_SPREAD,
  );
}

function WireframeModel({
  path,
  targetSize,
  fillColor = BLACK_FILL_COLOR,
  wireframeColor = GREEN_WIREFRAME_COLOR,
  wireframeOpacity = 0.95,
}: WireframeModelConfig) {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

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
      fillMaterial.dispose();
      wireframeMaterial.dispose();
    };
  }, [clonedScene, fillColor, wireframeColor, wireframeOpacity]);

  return (
    <Center>
      <primitive object={clonedScene} scale={normalizedScale} />
    </Center>
  );
}

function UniverseAnchoredObject({
  viewIndex,
  placement,
  hoverScale = 1.12,
  onHoverChange,
  children,
}: UniverseAnchoredObjectProps) {
  const canvasSize = useThree((state) => state.size);
  const rootRef = useRef<THREE.Group>(null);
  const hoverScaleRef = useRef(1);
  const hoverVelocityRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const isDefaultView = viewIndex === 0 || true;
  const isActivelyHovered = isDefaultView && isHovered;

  useEffect(() => {
    onHoverChange?.(isActivelyHovered);

    return () => {
      onHoverChange?.(false);
    };
  }, [isActivelyHovered, onHoverChange]);

  const responsiveScale = useMemo(() => {
    const minScale = 0.12;
    const maxScale = 0.5;
    const t = getUniverseResponsiveWidthFactor(canvasSize.width);

    return THREE.MathUtils.lerp(minScale, maxScale, t);
  }, [canvasSize.width]);
  const horizontalSpreadScale = useMemo(() => {
    return getHorizontalSpreadScale(canvasSize.width, canvasSize.height);
  }, [canvasSize.height, canvasSize.width]);
  const titleAnchorX = useMemo(() => {
    return getUniverseTitleAnchorX(canvasSize.width);
  }, [canvasSize.width]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    root.visible = isDefaultView;
    if (!isDefaultView) return;

    const elapsed = clock.getElapsedTime();
    root.position.set(
      titleAnchorX + placement.xOffset * horizontalSpreadScale,
      DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset,
      DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
    );
    root.rotation.set(
      (placement.rotationX ?? 0) + elapsed * (placement.spinX ?? 0),
      (placement.rotationY ?? 0) + elapsed * (placement.spinY ?? 0),
      (placement.rotationZ ?? 0) + elapsed * (placement.spinZ ?? 0),
    );

    const targetObjectScale = isActivelyHovered ? hoverScale : 1;
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
    root.scale.setScalar(responsiveScale * hoverScaleRef.current);
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (isDefaultView) {
      setIsHovered(true);
    }
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(false);
  };

  return (
    <group
      ref={rootRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children}
    </group>
  );
}

export function UniverseReflexCamera({ viewIndex }: UniverseReflexCameraProps) {
  return (
    <UniverseAnchoredObject
      viewIndex={viewIndex}
      placement={REFLEX_CAMERA_PLACEMENT}
    >
      <WireframeModel
        path={REFLEX_CAMERA_MODEL_PATH}
        targetSize={2.5}
        fillColor={CAMERA_FILL_COLOR}
        wireframeColor={CAMERA_WIREFRAME_COLOR}
        wireframeOpacity={0.05}
      />
    </UniverseAnchoredObject>
  );
}

export function UniverseComputer({
  viewIndex,
  modelIndex,
  targetSize = 3.6,
  onHoverChange,
}: UniverseComputerProps) {
  const activeModelPath = COMPUTER_MODELS[modelIndex % COMPUTER_MODELS.length];

  return (
    <UniverseAnchoredObject
      viewIndex={viewIndex}
      placement={COMPUTER_PLACEMENT}
      onHoverChange={onHoverChange}
    >
      <WireframeModel
        path={activeModelPath}
        targetSize={targetSize}
        fillColor={BLACK_FILL_COLOR}
        wireframeColor={GREEN_WIREFRAME_COLOR}
        wireframeOpacity={0.08}
      />
    </UniverseAnchoredObject>
  );
}

export function UniverseBass({ viewIndex }: UniverseBassProps) {
  return (
    <UniverseAnchoredObject
      viewIndex={viewIndex}
      placement={BASS_PLACEMENT}
      hoverScale={1.08}
    >
      <WireframeModel
        path={BASS_MODEL_PATH}
        targetSize={4.6}
        fillColor={BASS_FILL_COLOR}
        wireframeColor={BLUE_WIREFRAME_COLOR}
        wireframeOpacity={0.12}
      />
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
