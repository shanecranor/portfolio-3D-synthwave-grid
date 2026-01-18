"use client";

import {
  Center,
  MeshTransmissionMaterial,
  Text3D,
  Outlines,
} from "@react-three/drei";

export const UniverseTitle = () => (
  <Center scale={[2, 2, 0.2]} position={[0, 5, 3]} rotation={[0.8, 0, 0]}>
    <Text3D
      font="AAReg.json"
      bevelEnabled
      bevelSize={0.01}
      bevelThickness={0.9}
      bevelOffset={0}
    >
      Shane Cranor
      <MeshTransmissionMaterial
        samples={4}
        resolution={64}
        color={[1.0, 1.0, 1.0]}
        ior={1.5}
        opacity={0.1}
        metalness={0.1}
        roughness={0.2}
        transmission={0.3}
        thickness={4}
        // emissive={[0.0, 0.1, 0.2]}
      />
      <Outlines thickness={2} color={[1, 1, 1]} angle={1} />
    </Text3D>
  </Center>
);
