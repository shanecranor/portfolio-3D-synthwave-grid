import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";

export type ViewConfig = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

export const VIEWS: ViewConfig[] = [
  { label: "Default", position: [0, 2.3, 5], target: [0, 10, 0] },
  { label: "Low Orbit", position: [5, 2, 0], target: [0, 1, 0] },
  { label: "Top Down", position: [0, 8, 0.01], target: [0, 0, 0] },
];

type CameraRigProps = {
  viewIndex: number;
};

export function CameraRig({ viewIndex }: CameraRigProps) {
  const [controls, setControls] = useState<CameraControls | null>(null);
  const initializedRef = useRef(false);
  const orbitAngleRef = useRef(0);
  const cameraRadiusRef = useRef(0);
  const targetRadiusRef = useRef(0);
  const targetAngleRef = useRef(0);

  const view = VIEWS[viewIndex];

  useEffect(() => {
    if (!controls || !view) return;

    // Initialize orbit angles and radii based on starting positions
    if (!initializedRef.current) {
      orbitAngleRef.current = Math.atan2(view.position[2], view.position[1]);
      cameraRadiusRef.current = Math.sqrt(
        view.position[1] ** 2 + view.position[2] ** 2,
      );
      targetAngleRef.current = Math.atan2(view.target[2], view.target[1]);
      targetRadiusRef.current = Math.sqrt(
        view.target[1] ** 2 + view.target[2] ** 2,
      );
      initializedRef.current = true;
    } else {
      // When switching views, smoothly transition
      orbitAngleRef.current = Math.atan2(view.position[2], view.position[1]);
      cameraRadiusRef.current = Math.sqrt(
        view.position[1] ** 2 + view.position[2] ** 2,
      );
      targetAngleRef.current = Math.atan2(view.target[2], view.target[1]);
      targetRadiusRef.current = Math.sqrt(
        view.target[1] ** 2 + view.target[2] ** 2,
      );
    }

    controls.setLookAt(
      ...view.position,
      ...view.target,
      initializedRef.current, // disable transition for the first load
    );
  }, [controls, view]);

  useFrame((state, delta) => {
    if (!controls) return;

    // Update orbit angle (opposite direction to cancel sphere rotation on x-axis)
    const rotationSpeed = -0.027;
    orbitAngleRef.current -= delta * rotationSpeed;
    targetAngleRef.current -= delta * rotationSpeed;

    // Orbit camera around X axis
    const newCamY = Math.cos(orbitAngleRef.current) * cameraRadiusRef.current;
    const newCamZ = Math.sin(orbitAngleRef.current) * cameraRadiusRef.current;

    // Orbit target around X axis to maintain viewing angle
    const newTargetY =
      Math.cos(targetAngleRef.current) * targetRadiusRef.current;
    const newTargetZ =
      Math.sin(targetAngleRef.current) * targetRadiusRef.current;

    // Calculate up vector perpendicular to orbital plane (around X-axis)
    // Up vector should point in the direction perpendicular to the view
    const upY = Math.sin(orbitAngleRef.current);
    const upZ = -Math.cos(orbitAngleRef.current);

    // Update camera position, target, and up vector
    controls.camera.position.set(view.position[0], newCamY, newCamZ);
    controls.camera.up.set(0, upY, upZ);
    controls.camera.lookAt(view.target[0], newTargetY, newTargetZ);
    controls.camera.updateProjectionMatrix();
  });

  return <CameraControls ref={(ref) => setControls(ref)} smoothTime={1.0} />;
}
