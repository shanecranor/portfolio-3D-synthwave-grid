import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simplexNoise3D } from "./simplex";

const HALO_VERTEX_SHADER = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const HALO_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPower;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float ndv = abs(dot(normalize(vWorldNormal), viewDir));
  float falloff = pow(ndv, uPower);
  float alpha = falloff * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`;

function simplexNoise3DFractal(
  x: number,
  y: number,
  z: number,
  octaves: number = 4,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value +=
      simplexNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

function addNoiseToSphere(
  geometry: THREE.SphereGeometry,
  noiseAmount: number = 0.1,
  flatCenter: boolean = true,
  poleNoiseFloor: number = 0.25,
  equatorPower: number = 1.5,
  yNoiseScale: number = 0.4,
  displaceYScale: number = 0.6,
  cylinderMorph: number = 0,
) {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.length();
    const baseVertex = vertex.clone();
    const xzLength = Math.hypot(baseVertex.x, baseVertex.z);

    if (cylinderMorph > 0 && xzLength > 1e-6) {
      const targetXZ = THREE.MathUtils.lerp(xzLength, distance, cylinderMorph);
      const scaleXZ = targetXZ / xzLength;
      baseVertex.x *= scaleXZ;
      baseVertex.z *= scaleXZ;
    }

    const baseDistance = baseVertex.length();
    const normalY = Math.abs(baseVertex.y) / baseDistance;
    const equatorWeight = Math.pow(1 - normalY, equatorPower);
    const axisWeight = THREE.MathUtils.lerp(poleNoiseFloor, 1, equatorWeight);
    const direction = baseVertex.clone().normalize();

    // Simplex noise for realistic mountain-like terrain
    let noise =
      simplexNoise3DFractal(
        baseVertex.x,
        baseVertex.y * yNoiseScale,
        baseVertex.z,
        4,
      ) * noiseAmount;

    // Reduce noise near the poles, keep more around the equator (x/z-heavy).
    noise *= axisWeight;

    if (flatCenter) {
      // Reduce noise around y = 0 for flat center
      noise *=
        -1.5 * Math.cos(Math.min(Math.abs(baseVertex.y) * 1.5, Math.PI)) + 1.7;
    }
    const displacement = new THREE.Vector3(
      direction.x,
      direction.y * displaceYScale,
      direction.z,
    );
    baseVertex.addScaledVector(displacement, noise);
    positions.setXYZ(i, baseVertex.x, baseVertex.y, baseVertex.z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createSphereWireframe(
  geometry: THREE.SphereGeometry,
  widthSegments: number,
  heightSegments: number,
) {
  const positions = geometry.attributes.position;
  const lines: number[] = [];

  // Helper to get vertex index in sphere geometry
  const getIndex = (lat: number, lon: number) => {
    return lat * (widthSegments + 1) + lon;
  };

  // Draw latitude lines (horizontal circles)
  for (let lat = 0; lat <= heightSegments; lat++) {
    for (let lon = 0; lon < widthSegments; lon++) {
      const i1 = getIndex(lat, lon);
      const i2 = getIndex(lat, lon + 1);

      const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2);

      lines.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  }

  // Draw longitude lines (vertical meridians)
  for (let lon = 0; lon <= widthSegments; lon++) {
    for (let lat = 0; lat < heightSegments; lat++) {
      const i1 = getIndex(lat, lon);
      const i2 = getIndex(lat + 1, lon);

      const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2);

      lines.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(lines, 3),
  );

  return lineGeometry;
}

type NoisySphereProps = {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  noiseAmount?: number;
  rotation?: [number, number, number];
  edgeColor?: THREE.Color;
  glowColor?: THREE.Color;
  glowSpread?: number;
  glowOpacity?: number;
  glowPower?: number;
  edgeThreshold?: number;
  edgeLineWidth?: number;
  flatCenter?: boolean;
  poleNoiseFloor?: number;
  equatorPower?: number;
  yNoiseScale?: number;
  displaceYScale?: number;
  cylinderMorph?: number;
};

export function NoisySphere({
  radius = 5,
  widthSegments = 180,
  heightSegments = 90,
  noiseAmount = 0.08,
  rotation = [0, 0, Math.PI / 2],
  edgeColor,
  glowColor,
  glowSpread = 0.7,
  glowOpacity = 0.14,
  glowPower = 2.1,
  flatCenter = true,
  poleNoiseFloor = 0.25,
  equatorPower = 1.5,
  yNoiseScale = 0.4,
  displaceYScale = 0.6,
  cylinderMorph = 0,
}: NoisySphereProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { sphereGeometry, wireframeGeometry, glowGeometry } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const glowWidthSegments = 32;
    const glowHeightSegments = 16;
    const glowGeo = new THREE.SphereGeometry(
      radius * 2,
      glowWidthSegments,
      glowHeightSegments,
    );
    addNoiseToSphere(
      geo,
      noiseAmount,
      flatCenter,
      poleNoiseFloor,
      equatorPower,
      yNoiseScale,
      displaceYScale,
      cylinderMorph,
    );
    const wireframe = createSphereWireframe(geo, widthSegments, heightSegments);
    return {
      sphereGeometry: geo,
      wireframeGeometry: wireframe,
      glowGeometry: glowGeo,
    };
  }, [
    radius,
    widthSegments,
    heightSegments,
    noiseAmount,
    flatCenter,
    poleNoiseFloor,
    equatorPower,
    yNoiseScale,
    displaceYScale,
    cylinderMorph,
  ]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = clock.elapsedTime * 0.03;
    }
  });
  const glowScale = 1 + Math.max(0.02, glowSpread);

  return (
    <group ref={groupRef} rotation={rotation}>
      <mesh geometry={sphereGeometry} scale={[0.99, 0.99, 0.99]}>
        <meshBasicMaterial color={[0, 0, 0]} />
      </mesh>
      {edgeColor && (
        <lineSegments geometry={wireframeGeometry}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}
      {glowColor && (
        <mesh geometry={glowGeometry} scale={[glowScale, glowScale, glowScale]}>
          <shaderMaterial
            transparent
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            vertexShader={HALO_VERTEX_SHADER}
            fragmentShader={HALO_FRAGMENT_SHADER}
            uniforms={{
              uColor: { value: glowColor },
              uOpacity: { value: glowOpacity },
              uPower: { value: glowPower },
            }}
          />
        </mesh>
      )}
    </group>
  );
}
