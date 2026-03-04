"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  getUniverseTitleAnchorX,
} from "@/components/3D/universeLayout";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  targetSize?: number;
};

type UniverseBassProps = {
  viewIndex: number;
};

type UniversePlaceholderCubeProps = {
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
};

type UniverseAnchoredObjectProps = {
  viewIndex: number;
  placement: AnchoredPlacementConfig;
  hoverScale?: number;
  children: ReactNode;
};

const COMPUTER_MODELS = ["/assets/computer/old_computer/scene.gltf"] as const;
const BASS_MODEL_PATH = "/assets/bass/low_polygons_shihos_bass/scene.gltf";
export const UNIVERSE_COMPUTER_MODEL_COUNT = COMPUTER_MODELS.length;

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
const GREEN_WIREFRAME_COLOR = new THREE.Color(0x66ff99);
const BLUE_WIREFRAME_COLOR = new THREE.Color("#46b8ff").multiplyScalar(1.35);
const BASS_FILL_COLOR = new THREE.Color("#040814");
const CUBE_FILL_COLOR = new THREE.Color("#050505");
const CUBE_WIREFRAME_COLOR = new THREE.Color("#ff8c42");
const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;

const PLACEHOLDER_CUBE_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: -2.75,
  yOffset: 1.15,
  zOffset: -1.3,
  rotationX: 0.18,
  rotationY: -0.35,
  rotationZ: -0.08,
};

const COMPUTER_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 0,
  yOffset: 1.15,
  zOffset: -1.15,
  rotationX: 0.5,
  rotationY: -Math.PI/2,
  rotationZ: 0,
};

const BASS_PLACEMENT: AnchoredPlacementConfig = {
  xOffset: 2.8,
  yOffset: 1.15,
  zOffset: -1.35,
  rotationX: Math.PI/2,
  rotationY: Math.PI-0.2,
  rotationZ: 0,
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

      const wireframeOverlay = new THREE.Mesh(child.geometry, wireframeMaterial);
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

function WireframePlaceholderCube() {
  return (
    <mesh>
      <boxGeometry args={[1.9, 1.9, 1.9]} />
      <meshBasicMaterial color={CUBE_FILL_COLOR} />
      <mesh renderOrder={1}>
        <boxGeometry args={[1.9, 1.9, 1.9]} />
        <meshBasicMaterial
          color={CUBE_WIREFRAME_COLOR}
          wireframe
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
    </mesh>
  );
}

function UniverseAnchoredObject({
  viewIndex,
  placement,
  hoverScale = 1.12,
  children,
}: UniverseAnchoredObjectProps) {
  const viewportWidth = useThree((state) => state.viewport.width);
  const rootRef = useRef<THREE.Group>(null);
  const hoverScaleRef = useRef(1);
  const hoverVelocityRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const isDefaultView = viewIndex === 0;
  const isActivelyHovered = isDefaultView && isHovered;

  const responsiveScale = useMemo(() => {
    const minWidth = 6;
    const maxWidth = 24;
    const minScale = 0.12;
    const maxScale = 0.5;
    const t = THREE.MathUtils.clamp(
      (viewportWidth - minWidth) / (maxWidth - minWidth),
      0,
      1,
    );

    return THREE.MathUtils.lerp(minScale, maxScale, t);
  }, [viewportWidth]);
  const titleAnchorX = useMemo(() => {
    return getUniverseTitleAnchorX(viewportWidth);
  }, [viewportWidth]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    root.visible = isDefaultView;
    if (!isDefaultView) return;

    root.position.set(
      titleAnchorX + placement.xOffset,
      DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset,
      DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
    );
    root.rotation.set(
      placement.rotationX ?? 0,
      placement.rotationY ?? 0,
      placement.rotationZ ?? 0,
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

export function UniversePlaceholderCube({
  viewIndex,
}: UniversePlaceholderCubeProps) {
  return (
    <UniverseAnchoredObject viewIndex={viewIndex} placement={PLACEHOLDER_CUBE_PLACEMENT}>
      <WireframePlaceholderCube />
    </UniverseAnchoredObject>
  );
}

export function UniverseComputer({
  viewIndex,
  modelIndex,
  targetSize = 3.6,
}: UniverseComputerProps) {
  const activeModelPath = COMPUTER_MODELS[modelIndex % COMPUTER_MODELS.length];

  return (
    <UniverseAnchoredObject viewIndex={viewIndex} placement={COMPUTER_PLACEMENT}>
      <WireframeModel
        path={activeModelPath}
        targetSize={targetSize}
        fillColor={BLACK_FILL_COLOR}
        wireframeColor={GREEN_WIREFRAME_COLOR}
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
        wireframeOpacity={1}
      />
    </UniverseAnchoredObject>
  );
}

for (const modelPath of [...COMPUTER_MODELS, BASS_MODEL_PATH]) {
  useGLTF.preload(modelPath);
}
