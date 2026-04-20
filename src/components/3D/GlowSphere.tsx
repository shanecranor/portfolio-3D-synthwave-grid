import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type ThreeColorValue = THREE.ColorRepresentation | [number, number, number];

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
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldCenter;

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
  float alpha = falloff * sideMask * uOpacity;
  alpha = max(alpha, 0.0);
  gl_FragColor = vec4(uColor, alpha);
}
`;

type GlowSphereProps = {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  rotation?: [number, number, number];
  glowColor?: ThreeColorValue;
  glowSpread?: number;
  glowOpacity?: number;
  glowPower?: number;
  glowEdgePower?: number;
};

export function GlowSphere({
  radius = 5,
  widthSegments = 32,
  heightSegments = 16,
  rotation = [0, 0, Math.PI / 2],
  glowColor,
  glowSpread = 3.7,
  glowOpacity = 0.14,
  glowPower = 80.0,
  glowEdgePower = 100.0,
}: GlowSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowGeometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  }, [radius, widthSegments, heightSegments]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = clock.elapsedTime * 0.03;
    }
  });

  const glowScale = 1 + Math.max(0.02, glowSpread);
  const glowRadius = radius * glowScale;
  const glowBoundarySoftness = Math.max(0.05, glowRadius * 0.015);
  const resolvedGlowColor = useMemo(() => {
    if (!glowColor) {
      return null;
    }

    if (Array.isArray(glowColor)) {
      return new THREE.Color(glowColor[0], glowColor[1], glowColor[2]);
    }

    return new THREE.Color(glowColor);
  }, [glowColor]);

  const glowUniforms = useMemo(
    () => ({
      uColor: { value: resolvedGlowColor ?? new THREE.Color("#ffffff") },
      uOpacity: { value: glowOpacity },
      uPower: { value: glowPower },
      uEdgePower: { value: glowEdgePower },
      uRadius: { value: glowRadius },
      uBoundarySoftness: { value: glowBoundarySoftness },
    }),
    [
      glowBoundarySoftness,
      glowEdgePower,
      glowOpacity,
      glowPower,
      glowRadius,
      resolvedGlowColor,
    ],
  );

  if (!resolvedGlowColor) {
    return null;
  }

  return (
    <group ref={groupRef} rotation={rotation}>
      <mesh geometry={glowGeometry} scale={[glowScale, glowScale, glowScale]}>
        <shaderMaterial
          key={`${resolvedGlowColor.getHexString()}:${glowOpacity}:${glowPower}:${glowEdgePower}:${glowRadius}:${glowBoundarySoftness}`}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
          vertexShader={HALO_VERTEX_SHADER}
          fragmentShader={HALO_FRAGMENT_SHADER}
          uniforms={glowUniforms}
        />
      </mesh>
    </group>
  );
}
