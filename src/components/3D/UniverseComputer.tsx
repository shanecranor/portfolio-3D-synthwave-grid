"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type UniverseComputerProps = {
  viewIndex: number;
  modelIndex: number;
  angleOffset?: number;
  radialOffset?: number;
  xOffset?: number;
  targetSize?: number;
};

const COMPUTER_MODELS = [
  "/assets/computer/old_computer/scene.gltf",
] as const;

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
const WIREFRAME_COLOR = new THREE.Color(0x66ff99);

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
  angleOffset = -0.2,
  radialOffset = 0.1,
  xOffset = -0.2,
  targetSize = 1.6,
}: UniverseComputerProps) {
  const camera = useThree((state) => state.camera);
  const viewportWidth = useThree((state) => state.viewport.width);
  const rootRef = useRef<THREE.Group>(null);

  const isDefaultView = viewIndex === 0;
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

    const camPos = camera.position;
    const orbitAngle = Math.atan2(camPos.z, camPos.y) + angleOffset;
    const orbitRadius = Math.hypot(camPos.y, camPos.z) + radialOffset;

    root.position.set(
      camPos.x + xOffset * responsiveScale,
      Math.cos(orbitAngle) * orbitRadius,
      Math.sin(orbitAngle) * orbitRadius,
    );

    const spin = 1 - Math.exp(-3 * delta);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, orbitAngle + 0.2, spin);
    root.rotation.y += delta * 0.35;
    root.rotation.z = THREE.MathUtils.lerp(
      root.rotation.z,
      Math.cos(clock.getElapsedTime()) * 0.04,
      spin,
    );
    root.scale.setScalar(responsiveScale);
  });

  return (
    <group ref={rootRef}>
      <WireframeComputerModel path={activeModelPath} targetSize={targetSize} />
    </group>
  );
}

for (const modelPath of COMPUTER_MODELS) {
  useGLTF.preload(modelPath);
}
