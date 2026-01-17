import { useMemo } from "react";
import * as THREE from "three";

function addNoiseToSphere(
  geometry: THREE.SphereGeometry,
  noiseAmount: number = 0.1,
) {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const distance = vertex.length();

    // Add noise based on vertex position
    const noise =
      Math.sin(vertex.x * 3 + vertex.y * 2) *
      Math.cos(vertex.y * 4 + vertex.z * 3) *
      Math.sin(vertex.z * 2 + vertex.x * 5) *
      noiseAmount;

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
}: NoisySphereProps) {
  const { sphereGeometry, wireframeGeometry } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    addNoiseToSphere(geo, noiseAmount);
    const wireframe = createSphereWireframe(geo, widthSegments, heightSegments);
    return { sphereGeometry: geo, wireframeGeometry: wireframe };
  }, [radius, widthSegments, heightSegments, noiseAmount]);

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
