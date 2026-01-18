import { useMemo } from "react";
import * as THREE from "three";

// Simple 3D Perlin-like noise function
function smoothNoise(
  x: number,
  y: number,
  z: number,
  frequency: number,
): number {
  const X = Math.floor(x * frequency);
  const Y = Math.floor(y * frequency);
  const Z = Math.floor(z * frequency);

  const hash = (X * 374761393 + Y * 668265263 + Z * 1274126177) & 0x7fffffff;
  return (Math.sin(hash * 0.00001) + Math.cos(hash * 0.00002)) * 0.5;
}

// Multi-octave noise (fractal Brownian motion)
function perlinNoise3D(
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
    value += smoothNoise(x, y, z, frequency) * amplitude;
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
) {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.length();

    // Simple Perlin-like noise for organic mountain-like terrain
    let noise = perlinNoise3D(vertex.x, vertex.y, vertex.z, 4) * noiseAmount;

    if (flatCenter) {
      // Reduce noise around y = 0 for flat center
      noise *=
        -1.5 * Math.cos(Math.min(Math.abs(vertex.y) * 1.5, Math.PI)) + 1.7;
    }

    vertex.normalize().multiplyScalar(distance + noise);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
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
  edgeThreshold?: number;
  edgeLineWidth?: number;
  flatCenter?: boolean;
};

export function NoisySphere({
  radius = 5,
  widthSegments = 180,
  heightSegments = 90,
  noiseAmount = 0.08,
  rotation = [0, 0, Math.PI / 2],
  edgeColor,
  edgeThreshold = 0.9,
  edgeLineWidth = 1,
  flatCenter = true,
}: NoisySphereProps) {
  const { sphereGeometry, wireframeGeometry } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    addNoiseToSphere(geo, noiseAmount, flatCenter);
    const wireframe = createSphereWireframe(geo, widthSegments, heightSegments);
    return { sphereGeometry: geo, wireframeGeometry: wireframe };
  }, [radius, widthSegments, heightSegments, noiseAmount, flatCenter]);

  return (
    <group rotation={rotation}>
      <mesh geometry={sphereGeometry} scale={[0.99, 0.99, 0.99]}>
        <meshBasicMaterial color={[0, 0, 0]} />
      </mesh>
      {edgeColor && (
        <lineSegments geometry={wireframeGeometry}>
          <lineBasicMaterial color={edgeColor} linewidth={edgeLineWidth} />
        </lineSegments>
      )}
    </group>
  );
}
