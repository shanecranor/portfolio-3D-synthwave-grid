"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Center, Text, useGLTF } from "@react-three/drei";
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
  isHovered?: boolean;
  hoverWireframeOpacityMultiplier?: number;
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
  specCard?: HolographicSpecConfig;
  hoverScale?: number;
  onHoverChange?: (isHovered: boolean) => void;
  children: (state: { isHovered: boolean }) => ReactNode;
};

type HolographicSpecConfig = {
  category: string;
  summary: string;
  accent: string;
  color: THREE.ColorRepresentation;
  panelOffset: [number, number, number];
  panelSize?: [number, number];
};

const COMPUTER_MODELS = ["/assets/computer/old_computer/scene.gltf"] as const;
const BASS_MODEL_PATH = "/assets/bass/low_polygons_shihos_bass/scene.gltf";
// const REFLEX_CAMERA_MODEL_PATH = "/assets/cam/ae1/scene.gltf";
const REFLEX_CAMERA_MODEL_PATH = "/assets/cam/sa3/scene.gltf";

export const UNIVERSE_COMPUTER_MODEL_COUNT = COMPUTER_MODELS.length;

const BLACK_FILL_COLOR = new THREE.Color(0x000000);
// const GREEN_WIREFRAME_COLOR = new THREE.Color("#66ff99");
const GREEN_WIREFRAME_COLOR = new THREE.Color("#73d1ad");
const BLUE_WIREFRAME_COLOR = new THREE.Color("#3694cb").multiplyScalar(1.35);
const BASS_FILL_COLOR = new THREE.Color("#040814");
const CAMERA_FILL_COLOR = new THREE.Color("#050505");
const CAMERA_WIREFRAME_COLOR = new THREE.Color("#a86b48");
const HOLOGRAM_FONT_PATH = "/_astroarmada.ttf";
const HOVER_SPRING_FREQUENCY = 12;
const HOVER_SPRING_DAMPING = 0.5;
const DEFAULT_LAYOUT_ASPECT = 16 / 9;
const MIN_HORIZONTAL_SPREAD = 0.35;
const MAX_HORIZONTAL_SPREAD = 1;
const HOLOGRAM_SCANLINE_COUNT = 6;

const COMPUTER_SPEC_CARD: HolographicSpecConfig = {
  category: "Creative Dev",
  summary: "Realtime interfaces, generative systems, and polished web builds.",
  accent: "WEBGL / UI SYSTEMS",
  color: GREEN_WIREFRAME_COLOR,
  panelOffset: [2.65, 1.4, 0.5],
  panelSize: [3.4, 1.8],
};

const REFLEX_CAMERA_SPEC_CARD: HolographicSpecConfig = {
  category: "Photography",
  summary:
    "Capturing mundane, beautiful, and captivating moments with interesting gear.",
  accent: "NIKON Z6 / RAW",
  color: CAMERA_WIREFRAME_COLOR,
  panelOffset: [5, -1, 2],
  panelSize: [4, 1.55],
};

const BASS_SPEC_CARD: HolographicSpecConfig = {
  category: "Sound",
  summary: "Low-end pulse, analog texture, and rhythm-driven scene identity.",
  accent: "SYNTH / TIMBRE",
  color: BLUE_WIREFRAME_COLOR,
  panelOffset: [-3, 1, 0.5],
  panelSize: [3.1, 1.6],
};

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

function createLineSegmentsGeometry(
  segments: [[number, number, number], [number, number, number]][],
) {
  const geometry = new THREE.BufferGeometry();
  const vectors = segments.flatMap(([start, end]) => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  });

  geometry.setFromPoints(vectors);

  return geometry;
}

function createScanlineGeometry(
  width: number,
  height: number,
  count: number,
  insetX: number,
) {
  const lines: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const t = (index + 1) / (count + 1);
    const y = THREE.MathUtils.lerp(height / 2 - 0.12, -height / 2 + 0.12, t);

    lines.push(-width / 2 + insetX, y, 0, width / 2 - insetX, y, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));

  return geometry;
}

function HolographicSpecCard({
  config,
  isVisible,
}: {
  config: HolographicSpecConfig;
  isVisible: boolean;
}) {
  const canvasSize = useThree((state) => state.size);
  const rootRef = useRef<THREE.Group>(null);
  const backplateMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const plateMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const borderMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const leaderMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const accentMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const scanlineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const titleTextRef = useRef<{
    fillOpacity: number;
    strokeOpacity: number;
    outlineOpacity: number;
  } | null>(null);
  const summaryTextRef = useRef<{
    fillOpacity: number;
    strokeOpacity: number;
    outlineOpacity: number;
  } | null>(null);
  const accentTextRef = useRef<{
    fillOpacity: number;
    strokeOpacity: number;
    outlineOpacity: number;
  } | null>(null);
  const unfoldRef = useRef(0);
  const unfoldVelocityRef = useRef(0);
  const [flickerOffset] = useState(() => Math.random() * Math.PI * 2);
  const [panelWidth, panelHeight] = config.panelSize ?? [3, 1.65];
  const responsiveWidthFactor = useMemo(() => {
    return getUniverseResponsiveWidthFactor(canvasSize.width);
  }, [canvasSize.width]);
  const horizontalOffsetScale = useMemo(() => {
    return THREE.MathUtils.lerp(0.58, 1, responsiveWidthFactor);
  }, [responsiveWidthFactor]);
  const verticalOffsetScale = useMemo(() => {
    return THREE.MathUtils.lerp(0.82, 1, responsiveWidthFactor);
  }, [responsiveWidthFactor]);
  const panelDisplayScale = useMemo(() => {
    return THREE.MathUtils.lerp(0.84, 1, responsiveWidthFactor);
  }, [responsiveWidthFactor]);
  const scaledPanelOffset = useMemo(() => {
    const [x, y, z] = config.panelOffset;

    return [x * horizontalOffsetScale, y * verticalOffsetScale, z] as [
      number,
      number,
      number,
    ];
  }, [config.panelOffset, horizontalOffsetScale, verticalOffsetScale]);

  const hologramColor = useMemo(
    () => new THREE.Color(config.color),
    [config.color],
  );
  const borderColor = useMemo(
    () => hologramColor.clone().multiplyScalar(1.25),
    [hologramColor],
  );
  const ultraBrightColor = useMemo(
    () => hologramColor.clone().multiplyScalar(3.5).addScalar(0.3),
    [hologramColor],
  );
  const glowColor = useMemo(
    () => hologramColor.clone().multiplyScalar(0.8),
    [hologramColor],
  );
  const plateColor = useMemo(
    () => hologramColor.clone().multiplyScalar(0.18),
    [hologramColor],
  );

  const leaderGeometry = useMemo(() => {
    const [x, y, z] = scaledPanelOffset;
    const direction = Math.sign(x);
    const middlePoint: [number, number, number] = [x * 0.38, y * 0.25, z * 0.2];
    const endPoint: [number, number, number] = [
      x - direction * (panelWidth * 0.42),
      y,
      z,
    ];

    return createLineSegmentsGeometry([
      [[0, 0, 0], middlePoint],
      [middlePoint, endPoint],
    ]);
  }, [panelWidth, scaledPanelOffset]);

  const borderGeometry = useMemo(() => {
    const halfWidth = panelWidth / 2;
    const halfHeight = panelHeight / 2;

    return createLineSegmentsGeometry([
      [
        [-halfWidth, halfHeight, 0],
        [halfWidth, halfHeight, 0],
      ],
      [
        [halfWidth, halfHeight, 0],
        [halfWidth, -halfHeight, 0],
      ],
      [
        [halfWidth, -halfHeight, 0],
        [-halfWidth, -halfHeight, 0],
      ],
      [
        [-halfWidth, -halfHeight, 0],
        [-halfWidth, halfHeight, 0],
      ],
    ]);
  }, [panelHeight, panelWidth]);

  const accentGeometry = useMemo(() => {
    const halfWidth = panelWidth / 2;
    const halfHeight = panelHeight / 2;

    return createLineSegmentsGeometry([
      [
        [-halfWidth, halfHeight - 0.18, 0],
        [-halfWidth + 0.45, halfHeight - 0.18, 0],
      ],
      [
        [-halfWidth + 0.45, halfHeight - 0.18, 0],
        [-halfWidth + 0.65, halfHeight, 0],
      ],
      [
        [-halfWidth + 0.65, halfHeight, 0],
        [halfWidth, halfHeight, 0],
      ],
    ]);
  }, [panelHeight, panelWidth]);

  const scanlineGeometry = useMemo(() => {
    return createScanlineGeometry(
      panelWidth,
      panelHeight,
      HOLOGRAM_SCANLINE_COUNT,
      0.18,
    );
  }, [panelHeight, panelWidth]);

  useEffect(() => {
    return () => {
      leaderGeometry.dispose();
      borderGeometry.dispose();
      accentGeometry.dispose();
      scanlineGeometry.dispose();
    };
  }, [accentGeometry, borderGeometry, leaderGeometry, scanlineGeometry]);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const unfoldSpring = stepDampedSpring(
      unfoldRef.current,
      unfoldVelocityRef.current,
      isVisible ? 1 : 0,
      delta,
      HOVER_SPRING_FREQUENCY,
      0.72,
    );
    const unfold = THREE.MathUtils.clamp(unfoldSpring.value, 0, 1);
    const [x, y, z] = scaledPanelOffset;
    const direction = Math.sign(x);
    const easedOpacity = unfold * unfold;
    const flicker =
      0.97 +
      Math.sin(clock.elapsedTime * 16 + flickerOffset) * 0.03 +
      Math.sin(clock.elapsedTime * 27 + flickerOffset * 0.7) * 0.015;
    const intensity = easedOpacity * flicker;
    const scaleX = (0.76 + unfold * 0.24) * panelDisplayScale;
    const scaleY = (0.9 + unfold * 0.1) * panelDisplayScale;

    unfoldRef.current = unfold;
    unfoldVelocityRef.current = unfoldSpring.velocity;
    root.visible = unfold > 0.02;
    root.position.set(
      THREE.MathUtils.lerp(x, x - direction * 0.24, unfold),
      y - (1 - unfold) * 0.08,
      z,
    );
    root.scale.set(scaleX, scaleY, 1);

    if (backplateMaterialRef.current) {
      backplateMaterialRef.current.opacity = 0.54 * easedOpacity;
    }

    if (plateMaterialRef.current) {
      plateMaterialRef.current.opacity = 0.26 * intensity;
    }
    if (glowMaterialRef.current) {
      glowMaterialRef.current.opacity = 0.12 * intensity;
    }
    if (borderMaterialRef.current) {
      borderMaterialRef.current.opacity = 0.94 * intensity;
    }
    if (leaderMaterialRef.current) {
      leaderMaterialRef.current.opacity = 0.8 * intensity;
    }
    if (accentMaterialRef.current) {
      accentMaterialRef.current.opacity = 0.92 * intensity;
    }
    if (scanlineMaterialRef.current) {
      scanlineMaterialRef.current.opacity =
        (0.08 + Math.sin(clock.elapsedTime * 5 + flickerOffset) * 0.025) *
        easedOpacity;
    }
    if (titleTextRef.current) {
      titleTextRef.current.fillOpacity = 1 * intensity;
      titleTextRef.current.strokeOpacity = 0.95 * intensity;
      titleTextRef.current.outlineOpacity = 0.72 * intensity;
    }
    if (summaryTextRef.current) {
      summaryTextRef.current.fillOpacity = 1 * intensity;
      summaryTextRef.current.strokeOpacity = 0.9 * intensity;
      summaryTextRef.current.outlineOpacity = 0.72 * intensity;
    }
    if (accentTextRef.current) {
      accentTextRef.current.fillOpacity = 0.98 * intensity;
      accentTextRef.current.strokeOpacity = 0.86 * intensity;
      accentTextRef.current.outlineOpacity = 0.72 * intensity;
    }
  });

  return (
    <>
      <lineSegments geometry={leaderGeometry} renderOrder={5}>
        <lineBasicMaterial
          ref={leaderMaterialRef}
          color={borderColor}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      <Billboard ref={rootRef} follow>
        <mesh position={[0, 0, -0.02]} scale={[1.02, 1.04, 1]} renderOrder={5}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            ref={backplateMaterialRef}
            color="#02060a"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh renderOrder={6}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            ref={plateMaterialRef}
            color={plateColor}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.01]} scale={[1.06, 1.08, 1]} renderOrder={5}>
          <planeGeometry args={[panelWidth, panelHeight]} />
          <meshBasicMaterial
            ref={glowMaterialRef}
            color={glowColor}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={borderGeometry} renderOrder={7}>
          <lineBasicMaterial
            ref={borderMaterialRef}
            color={borderColor}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>
        <lineSegments
          geometry={accentGeometry}
          position={[0, 0, 0.01]}
          renderOrder={8}
        >
          <lineBasicMaterial
            ref={accentMaterialRef}
            color={borderColor}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>
        <lineSegments
          geometry={scanlineGeometry}
          position={[0, 0, 0.01]}
          renderOrder={7}
        >
          <lineBasicMaterial
            ref={scanlineMaterialRef}
            color={hologramColor}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>

        <Text
          ref={titleTextRef}
          font={HOLOGRAM_FONT_PATH}
          position={[-panelWidth / 2 + 0.18, panelHeight / 2 - 0.28, 0.03]}
          anchorX="left"
          anchorY="middle"
          fontSize={0.23}
          letterSpacing={0.08}
          color={ultraBrightColor}
          outlineWidth={0.07}
          outlineColor="#000000" //this adds a bit of contrast, but isn't really visible for some reason
          fillOpacity={1}
          strokeOpacity={0}
          outlineOpacity={0}
        >
          {config.category.toUpperCase()}
        </Text>
        <Text
          ref={summaryTextRef}
          font={HOLOGRAM_FONT_PATH}
          position={[-panelWidth / 2 + 0.18, 0.02, 0.03]}
          anchorX="left"
          anchorY="middle"
          maxWidth={panelWidth - 0.42}
          fontSize={0.18}
          lineHeight={1.22}
          letterSpacing={0.035}
          color="#ffffff"
          outlineWidth={0.04}
          outlineColor="#010509"
          strokeWidth={0.012}
          strokeColor="#ffffff"
          fillOpacity={0}
          strokeOpacity={0}
          outlineOpacity={0}
        >
          {config.summary}
        </Text>
        <Text
          ref={accentTextRef}
          font={HOLOGRAM_FONT_PATH}
          position={[-panelWidth / 2 + 0.18, -panelHeight / 2 + 0.24, 0.03]}
          anchorX="left"
          anchorY="middle"
          fontSize={0.155}
          letterSpacing={0.06}
          color="#eefaf5"
          outlineWidth={0.036}
          outlineColor="#010509"
          strokeWidth={0.012}
          strokeColor={borderColor}
          fillOpacity={0}
          strokeOpacity={0}
          outlineOpacity={0}
        >
          {config.accent}
        </Text>
      </Billboard>
    </>
  );
}

function WireframeModel({
  path,
  targetSize,
  fillColor = BLACK_FILL_COLOR,
  wireframeColor = GREEN_WIREFRAME_COLOR,
  wireframeOpacity = 0.95,
  isHovered = false,
  hoverWireframeOpacityMultiplier = 5,
}: WireframeModelConfig) {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const wireframeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
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

    const targetOpacity =
      wireframeOpacity * (isHovered ? hoverWireframeOpacityMultiplier : 1);
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
  viewIndex,
  placement,
  specCard,
  hoverScale = 1.12,
  onHoverChange,
  children,
}: UniverseAnchoredObjectProps) {
  const canvasSize = useThree((state) => state.size);
  const anchorRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
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
    const anchor = anchorRef.current;
    const model = modelRef.current;
    if (!anchor || !model) return;

    anchor.visible = isDefaultView;
    if (!isDefaultView) return;

    const elapsed = clock.getElapsedTime();
    anchor.position.set(
      titleAnchorX + placement.xOffset * horizontalSpreadScale,
      DEFAULT_UNIVERSE_ANCHOR_Y + placement.yOffset,
      DEFAULT_UNIVERSE_ANCHOR_Z + placement.zOffset,
    );
    model.rotation.set(
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
    anchor.scale.setScalar(responsiveScale * hoverScaleRef.current);
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
      ref={anchorRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group ref={modelRef}>{children({ isHovered: isActivelyHovered })}</group>
      {specCard ? (
        <HolographicSpecCard config={specCard} isVisible={isActivelyHovered} />
      ) : null}
    </group>
  );
}

export function UniverseReflexCamera({ viewIndex }: UniverseReflexCameraProps) {
  return (
    <UniverseAnchoredObject
      viewIndex={viewIndex}
      placement={REFLEX_CAMERA_PLACEMENT}
      specCard={REFLEX_CAMERA_SPEC_CARD}
    >
      {({ isHovered }) => (
        <WireframeModel
          path={REFLEX_CAMERA_MODEL_PATH}
          targetSize={2.5}
          fillColor={CAMERA_FILL_COLOR}
          wireframeColor={CAMERA_WIREFRAME_COLOR}
          wireframeOpacity={0.08}
          isHovered={isHovered}
        />
      )}
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
      specCard={COMPUTER_SPEC_CARD}
    >
      {({ isHovered }) => (
        <WireframeModel
          path={activeModelPath}
          targetSize={targetSize}
          fillColor={BLACK_FILL_COLOR}
          wireframeColor={GREEN_WIREFRAME_COLOR}
          wireframeOpacity={0.12}
          isHovered={isHovered}
        />
      )}
    </UniverseAnchoredObject>
  );
}

export function UniverseBass({ viewIndex }: UniverseBassProps) {
  return (
    <UniverseAnchoredObject
      viewIndex={viewIndex}
      placement={BASS_PLACEMENT}
      hoverScale={1.08}
      specCard={BASS_SPEC_CARD}
    >
      {({ isHovered }) => (
        <WireframeModel
          path={BASS_MODEL_PATH}
          targetSize={4.6}
          fillColor={BASS_FILL_COLOR}
          wireframeColor={BLUE_WIREFRAME_COLOR}
          wireframeOpacity={0.12}
          isHovered={isHovered}
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
