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
  manualControlEnabled?: boolean;
};

export function CameraRig({
  viewIndex,
  manualControlEnabled = false,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const initializedRef = useRef(false);
  const currentTargetRef = useRef(new THREE.Vector3());
  const currentUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredUp = useMemo(() => new THREE.Vector3(), []);

  const view = VIEWS[viewIndex];

  useEffect(() => {
    if (!view) return;

    if (!initializedRef.current) {
      camera.position.set(...view.position);
      currentTargetRef.current.set(...view.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(currentTargetRef.current);
      initializedRef.current = true;
    }
  }, [camera, view]);

  useEffect(() => {
    if (!view || !manualControlEnabled) return;

    desiredPos.set(...view.position);
    desiredTarget.set(...view.target);

    if (view.surfaceUp) {
      desiredUp.copy(desiredPos).normalize();
    } else if (view.up) {
      desiredUp.set(...view.up);
    } else {
      desiredUp.set(0, 1, 0);
    }

    camera.position.copy(desiredPos);
    currentTargetRef.current.copy(desiredTarget);
    currentUpRef.current.copy(desiredUp).normalize();
    camera.up.copy(currentUpRef.current);
    camera.lookAt(currentTargetRef.current);
  }, [camera, view, manualControlEnabled, desiredPos, desiredTarget, desiredUp]);

  useFrame((_, delta) => {
    if (!view || manualControlEnabled) return;

    desiredPos.set(...view.position);
    desiredTarget.set(...view.target);

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
