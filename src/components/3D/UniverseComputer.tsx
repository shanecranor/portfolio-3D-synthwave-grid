"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  DEFAULT_UNIVERSE_X_OFFSET,
} from "@/components/3D/universeLayout";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  targetSize?: number;
};

const COMPUTER_MODELS = [
  "/assets/computer/old_computer/scene.gltf",
] as const;

// const COMPUTER_MODELS = [
//   // "/assets/bass/electrical_bass_guitar/scene.gltf",
//   // "/assets/bass/low_poly_bass_guitar/scene.gltf", 
//   "/assets/bass/low_polygons_shihos_bass/scene.gltf",
// ];

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
const WIREFRAME_COLOR = new THREE.Color(0x66ff99);
const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;

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

function WireframeComputerModel({
  path,
  targetSize,
}: {
  path: (typeof COMPUTER_MODELS)[number];
  targetSize: number;
}) {
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
      color: BLACK_FILL_COLOR,
      side: THREE.DoubleSide,
    });
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: WIREFRAME_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const originalMeshes: THREE.Mesh[] = [];

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMeshes.push(child);
      }
    });

    for (const mesh of originalMeshes) {
      mesh.material = fillMaterial;

      const wireframeOverlay = new THREE.Mesh(mesh.geometry, wireframeMaterial);
      wireframeOverlay.renderOrder = 1;
      mesh.add(wireframeOverlay);
    }

    return () => {
      fillMaterial.dispose();
      wireframeMaterial.dispose();
    };
  }, [clonedScene]);

  return (
    <Center>
      <primitive object={clonedScene} scale={normalizedScale} />
    </Center>
  );
}

export function UniverseComputer({
  viewIndex,
  modelIndex,
  targetSize = 3.6,
}: UniverseComputerProps) {
  const viewportWidth = useThree((state) => state.viewport.width);
  const rootRef = useRef<THREE.Group>(null);
  const hoverScaleRef = useRef(1);
  const hoverVelocityRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const isDefaultView = viewIndex === 0;
  const isActivelyHovered = isDefaultView && isHovered;
  const activeModelPath = COMPUTER_MODELS[modelIndex % COMPUTER_MODELS.length];

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

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    root.visible = isDefaultView;
    if (!isDefaultView) return;

    root.position.set(
      DEFAULT_UNIVERSE_X_OFFSET * responsiveScale,
      DEFAULT_UNIVERSE_ANCHOR_Y,
      DEFAULT_UNIVERSE_ANCHOR_Z,
    );

    const spin = 1 - Math.exp(-3 * delta);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, spin);
    root.rotation.y += delta * 0.35;
    root.rotation.z = THREE.MathUtils.lerp(
      root.rotation.z,
      Math.cos(clock.getElapsedTime()) * 0.04,
      spin,
    );

    const targetHoverScale = isActivelyHovered ? 1.12 : 1;
    const hoverSpring = stepDampedSpring(
      hoverScaleRef.current,
      hoverVelocityRef.current,
      targetHoverScale,
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
      <WireframeComputerModel path={activeModelPath} targetSize={targetSize} />
    </group>
  );
}

for (const modelPath of COMPUTER_MODELS) {
  useGLTF.preload(modelPath);
}
