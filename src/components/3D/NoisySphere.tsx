import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simplexNoise3D } from "./simplex";

const GRID_GLOW_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRID_GLOW_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uWidth;
uniform float uCurve;
uniform float uWidthSegments;
uniform float uHeightSegments;
varying vec2 vUv;

float distanceToWrappedGridLine(float coordinate, float segments) {
  float localCoordinate = fract(coordinate * segments);
  return min(localCoordinate, 1.0 - localCoordinate);
}

float distanceToInteriorGridLine(float coordinate, float segments) {
  float scaledCoordinate = coordinate * segments;
  float nearestLine = clamp(
    floor(scaledCoordinate + 0.5),
    1.0,
    segments - 1.0
  );
  return abs(scaledCoordinate - nearestLine);
}

void main() {
  float longitudeDistance = distanceToWrappedGridLine(
    vUv.x,
    uWidthSegments
  );
  float latitudeDistance = distanceToInteriorGridLine(
    vUv.y,
    uHeightSegments
  );
  float edgeDistance = min(longitudeDistance, latitudeDistance);

  float normalizedDistance = clamp(
    edgeDistance / max(uWidth, 0.0001),
    0.0,
    1.0
  );
  float edgeGlow = pow(
    max(1.0 - normalizedDistance, 0.0),
    max(uCurve, 0.0001)
  ) * uIntensity;

  // The shader remains opaque so it preserves the sphere's dark interior.
  gl_FragColor = vec4(uColor * edgeGlow, 1.0);
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
  edgeOpacity?: number;
  surfaceGlowColor?: THREE.Color;
  surfaceGlowIntensity?: number;
  surfaceGlowWidth?: number;
  surfaceGlowCurve?: number;
  edgeThreshold?: number;
  edgeLineWidth?: number;
  flatCenter?: boolean;
  poleNoiseFloor?: number;
  equatorPower?: number;
  yNoiseScale?: number;
  displaceYScale?: number;
  cylinderMorph?: number;
  rotateAnimation?: [number, number, number];
};

export function NoisySphere({
  radius = 5,
  widthSegments = 180,
  heightSegments = 90,
  noiseAmount = 0.08,
  rotation = [0, 0, Math.PI / 2],
  edgeColor,
  edgeOpacity = 1,
  surfaceGlowColor,
  surfaceGlowIntensity = 0.8,
  surfaceGlowWidth = 0.16,
  surfaceGlowCurve = 1.35,
  flatCenter = true,
  poleNoiseFloor = 0.25,
  equatorPower = 1.5,
  yNoiseScale = 0.4,
  displaceYScale = 0.6,
  cylinderMorph = 0,
  rotateAnimation = [0.015, 0, 0],
}: NoisySphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const surfaceGlowMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const surfaceGlowUniforms = useMemo(
    () => ({
      uColor: {
        value: new THREE.Color(0, 0, 0),
      },
      uIntensity: { value: surfaceGlowIntensity },
      uWidth: { value: surfaceGlowWidth },
      uCurve: { value: surfaceGlowCurve },
      uWidthSegments: { value: widthSegments },
      uHeightSegments: { value: heightSegments },
    }),
    [
      heightSegments,
      surfaceGlowCurve,
      surfaceGlowIntensity,
      surfaceGlowWidth,
      widthSegments,
    ],
  );

  useLayoutEffect(() => {
    const surfaceGlowMaterial = surfaceGlowMaterialRef.current;
    if (!surfaceGlowMaterial || !surfaceGlowColor) return;

    const shaderColor = surfaceGlowMaterial.uniforms.uColor.value as THREE.Color;
    shaderColor.copy(surfaceGlowColor);
    surfaceGlowMaterial.uniformsNeedUpdate = true;
  }, [surfaceGlowColor]);

  const { sphereGeometry, wireframeGeometry } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
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
    const wireframe = createSphereWireframe(
      geo,
      widthSegments,
      heightSegments,
    );
    return {
      sphereGeometry: geo,
      wireframeGeometry: wireframe,
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
    if (!groupRef.current) return;
    const time = clock.elapsedTime;
    const surfaceGlowMaterial = surfaceGlowMaterialRef.current;

    if (surfaceGlowMaterial && surfaceGlowColor) {
      const shaderColor = surfaceGlowMaterial.uniforms.uColor.value as THREE.Color;
      shaderColor.copy(surfaceGlowColor);
    }

    groupRef.current.rotation.x = rotation[0] + rotateAnimation[0] * time;
    groupRef.current.rotation.y = rotation[1] + rotateAnimation[1] * time;
    groupRef.current.rotation.z = rotation[2] + rotateAnimation[2] * time;
  });

  return (
    <group ref={groupRef} rotation={rotation}>
      <mesh
        geometry={sphereGeometry}
        // scale={[0.998, 0.998, 0.998]}
        scale={0.999}
      >
        {surfaceGlowColor ? (
          <shaderMaterial
            ref={surfaceGlowMaterialRef}
            vertexShader={GRID_GLOW_VERTEX_SHADER}
            fragmentShader={GRID_GLOW_FRAGMENT_SHADER}
            uniforms={surfaceGlowUniforms}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial color={[0.0, 0.0, 0.0]} />
        )}
        {/* <MeshTransmissionMaterial
          backside
          samples={2}
          resolution={64}
          thickness={0.05}
          roughness={0.8}
          iridescence={1}
          iridescenceIOR={1.4}
          chromaticAberration={1}
          anisotropy={1}
          color={[1, 1, 1]}
          transmission={0.2}
          emissive={[0, 0, 0]}
        /> */}
      </mesh>
      {edgeColor && (
        <lineSegments geometry={wireframeGeometry}>
          <lineBasicMaterial
            color={edgeColor}
            transparent={edgeOpacity < 1}
            opacity={edgeOpacity}
            toneMapped={false}
          />
        </lineSegments>
      )}
    </group>
  );
}
