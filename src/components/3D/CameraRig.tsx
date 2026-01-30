import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import * as THREE from "three";

export type ViewConfig = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  surfaceUp?: boolean;
};

export const VIEWS: ViewConfig[] = [
  {
    label: "Default",
    position: [0, 5.15 * 2, 0],
    target: [0, 5.15 * 2, -18 * 2],
    surfaceUp: true,
  },
  { label: "Low Orbit", position: [9, 2, 0], target: [0, 1, 0] },
  { label: "Top Down", position: [0, 8, 0.01], target: [0, 0, 0] },
];

type CameraRigProps = {
  viewIndex: number;
};

export function CameraRig({ viewIndex }: CameraRigProps) {
  const [controls, setControls] = useState<CameraControls | null>(null);
  const initializedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const orbitAngleRef = useRef(0);
  const cameraRadiusRef = useRef(0);
  const targetRadiusRef = useRef(0);
  const targetAngleRef = useRef(0);
  const previousViewIndexRef = useRef(viewIndex);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const view = VIEWS[viewIndex];
  const isDefaultView = viewIndex === 0;

  useEffect(() => {
    if (!controls || !view) return;

    const viewChanged = previousViewIndexRef.current !== viewIndex;

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

      // Set initial position without transition
      controls.setLookAt(
        ...view.position,
        ...view.target,
        true, // skip transition
      );
    } else if (viewChanged) {
      // Cancel any existing transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // When switching views, mark as transitioning
      isTransitioningRef.current = true;
      previousViewIndexRef.current = viewIndex;

      // Trigger smooth transition
      controls.setLookAt(
        ...view.position,
        ...view.target,
        true, //enable transition        false, // enable transition
      );

      // Wait for the transition to complete before allowing orbiting
      transitionTimeoutRef.current = setTimeout(() => {
        // After transition completes, sync orbit parameters with current camera position
        // This ensures smooth start of orbiting from wherever the camera ended up
        const camPos = controls.camera.position;
        orbitAngleRef.current = Math.atan2(camPos.z, camPos.y);
        cameraRadiusRef.current = Math.sqrt(camPos.y ** 2 + camPos.z ** 2);

        const target = controls.getTarget(new THREE.Vector3());
        targetAngleRef.current = Math.atan2(target.z, target.y);
        targetRadiusRef.current = Math.sqrt(target.y ** 2 + target.z ** 2);

        isTransitioningRef.current = false;
        transitionTimeoutRef.current = null;
      }, 2500);
    }

    // Cleanup function to cancel timeout on unmount
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [controls, view, viewIndex]);

  useFrame((state, delta) => {
    if (!controls) return;

    // Only orbit when in default view and not transitioning
    if (!isDefaultView || isTransitioningRef.current) {
      // Let CameraControls handle the transition
      controls.update(delta);
      return;
    }

    // Update orbit angle (opposite direction to cancel sphere rotation on x-axis)
    const rotationSpeed = -0.01;
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

    // Update camera position, target, and up vector manually for orbiting
    controls.camera.position.set(view.position[0], newCamY, newCamZ);
    if (view.surfaceUp) {
      controls.camera.up.copy(controls.camera.position).normalize();
    } else {
      // Up vector perpendicular to the orbital plane (around X-axis).
      const upY = Math.sin(orbitAngleRef.current);
      const upZ = -Math.cos(orbitAngleRef.current);
      controls.camera.up.set(0, upY, upZ);
    }
    controls.camera.lookAt(view.target[0], newTargetY, newTargetZ);
    controls.camera.updateProjectionMatrix();
  });

  return <CameraControls ref={(ref) => setControls(ref)} smoothTime={0.9} />;
}
