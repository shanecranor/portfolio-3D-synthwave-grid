import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type RX7Colors = {
  body?: THREE.ColorRepresentation; // Main car body color
  secondaryBody?: THREE.ColorRepresentation; // Secondary body panels
  glass?: THREE.ColorRepresentation; // Windows
  rubber?: THREE.ColorRepresentation; // Tires/rubber parts
  frontLights?: THREE.ColorRepresentation; // Headlights
  rearLights?: THREE.ColorRepresentation; // Tail lights (middle)
  rearLightsSemi?: THREE.ColorRepresentation; // Tail lights (semi center)
  popupLights?: THREE.ColorRepresentation; // Popup headlight body
  popupLightGlass?: THREE.ColorRepresentation; // Popup headlight glass
  rims?: THREE.ColorRepresentation; // Wheel rims
  brakeRotor?: THREE.ColorRepresentation; // Brake discs
  brakeDisks?: THREE.ColorRepresentation; // Brake discs
};

type RX7ModelProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  colors?: RX7Colors;
  wireframe?: boolean;
  envMap?: THREE.Texture;
};

const DEFAULT_COLORS: RX7Colors = {
  body: 0xff00ff,
  secondaryBody: 0xff00aa,
  glass: 0x001111,
  rubber: 0x111111,
  frontLights: 0xffffff,
  rearLights: 0xff0000,
  rearLightsSemi: 0xff0000,
  popupLights: 0xff00ff,
  popupLightGlass: 0xffffff,
  rims: 0xaaaaaa,
  brakeRotor: 0xff5500,
  brakeDisks: 0x444444,
};

const PART_NAME_MAP: { [key: string]: keyof RX7Colors } = {
  "Mazda_Rx7_-_FC001_Color_Car_2_0": "body",
  "Mazda_Rx7_-_FC001_Secondary_Color_Car_1_0": "secondaryBody",
  "Mazda_Rx7_-_FC001_Glass_0": "glass",
  "Mazda_Rx7_-_FC001_Borracha_0": "rubber",
  "Mazda_Rx7_-_FC001_Luzes_Frente_0": "frontLights",
  "Mazda_Rx7_-_FC001_Luzes_Tr��s_Meio_0": "rearLights",
  "Mazda_Rx7_-_FC001_Luzes_Tr��s_Semi_Centro_0": "rearLightsSemi",
  PopUp_HeadLights001_Color_Car_2_0: "popupLights",
  PopUp_HeadLights001_Luzes_Frente_0: "popupLightGlass",
  Roda_Rim_Shinny001_0: "rims",
  Circle_Rim_Shinny002_0: "brakeDisks",
  Roda_Borracha001_0: "rubber",
  Roda_Borracha001_0_1: "rubber",
  Circle_Metal_Brakes_0: "brakeRotor",
};

export function RX7Model({
  position,
  rotation,
  scale = 1,
  colors = {},
  wireframe = false,
  envMap,
}: RX7ModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/assets/rx7-fc/rx7-2.gltf");

  // Clone the scene to avoid modifying the cached original
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Merge default colors with provided colors
  const finalColors = { ...DEFAULT_COLORS, ...colors };

  useEffect(() => {
    // Traverse the cloned scene and modify materials
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Map the part name to our color key
        const colorKey = PART_NAME_MAP[child.name];
        const partColor = colorKey ? finalColors[colorKey] : 0xff00ff;

        // Create reflective emissive material
        let newMaterial;
        if (envMap) {
          newMaterial = new THREE.MeshStandardMaterial({
            color: partColor,
            emissive: partColor,
            emissiveIntensity: 0.8,
            metalness: 1,
            roughness: 0.2,
            wireframe: wireframe,
            transparent: colorKey === "glass",
            opacity: colorKey === "glass" ? 0.3 : 1.0,
            side: THREE.DoubleSide, // Render both sides to prevent culling issues
            envMap: envMap,
            envMapIntensity: 1.0,
          });
        } else {
          newMaterial = new THREE.MeshBasicMaterial({
            color: partColor,
            wireframe: wireframe,
            transparent: colorKey === "glass",
            opacity: colorKey === "glass" ? 0.95 : 1.0,
            side: THREE.DoubleSide, // Render both sides to prevent culling issues
          });
        }

        child.material = newMaterial;
      }
    });
  }, [clonedScene, finalColors, wireframe, envMap]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload the model
useGLTF.preload("/assets/rx7-fc/rx7-2.gltf");
