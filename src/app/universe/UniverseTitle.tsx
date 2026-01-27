"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import {
  MeshTransmissionMaterial,
  Line,
  Center,
  useFont,
} from "@react-three/drei";

extend({ TextGeometry });
declare module "@react-three/fiber" {
  interface ThreeElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    textGeometry: any;
  }
}

const AnimatedDashLine = ({ shape, color, thickness, speed = 1 }) => {
  const lineRef = useRef<any>(null);
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
    if (lineRef.current?.material) {
      // move the dash offset continuously to animate
      lineRef.current.material.dashOffset -= delta * speed * 10;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={linePoints}
      color={color}
      lineWidth={thickness}
      dashed
      dashScale={1}
      dashSize={totalLineLength * 0.5}
      gapSize={totalLineLength * 1.5}
    />
  );
};

export const UniverseTitle = () => {
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

  return (
    <Center position={[0, 5, 3]} rotation={[0.8, 0, 0]}>
      <group>
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
                speed={0.5}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color="cyan"
                  thickness={3}
                  speed={0.5}
                />
              ))}
            </group>
          ))}
        </group>
      </group>
    </Center>
  );
};
