import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { stepDampedSpring } from "@/components/3D/stepDampedSpring";

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

export type CameraHoverFocus = {
  point: [number, number, number];
  positionInfluence?: number;
  targetInfluence?: number;
};

const CAMERA_POSITION_SPRING_FREQUENCY = 7;
const CAMERA_TARGET_SPRING_FREQUENCY = 8;
const CAMERA_SPRING_DAMPING = 1.2;

function stepVectorSpring(
  current: THREE.Vector3,
  velocity: THREE.Vector3,
  target: THREE.Vector3,
  delta: number,
  angularFrequency: number,
  dampingRatio: number,
) {
  const nextX = stepDampedSpring(
    current.x,
    velocity.x,
    target.x,
    delta,
    angularFrequency,
    dampingRatio,
  );
  const nextY = stepDampedSpring(
    current.y,
    velocity.y,
    target.y,
    delta,
    angularFrequency,
    dampingRatio,
  );
  const nextZ = stepDampedSpring(
    current.z,
    velocity.z,
    target.z,
    delta,
    angularFrequency,
    dampingRatio,
  );

  current.set(nextX.value, nextY.value, nextZ.value);
  velocity.set(nextX.velocity, nextY.velocity, nextZ.velocity);
}

type CameraRigProps = {
  viewIndex: number;
  manualControlEnabled?: boolean;
  hoverFocus?: CameraHoverFocus | null;
};

export function CameraRig({
  viewIndex,
  manualControlEnabled = false,
  hoverFocus = null,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const initializedRef = useRef(false);
  const currentTargetRef = useRef(new THREE.Vector3());
  const currentUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const positionVelocityRef = useRef(new THREE.Vector3());
  const targetVelocityRef = useRef(new THREE.Vector3());
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredUp = useMemo(() => new THREE.Vector3(), []);
  const hoverPoint = useMemo(() => new THREE.Vector3(), []);

  const view = VIEWS[viewIndex];

  useLayoutEffect(() => {
    if (!view) return;

    if (!initializedRef.current) {
      if (view.surfaceUp) {
        desiredUp.set(...view.position).normalize();
      } else if (view.up) {
        desiredUp.set(...view.up);
      } else {
        desiredUp.set(0, 1, 0);
      }

      camera.position.set(...view.position);
      currentTargetRef.current.set(...view.target);
      currentUpRef.current.copy(desiredUp).normalize();
      positionVelocityRef.current.set(0, 0, 0);
      targetVelocityRef.current.set(0, 0, 0);
      camera.up.copy(currentUpRef.current);
      camera.lookAt(currentTargetRef.current);
      initializedRef.current = true;
    }
  }, [camera, view, desiredUp]);

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
    positionVelocityRef.current.set(0, 0, 0);
    targetVelocityRef.current.set(0, 0, 0);
    camera.up.copy(currentUpRef.current);
    camera.lookAt(currentTargetRef.current);
  }, [
    camera,
    view,
    manualControlEnabled,
    desiredPos,
    desiredTarget,
    desiredUp,
  ]);

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

    if (hoverFocus && viewIndex === 0) {
      hoverPoint.set(...hoverFocus.point);
      desiredPos.lerp(hoverPoint, hoverFocus.positionInfluence ?? 0.02);
      desiredTarget.lerp(hoverPoint, hoverFocus.targetInfluence ?? 0.035);
    }

    const upEase = 1 - Math.exp(-6 * delta);

    stepVectorSpring(
      camera.position,
      positionVelocityRef.current,
      desiredPos,
      delta,
      CAMERA_POSITION_SPRING_FREQUENCY,
      CAMERA_SPRING_DAMPING,
    );
    stepVectorSpring(
      currentTargetRef.current,
      targetVelocityRef.current,
      desiredTarget,
      delta,
      CAMERA_TARGET_SPRING_FREQUENCY,
      CAMERA_SPRING_DAMPING,
    );
    currentUpRef.current.lerp(desiredUp, upEase).normalize();

    camera.up.copy(currentUpRef.current);
    camera.lookAt(currentTargetRef.current);
  });

  return null;
}
