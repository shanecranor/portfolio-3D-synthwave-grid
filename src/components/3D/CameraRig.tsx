import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type ViewConfig = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  up?: [number, number, number];
  surfaceUp?: boolean;
};

export const VIEWS: ViewConfig[] = [
  {
    label: "Default",
    position: [0, 5.15 * 2, 0],
    target: [0, 5.15 * 2, -18 * 2],
  },
  { label: "Zoom Out", position: [0, 10, 10], target: [0, 20, -36] },
  {
    label: "Top Down",
    position: [0, 16, 0.0],
    target: [0, 0, 0],
    up: [0, 0, -1],
  },
];

type CameraRigProps = {
  viewIndex: number;
};

export function CameraRig({ viewIndex }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const initializedRef = useRef(false);
  const orbitAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const camRadiusRef = useRef(0);
  const targetRadiusRef = useRef(0);
  const currentTargetRef = useRef(new THREE.Vector3());
  const currentUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredUp = useMemo(() => new THREE.Vector3(), []);

  const view = VIEWS[viewIndex];
  const isDefaultView = viewIndex === 0;

  useEffect(() => {
    if (!view) return;

    if (!initializedRef.current) {
      camera.position.set(...view.position);
      currentTargetRef.current.set(...view.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(currentTargetRef.current);
      camRadiusRef.current = Math.hypot(view.position[1], view.position[2]);
      targetRadiusRef.current = Math.hypot(view.target[1], view.target[2]);
      initializedRef.current = true;
    }

    if (viewIndex === 0) {
      // Sync the orbit state from the live camera/target when re-entering
      // the default view so the transition stays continuous.
      orbitAngleRef.current = Math.atan2(camera.position.z, camera.position.y);
      targetAngleRef.current = Math.atan2(
        currentTargetRef.current.z,
        currentTargetRef.current.y,
      );
      camRadiusRef.current = Math.hypot(camera.position.y, camera.position.z);
      targetRadiusRef.current = Math.hypot(
        currentTargetRef.current.y,
        currentTargetRef.current.z,
      );
    }
  }, [camera, view, viewIndex]);

  useFrame((state, delta) => {
    if (!view) return;

    const orbitSpeed = 0.01;
    if (isDefaultView) {
      orbitAngleRef.current += delta * orbitSpeed;
      targetAngleRef.current += delta * orbitSpeed;

      const defaultCamRadius = Math.hypot(view.position[1], view.position[2]);
      const defaultTargetRadius = Math.hypot(view.target[1], view.target[2]);
      const radiusEase = 1 - Math.exp(-2 * delta);
      camRadiusRef.current = THREE.MathUtils.lerp(
        camRadiusRef.current,
        defaultCamRadius,
        radiusEase,
      );
      targetRadiusRef.current = THREE.MathUtils.lerp(
        targetRadiusRef.current,
        defaultTargetRadius,
        radiusEase,
      );

      desiredPos.set(
        view.position[0],
        Math.cos(orbitAngleRef.current) * camRadiusRef.current,
        Math.sin(orbitAngleRef.current) * camRadiusRef.current,
      );

      desiredTarget.set(
        view.target[0],
        Math.cos(targetAngleRef.current) * targetRadiusRef.current,
        Math.sin(targetAngleRef.current) * targetRadiusRef.current,
      );
    } else {
      desiredPos.set(...view.position);
      desiredTarget.set(...view.target);
    }

    if (view.surfaceUp) {
      desiredUp.copy(desiredPos).normalize();
    } else if (view.up) {
      desiredUp.set(...view.up);
    } else {
      desiredUp.set(0, 1, 0);
    }

    const posEase = 1 - Math.exp(-4 * delta);
    const targetEase = 1 - Math.exp(-5 * delta);
    const upEase = 1 - Math.exp(-6 * delta);

    camera.position.lerp(desiredPos, posEase);
    currentTargetRef.current.lerp(desiredTarget, targetEase);
    currentUpRef.current.lerp(desiredUp, upEase).normalize();

    camera.up.copy(currentUpRef.current);
    camera.lookAt(currentTargetRef.current);
  });

  return null;
}
