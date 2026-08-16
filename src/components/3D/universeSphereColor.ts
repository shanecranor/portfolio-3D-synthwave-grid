import * as THREE from "three";

const TERRAIN_COLOR = [0.88 * 255, 0.94 * 255, 1.95 * 255] as const;

export const DEFAULT_SPHERE_TERRAIN_COLOR = new THREE.Color(
  ...TERRAIN_COLOR.map((channel) => (channel / 255) * 1.2),
);
export const DEFAULT_SPHERE_GLOW_COLOR = new THREE.Color(
  ...TERRAIN_COLOR.map((channel) => channel / 255),
);

function getNormalizedHsl(color: THREE.Color) {
  const intensity = Math.max(color.r, color.g, color.b);
  const normalizedColor = color
    .clone()
    .multiplyScalar(intensity > 0 ? 1 / intensity : 1);
  const hsl = { h: 0, s: 0, l: 0 };

  normalizedColor.getHSL(hsl);

  return { hsl, intensity };
}

export const DEFAULT_SPHERE_HUE = getNormalizedHsl(
  DEFAULT_SPHERE_TERRAIN_COLOR,
).hsl.h;

export function createHueShiftedColor(baseColor: THREE.Color, hue: number) {
  const { hsl, intensity } = getNormalizedHsl(baseColor);
  const wrappedHue = ((hue % 1) + 1) % 1;

  return new THREE.Color()
    .setHSL(wrappedHue, hsl.s, hsl.l)
    .multiplyScalar(intensity);
}

export function getAccentHue(accent: string) {
  const color = new THREE.Color(accent);
  const hsl = { h: 0, s: 0, l: 0 };

  color.getHSL(hsl);

  return hsl.h;
}

export function interpolateHue(from: number, to: number, progress: number) {
  const shortestDelta = ((to - from + 1.5) % 1) - 0.5;

  return from + shortestDelta * progress;
}
