export type UniverseAppearanceSettings = {
  backgroundColor: string;
  skyTopColor: string;
  skyBottomColor: string;
  horizonColor: string;
  horizonGlowColor: string;
  fogColor: string;
  sphereBaseColor: string;
  wireframeColor: string;
  sphereGlowColor: string;
  horizonGlowStrength: number;
  sphereGlowOpacity: number;
  fogNear: number;
  fogFar: number;
};

export const DEFAULT_UNIVERSE_APPEARANCE: UniverseAppearanceSettings = {
  backgroundColor: "#02040a",
  skyTopColor: "#16244d",
  skyBottomColor: "#59256b",
  horizonColor: "#59256b",
  horizonGlowColor: "#d884ff",
  fogColor: "#14081c",
  sphereBaseColor: "#040103",
  wireframeColor: "#d16da9",
  sphereGlowColor: "#453163",
  horizonGlowStrength: 1.2,
  sphereGlowOpacity: 0.14,
  fogNear: 18,
  fogFar: 52,
};
