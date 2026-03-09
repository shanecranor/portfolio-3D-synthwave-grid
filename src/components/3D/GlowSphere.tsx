import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const HALO_VERTEX_SHADER = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldCenter;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const HALO_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPower;
uniform float uEdgePower;
uniform float uRadius;
uniform float uBoundarySoftness;
uniform float uTime;
uniform float uFogScale;
uniform float uFogStrength;
uniform float uFogSpeed;
uniform float uFogContrast;
uniform float uFogBrightness;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldCenter;

float hash13(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 191.3))) * 43758.5453123);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += noise3(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float faceSign = gl_FrontFacing ? 1.0 : -1.0;
  vec3 orientedNormal = normalize(vWorldNormal) * faceSign;
  float ndv = max(dot(orientedNormal, viewDir), 0.0);

  float camDistToCenter = distance(cameraPosition, vWorldCenter);
  float insideBlend = smoothstep(
    -uBoundarySoftness,
    uBoundarySoftness,
    uRadius - camDistToCenter
  );
  float frontMask = gl_FrontFacing ? 1.0 : 0.0;
  float sideMask = mix(frontMask, 1.0 - frontMask, insideBlend);

  float centerFalloff = pow(ndv, uPower);
  float edgeFalloff = pow(ndv, uEdgePower);
  float edgeBlend = 1.0 - ndv;
  float falloff = mix(centerFalloff, edgeFalloff, edgeBlend);
  vec3 cameraRelative = (vWorldPosition - cameraPosition) / max(uRadius, 0.001);
  vec3 fogFlow = vec3(uTime * uFogSpeed, uTime * uFogSpeed * -0.6, uTime * uFogSpeed * 0.35);
  vec3 fogCoord = cameraRelative * uFogScale + fogFlow;
  float fogBase = fbm(fogCoord);
  float fogDetail = noise3(fogCoord * 3.2 + vec3(17.3, -11.1, 5.7));
  float fog = mix(fogBase, fogDetail, 0.32);
  fog = smoothstep(0.34, 0.82, fog);
  fog = clamp((fog - 0.5) * uFogContrast + 0.5, 0.0, 1.0);
  fog = pow(fog, 1.15);
  float fogMask = pow(edgeBlend, 0.95);
  float texturedFalloff = falloff * (0.18 + fog * 1.55) * fogMask * uFogBrightness;
  float baseFalloff = falloff * mix(1.0, 0.18, clamp(uFogStrength, 0.0, 1.0));
  float alpha = sideMask * uOpacity * mix(baseFalloff, texturedFalloff, clamp(uFogStrength, 0.0, 1.0));
  alpha = max(alpha, 0.0);
  gl_FragColor = vec4(uColor, alpha);
}
`;

type GlowSphereProps = {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  rotation?: [number, number, number];
  glowColor?: THREE.Color;
  glowSpread?: number;
  glowOpacity?: number;
  glowPower?: number;
  glowEdgePower?: number;
  fogScale?: number;
  fogStrength?: number;
  fogSpeed?: number;
  fogContrast?: number;
  fogBrightness?: number;
};

export function GlowSphere({
  radius = 5,
  widthSegments = 32,
  heightSegments = 16,
  rotation = [0, 0, Math.PI / 2],
  glowColor,
  glowSpread = 3.7,
  glowOpacity = 0.14,
  glowPower = 30.0,
  glowEdgePower = 100.0,
  fogScale = 1.4,
  fogStrength = 0.16,
  fogSpeed = 0.018,
  fogContrast = 1.8,
  fogBrightness = 1.0,
}: GlowSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const glowGeometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  }, [radius, widthSegments, heightSegments]);
  const uniformsRef = useRef({
    uColor: { value: glowColor ?? new THREE.Color(0x000000) },
    uOpacity: { value: glowOpacity },
    uPower: { value: glowPower },
    uEdgePower: { value: glowEdgePower },
    uRadius: { value: 0 },
    uBoundarySoftness: { value: 0 },
    uTime: { value: 0 },
    uFogScale: { value: fogScale },
    uFogStrength: { value: fogStrength },
    uFogSpeed: { value: fogSpeed },
    uFogContrast: { value: fogContrast },
    uFogBrightness: { value: fogBrightness },
  });

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = clock.elapsedTime * 0.03;
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const glowScale = 1 + Math.max(0.02, glowSpread);
  const glowRadius = radius * glowScale;
  const glowBoundarySoftness = Math.max(0.05, glowRadius * 0.015);
  const uniforms = uniformsRef.current;

  useEffect(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }

    material.uniforms.uColor.value = glowColor ?? uniforms.uColor.value;
    material.uniforms.uOpacity.value = glowOpacity;
    material.uniforms.uPower.value = glowPower;
    material.uniforms.uEdgePower.value = glowEdgePower;
    material.uniforms.uRadius.value = glowRadius;
    material.uniforms.uBoundarySoftness.value = glowBoundarySoftness;
    material.uniforms.uFogScale.value = fogScale;
    material.uniforms.uFogStrength.value = fogStrength;
    material.uniforms.uFogSpeed.value = fogSpeed;
    material.uniforms.uFogContrast.value = fogContrast;
    material.uniforms.uFogBrightness.value = fogBrightness;
  }, [
    fogBrightness,
    fogContrast,
    fogScale,
    fogSpeed,
    fogStrength,
    glowBoundarySoftness,
    glowColor,
    glowEdgePower,
    glowOpacity,
    glowPower,
    glowRadius,
    uniforms,
  ]);

  if (!glowColor) {
    return null;
  }

  return (
    <group ref={groupRef} rotation={rotation}>
      <mesh geometry={glowGeometry} scale={[glowScale, glowScale, glowScale]}>
        <shaderMaterial
          ref={materialRef}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
          vertexShader={HALO_VERTEX_SHADER}
          fragmentShader={HALO_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}
