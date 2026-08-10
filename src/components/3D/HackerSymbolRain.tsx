"use client";

import { useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  HACKER_RAIN_CONFIG,
  type HackerRainConfig,
} from "@/data/hackerRain";

type HackerSymbolRainProps = {
  active: boolean;
  config?: HackerRainConfig;
};

type HackerRainColumn = {
  id: string;
  x: number;
  phase: number;
  speed: number;
  opacityPhase: number;
  opacitySpeed: number;
  text: string;
};

type HackerRainText = THREE.Object3D & {
  fillOpacity: number;
};

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getDepthFade(
  progress: number,
  fadeInPortion: number,
  fadeOutPortion: number,
) {
  const fadeIn =
    fadeInPortion > 0
      ? THREE.MathUtils.smoothstep(progress, 0, fadeInPortion)
      : 1;
  const fadeOut =
    fadeOutPortion > 0
      ? 1 -
        THREE.MathUtils.smoothstep(
          progress,
          1 - fadeOutPortion,
          1,
        )
      : 1;

  return fadeIn * fadeOut;
}

function createColumns(config: HackerRainConfig) {
  const { columns, rows, columnSpacing, rowSpacing } = config.field;
  const characters = config.chars.length > 0 ? config.chars : ["0"];
  const fieldHeight = rows * rowSpacing;
  const streamHeight = Math.max(0, rows - 1) * rowSpacing;
  const travelDistance = fieldHeight + streamHeight;

  return config.layers.map((layer, layerIndex) => {
    const layerSpeed = config.animation.fallSpeed * layer.speedMultiplier;

    return Array.from({ length: columns }, (_, columnIndex) => {
      const seed = (layerIndex + 1) * 1000 + columnIndex;
      const text = Array.from({ length: rows }, (_, rowIndex) => {
        const characterIndex = Math.floor(
          seededRandom(seed + rowIndex * 17) * characters.length,
        );
        return characters[characterIndex];
      }).join("\n");

      return {
        id: `${layerIndex}-${columnIndex}`,
        x: (columnIndex - (columns - 1) / 2) * columnSpacing,
        phase: seededRandom(seed + 31) * travelDistance,
        speed: layerSpeed * THREE.MathUtils.lerp(0.75, 1.25, seededRandom(seed + 47)),
        opacityPhase: seededRandom(seed + 59),
        opacitySpeed:
          config.columnOpacity.pulseSpeed *
          THREE.MathUtils.lerp(0.8, 1.2, seededRandom(seed + 71)),
        text,
      } satisfies HackerRainColumn;
    });
  });
}

export function HackerSymbolRain({
  active,
  config = HACKER_RAIN_CONFIG,
}: HackerSymbolRainProps) {
  const rootRef = useRef<THREE.Group>(null);
  const layerFadeRefs = useRef<number[]>(
    config.layers.map(() => (active ? 1 : 0)),
  );
  const layerRefs = useRef<Record<number, THREE.Group | null>>({});
  const columnRefs = useRef<Record<string, THREE.Group | null>>({});
  const textRefs = useRef<Record<string, HackerRainText | null>>({});
  const characters = useMemo(() => config.chars.join(""), [config.chars]);
  const columnsByLayer = useMemo(() => createColumns(config), [config]);
  const fieldHeight = config.field.rows * config.field.rowSpacing;
  const streamHeight = Math.max(0, config.field.rows - 1) * config.field.rowSpacing;
  const maxColumnY = fieldHeight / 2 + streamHeight / 2;
  const travelDistance = fieldHeight + streamHeight;

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    let maxFade = 0;
    for (const [layerIndex, layer] of config.layers.entries()) {
      const fadeSpeed =
        (active ? config.animation.fadeInSpeed : config.animation.fadeOutSpeed) *
        (active
          ? (layer.fadeInSpeedMultiplier ?? 1)
          : (layer.fadeOutSpeedMultiplier ?? 1));
      const targetFade = active ? 1 : 0;
      const nextFade = THREE.MathUtils.damp(
        layerFadeRefs.current[layerIndex],
        targetFade,
        fadeSpeed,
        delta,
      );

      layerFadeRefs.current[layerIndex] = nextFade;
      maxFade = Math.max(maxFade, nextFade);
    }

    root.visible = maxFade > 0.001;
    // root.scale.setScalar(config.scale * (0.9 + maxFade * 0.1));
    root.scale.setScalar(config.scale);
    const elapsed = clock.getElapsedTime();
    for (const [layerIndex, layerColumns] of columnsByLayer.entries()) {
      const layer = config.layers[layerIndex];
      const layerFade = layerFadeRefs.current[layerIndex];
      const layerGroup = layerRefs.current[layerIndex];
      const depthMotion = config.depthMotion;
      let depthFade = 1;

      if (
        depthMotion.enabled &&
        depthMotion.travelDistance > 0 &&
        depthMotion.travelSpeed > 0
      ) {
        const phase =
          layer.depthPhase ?? layerIndex / Math.max(1, config.layers.length);
        const progress =
          (phase +
            ((elapsed * depthMotion.travelSpeed) /
              depthMotion.travelDistance) *
              (layer.depthSpeedMultiplier ?? 1)) %
          1;

        if (layerGroup) {
          layerGroup.position.z =
            layer.z + progress * depthMotion.travelDistance;
        }

        depthFade = getDepthFade(
          progress,
          depthMotion.fadeInPortion,
          depthMotion.fadeOutPortion,
        );
      } else if (layerGroup) {
        layerGroup.position.z = layer.z;
      }

      for (const column of layerColumns) {
        const distance =
          (column.phase + elapsed * column.speed) % travelDistance;
        const columnProgress = distance / travelDistance;
        let columnFade = 1;

        if (config.columnOpacity.enabled) {
          const travelFade = getDepthFade(
            columnProgress,
            config.columnOpacity.fadeInPortion,
            config.columnOpacity.fadeOutPortion,
          );
          const pulseProgress =
            0.5 +
            0.5 *
              Math.sin(
                (elapsed * column.opacitySpeed + column.opacityPhase) *
                  Math.PI *
                  2,
              );
          const pulseFade = THREE.MathUtils.lerp(
            config.columnOpacity.pulseMin,
            config.columnOpacity.pulseMax,
            pulseProgress,
          );

          columnFade = travelFade * pulseFade;
        }

        const columnGroup = columnRefs.current[column.id];
        if (columnGroup) {
          columnGroup.position.y = maxColumnY - distance;
        }

        const text = textRefs.current[column.id];
        if (text) {
          const easedLayerFade = active
            ? Math.pow(
                THREE.MathUtils.clamp(layerFade, 0, 1),
                config.animation.fadeInEasingPower,
              )
            : layerFade;

          text.fillOpacity =
            layer.opacity * easedLayerFade * depthFade * columnFade;
        }
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={config.position}
      rotation={config.rotation}
    >
      {config.layers.map((layer, layerIndex) => (
        <group
          key={`layer-${layerIndex}`}
          ref={(group) => {
            layerRefs.current[layerIndex] = group;
          }}
          position={[0, 0, layer.z]}
        >
          {columnsByLayer[layerIndex].map((column) => (
            <group
              key={column.id}
              ref={(group) => {
                columnRefs.current[column.id] = group;
              }}
              position={[column.x, 0, 0]}
            >
              <Text
                ref={(text) => {
                  textRefs.current[column.id] = text as HackerRainText | null;
                }}
                font={config.font.path}
                fontSize={config.font.size}
                lineHeight={config.field.rowSpacing / config.font.size}
                anchorX="center"
                anchorY="middle"
                characters={characters}
                color={config.color}
                depthOffset={-1}
                fillOpacity={0}
                renderOrder={2}
              >
                {column.text}
              </Text>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
