"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, extend, useThree } from "@react-three/fiber";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import type { Line2, LineMaterial } from "three-stdlib";
import {
  MeshTransmissionMaterial,
  Line,
  Center,
  useFont,
} from "@react-three/drei";
import { VIEWS } from "@/components/3D/CameraRig";

extend({ TextGeometry });
declare module "@react-three/fiber" {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    textGeometry: any;
  }
}

const AnimatedDashLine = ({
  shape,
  color,
  thickness,
  speed = 1,
  dashSize = 0.25,
  gapSize = 0.1,
}) => {
  const lineRef = useRef<Line2 | null>(null);
  const { linePoints, totalLineLength } = useMemo(() => {
    // add z coord to 2D points to make them 3D
    const _points = shape.getPoints().map((p) => [p.x, p.y, 0]);
    // calculate approximate total line length
    let _length = 0;
    for (let i = 0; i < _points.length - 1; i++) {
      const currentPoint = new THREE.Vector3(..._points[i]);
      const nextPoint = new THREE.Vector3(..._points[i + 1]);
      _length += currentPoint.distanceTo(nextPoint);
    }

    return { linePoints: _points, totalLineLength: _length };
  }, [shape]);

  useFrame((state, delta) => {
    const material = lineRef.current?.material as LineMaterial | undefined;
    if (!material) return;

    // move the dash offset continuously to animate
    material.dashOffset -= delta * speed * 10;
  });

  return (
    <Line
      ref={lineRef}
      points={linePoints}
      color={color}
      lineWidth={thickness}
      dashed
      dashScale={1}
      dashSize={totalLineLength * dashSize}
      gapSize={totalLineLength * gapSize}
    />
  );
};

type UniverseTitleProps = {
  viewIndex: number;
  angleOffset?: number;
  radialOffset?: number;
  xOffset?: number;
};

export const UniverseTitle = ({
  viewIndex,
  angleOffset = 0,
  radialOffset = 0,
  xOffset = 0,
}: UniverseTitleProps) => {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const orbitAngleRef = useRef(0);
  const orbitRadiusRef = useRef(0);
  const orbitXRef = useRef(0);
  const defaultView = VIEWS[0];

  const font = useFont("/AAReg.json");

  const text = "Shane Cranor";
  const config = useMemo(
    () => ({
      font,
      size: 2,
      depth: 0.4,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.02,
      bevelOffset: 0,
      bevelSegments: 5,
    }),
    [font],
  );

  // Generate the 2D shapes for the outlines
  const shapes = useMemo(() => {
    return font.generateShapes(text, config.size);
  }, [font, text, config.size]);

  const isDefaultView = viewIndex === 0;

  useEffect(() => {
    if (!isDefaultView || !defaultView) return;

    // Sync orbit parameters with the current camera state so the title
    // sits on the same orbital path when returning to default view.
    const camPos = camera.position;
    orbitAngleRef.current = Math.atan2(camPos.z, camPos.y);
    orbitRadiusRef.current = Math.sqrt(camPos.y ** 2 + camPos.z ** 2);
    orbitXRef.current = camPos.x;
  }, [camera, defaultView, isDefaultView]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    root.visible = isDefaultView;
    if (!isDefaultView || !defaultView) return;

    // Match the orbit math in CameraRig so the title rides the same path.
    const rotationSpeed = -0.01;
    orbitAngleRef.current -= delta * rotationSpeed;

    const orbitAngle = orbitAngleRef.current + angleOffset;
    const orbitRadius = orbitRadiusRef.current + radialOffset;

    const newY = Math.cos(orbitAngle) * orbitRadius;
    const newZ = Math.sin(orbitAngle) * orbitRadius;

    root.position.set(orbitXRef.current + xOffset, newY, newZ);

    // Keep the title aligned with the orbit path (around the X axis),
    // without matching the camera orientation.
    root.rotation.set(orbitAngle + 0.4, 0, 0);
  });

  return (
    <group ref={rootRef}>
      <Center>
        <mesh>
          <textGeometry args={[text, config]} />
          <MeshTransmissionMaterial
            backside
            samples={4}
            resolution={256}
            thickness={0.5}
            roughness={0.2}
            iridescence={50}
            iridescenceIOR={1.4}
            chromaticAberration={1}
            anisotropy={1}
            color="#ffffff"
            transmission={1}
            emissive={[0, 0, 0]}
          />
        </mesh>

        {/* animated outlines */}
        <group position={[0, 0, config.depth + config.bevelThickness + 0.01]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color="cyan"
                thickness={3}
                speed={0.1}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color="cyan"
                  thickness={3}
                  speed={0.1}
                />
              ))}
            </group>
          ))}
        </group>
        <group position={[0, 0, -1 * (config.bevelThickness + 0.01)]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color={[0, 1, 1]}
                thickness={1}
                speed={0.05}
                dashSize={0.3}
                gapSize={0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={[0, 1, 1]}
                  thickness={3}
                  speed={0.5}
                  dashSize={1}
                  gapSize={0}
                />
              ))}
            </group>
          ))}
        </group>
      </Center>
    </group>
  );
};
