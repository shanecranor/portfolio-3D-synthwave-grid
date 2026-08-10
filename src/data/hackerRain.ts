export type HackerRainLayerConfig = {
  z: number;
  opacity: number;
  speedMultiplier: number;
  fadeInSpeedMultiplier?: number;
  fadeOutSpeedMultiplier?: number;
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
    fadeOutSpeed: number;
  };
  position: [number, number, number];
  rotation: [number, number, number];
};

export const HACKER_RAIN_CONFIG: HackerRainConfig = {
  chars: ["1", "0"],
  color: "#73d1ad",
  font: {
    path: "/Orbitron-Bold.ttf",
    size: 0.18,
  },
  field: {
    columns: 16,
    rows: 24,
    columnSpacing: 0.24,
    rowSpacing: 0.22,
  },
  layers: [
    { z: 0.18, opacity: 0.78, speedMultiplier: 0.85 },
    { z: -0.08, opacity: 0.44, speedMultiplier: 1.1 },
    { z: -0.34, opacity: 0.2, speedMultiplier: 1.4 },
  ],
  animation: {
    fallSpeed: 0.2,
    fadeInSpeed: 1.2,
    fadeOutSpeed: 7,
  },
  position: [0, 0, 0],
  rotation: [0, Math.PI / 2, 0],
};
