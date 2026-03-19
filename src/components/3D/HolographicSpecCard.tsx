"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { getUniverseResponsiveWidthFactor } from "@/components/3D/universeLayout";
import { stepDampedSpring } from "@/components/3D/stepDampedSpring";

export type HolographicSpecConfig = {
  category: string;
  summary: string;
  accent: string;
  color: THREE.ColorRepresentation;
  panelOffset: [number, number, number];
  panelSize?: [number, number];
};

const HOLOGRAM_FONT_PATH = "/_astroarmada.ttf";
const HOLOGRAM_BODY_FONT_PATH_BOLD = "/Orbitron-Black.ttf";
const HOLOGRAM_BODY_FONT_PATH = "/Orbitron-Bold.ttf";
const HOVER_SPRING_FREQUENCY = 12;
const HOLOGRAM_SCANLINE_COUNT = 6;

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

export function HolographicSpecCard({
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
    () => hologramColor.clone().multiplyScalar(1.74).addScalar(0.1),
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
        (0.1 + Math.sin(clock.elapsedTime * 5 + flickerOffset) * 0.025) *
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
          outlineColor="#000000"
          fillOpacity={1}
          strokeOpacity={0}
          outlineOpacity={0}
        >
          {config.category.toUpperCase()}
        </Text>
        <Text
          ref={summaryTextRef}
          font={HOLOGRAM_BODY_FONT_PATH}
          position={[-panelWidth / 2 + 0.18, 0.02, 0.03]}
          anchorX="left"
          anchorY="middle"
          maxWidth={panelWidth - 0.42}
          fontSize={0.18}
          lineHeight={1.3}
          letterSpacing={0.06}
          color="#e1e1e1"
          outlineWidth={0.08}
          outlineColor="#000000"
        >
          {config.summary}
        </Text>
        <Text
          ref={accentTextRef}
          font={HOLOGRAM_BODY_FONT_PATH_BOLD}
          position={[-panelWidth / 2 + 0.18, -panelHeight / 2 + 0.24, 0.03]}
          anchorX="left"
          anchorY="middle"
          fontSize={0.155}
          letterSpacing={0.2}
          color={ultraBrightColor}
          outlineWidth={0.036}
          outlineColor="#000000"
        >
          {config.accent}
        </Text>
      </Billboard>
    </>
  );
}
