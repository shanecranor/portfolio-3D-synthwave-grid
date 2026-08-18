import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
} from "@/components/3D/universeLayout";

export type HackerRainLayerConfig = {
  z: number;
  opacity: number;
  speedMultiplier: number;
  fadeInSpeedMultiplier?: number;
  fadeOutSpeedMultiplier?: number;
  depthPhase?: number;
  depthSpeedMultiplier?: number;
};

export type HackerRainConfig = {
  chars: readonly string[];
  color: string;
  font: {
    path: string;
    size: number;
  };
  field: {
    columns: number;
    rows: number;
    columnSpacing: number;
    rowSpacing: number;
  };
  layers: readonly HackerRainLayerConfig[];
  animation: {
    fallSpeed: number;
    fadeInSpeed: number;
    fadeInEasingPower: number;
    fadeOutSpeed: number;
  };
  depthMotion: {
    enabled: boolean;
    travelDistance: number;
    travelSpeed: number;
    fadeInPortion: number;
    fadeOutPortion: number;
  };
  columnOpacity: {
    enabled: boolean;
    fadeInPortion: number;
    fadeOutPortion: number;
    pulseMin: number;
    pulseMax: number;
    pulseSpeed: number;
  };
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

export const HACKER_RAIN_CONFIG: HackerRainConfig = {
  chars: ["1", "0"],
  color: "#73d1ad",
  font: {
    path: "/Orbitron-Bold.ttf",
    size: 0.18,
  },
  field: {
    columns: 16 * 7,
    rows: 42,
    columnSpacing: 0.24,
    rowSpacing: 0.22,
  },
  // layers: [
  //   { z: 0.18, opacity: 0.78, speedMultiplier: 0.85 },
  //   { z: -0.08, opacity: 0.44, speedMultiplier: 1.1 },
  //   { z: -0.34, opacity: 0.2, speedMultiplier: 1.4 },
  //   { z: 4.0, opacity: 0.05, speedMultiplier: 1.4 },
  //   { z: 6.0, opacity: 0.01, speedMultiplier: 0.6 },
  // ],
  layers: [
    { z: -3, opacity: 0.2, speedMultiplier: 1.2 },
    { z: -0.5, opacity: 0.7, speedMultiplier: 1.4 },
    { z: 0.2, opacity: 0.7, speedMultiplier: 1 },
    { z: 2, opacity: 0.2, speedMultiplier: 1 },
    { z: 4, opacity: 0.05, speedMultiplier: 1 },
    { z: 6.0, opacity: 0.01, speedMultiplier: 1 },
  ],
  animation: {
    fallSpeed: 0.2,
    fadeInSpeed: 1,
    fadeInEasingPower: 2,
    fadeOutSpeed: 7,
  },
  depthMotion: {
    enabled: true,
    travelDistance: 1,
    travelSpeed: 0.15,
    fadeInPortion: 0.2,
    fadeOutPortion: 0.2,
  },
  columnOpacity: {
    enabled: true,
    fadeInPortion: 0.08,
    fadeOutPortion: 0.22,
    pulseMin: 0.5,
    pulseMax: 1,
    pulseSpeed: 0.5,
  },
  position: [
    0,
    DEFAULT_UNIVERSE_ANCHOR_Y + 2,
    DEFAULT_UNIVERSE_ANCHOR_Z - 3.45,
  ],
  rotation: [0, 0, 0],
  scale: 1,
};
