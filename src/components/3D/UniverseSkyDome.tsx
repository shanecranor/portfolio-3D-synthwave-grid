import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec3 vDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vDirection = normalize(worldPosition.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 horizonColor;
uniform vec3 horizonGlowColor;
uniform float glowStrength;

varying vec3 vDirection;

const float HORIZON_START_Y = -0.32;
const float HORIZON_END_Y = 0.08;
const float TOP_BLEND_START_Y = -0.52;
const float TOP_BLEND_END_Y = 0.52;
const float HORIZON_GLOW_CENTER_Y = -0.18;
const float HORIZON_GLOW_FALLOFF = 2.4;

void main() {
  // Normalize the interpolated view direction so lighting and masks are stable.
  vec3 direction = normalize(vDirection);
  // Blend from the bottom sky color into the horizon color near the skyline.
  float horizonMix = smoothstep(HORIZON_START_Y, HORIZON_END_Y, direction.y);
  // Blend from the horizon color into the top sky color as the view points upward.
  float topMix = smoothstep(TOP_BLEND_START_Y, TOP_BLEND_END_Y, direction.y);
  // Start with a bottom-to-horizon gradient.
  vec3 color = mix(bottomColor, horizonColor, horizonMix);
  // Layer the upper sky tint on top of that base gradient.
  color = mix(color, topColor, topMix);

  // Create a soft band of light centered just above the horizon line.
  float horizonGlow = pow(
    1.0 - min(abs(direction.y - HORIZON_GLOW_CENTER_Y) * HORIZON_GLOW_FALLOFF, 1.0),
    4.0
  ) * pow (
    1.0 - min(abs(direction.x - 0.1) * 0.2, 1.0),
    1.5
  );

  // Add the brighter horizon bloom to finish the synthwave look.
  color += horizonGlowColor * horizonGlow * 0.55 * glowStrength;

  // Output the final sky color as a fully opaque fragment.
  gl_FragColor = vec4(color, 1.0);
}
`;

type UniverseSkyDomeProps = {
  topColor?: THREE.ColorRepresentation;
  bottomColor?: THREE.ColorRepresentation;
  horizonColor?: THREE.ColorRepresentation;
  horizonGlowColor?: THREE.ColorRepresentation;
  glowStrength?: number;
};

export function UniverseSkyDome({
  topColor = "#16244d",
  bottomColor = "#59256b",
  horizonColor = "#59256b",
  horizonGlowColor = "#d884ff",
  glowStrength = 1.2,
}: UniverseSkyDomeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(topColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
      horizonGlowColor: { value: new THREE.Color(horizonGlowColor) },
      glowStrength: { value: glowStrength },
    }),
    [bottomColor, glowStrength, horizonColor, horizonGlowColor, topColor],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1000}>
      <sphereGeometry args={[180, 48, 48]} />
      <shaderMaterial
        key={`${topColor}:${bottomColor}:${horizonColor}:${horizonGlowColor}:${glowStrength}`}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}
