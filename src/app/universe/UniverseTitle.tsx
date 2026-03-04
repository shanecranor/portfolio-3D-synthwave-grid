"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame, extend, useThree } from "@react-three/fiber";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import type { Line2, LineMaterial } from "three-stdlib";
import {
  MeshTransmissionMaterial,
  Line,
  Center,
  useFont,
} from "@react-three/drei";
import {
  DEFAULT_UNIVERSE_TITLE_SCALE,
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  getUniverseTitleAnchorX,
  getUniverseTitleScale,
} from "@/components/3D/universeLayout";

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
  textScale?: number;
};

export const UniverseTitle = ({
  viewIndex,
  textScale = DEFAULT_UNIVERSE_TITLE_SCALE,
}: UniverseTitleProps) => {
  const viewportWidth = useThree((state) => state.viewport.width);
  const rootRef = useRef<THREE.Group>(null);
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouseVel = useRef(new THREE.Vector2(0, 0));
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const font = useFont("/AAReg.json");

  const text = "Shane Cranor";
  const config = useMemo(
    () => ({
      font,
      size: 2,
      depth: 0.1,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 0.05,
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

  const isDefaultView = viewIndex === 0 || true;
  const responsiveTextScale = useMemo(() => {
    return getUniverseTitleScale(viewportWidth, textScale);
  }, [textScale, viewportWidth]);
  const titleAnchorX = useMemo(() => {
    return getUniverseTitleAnchorX(viewportWidth, textScale);
  }, [textScale, viewportWidth]);

  useFrame(({ clock, pointer }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    root.visible = isDefaultView;
    if (!isDefaultView) return;

    //mouse easing
    targetMouse.current.set(pointer.x, pointer.y);

    const follow = 100; // acceleration toward target
    const friction = 8; // velocity decay

    // v += (target - pos) * follow * dt
    const targetMinusPosX = targetMouse.current.x - mousePos.current.x;
    const targetMinusPosY = targetMouse.current.y - mousePos.current.y;
    const xDir = Math.sign(targetMinusPosX);
    const yDir = Math.sign(targetMinusPosY);

    mouseVel.current.x +=
      targetMinusPosX * targetMinusPosX * follow * delta * xDir;
    mouseVel.current.y +=
      targetMinusPosY * targetMinusPosY * follow * delta * yDir;

    // v *= exp(-friction*dt)
    const f = Math.exp(-friction * delta);
    mouseVel.current.multiplyScalar(f);

    // pos += v * dt
    mousePos.current.addScaledVector(mouseVel.current, delta);

    const easedX = mousePos.current.x;
    const easedY = mousePos.current.y;

    // end mouse easing

    root.position.set(
      titleAnchorX,
      DEFAULT_UNIVERSE_ANCHOR_Y,
      DEFAULT_UNIVERSE_ANCHOR_Z,
    );

    const t = clock.getElapsedTime();
    root.rotation.set(
      -easedY * 0.5,
      Math.sin(t) * 0.005 + easedX * 0.08,
      Math.cos(t) * 0.005,
    );
  });

  return (
    <group ref={rootRef}>
      <Center scale={responsiveTextScale}>
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
                color={[0, 2, 2]}
                thickness={2}
                speed={0.1}
                gapSize={0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={[0, 2, 2]}
                  thickness={2}
                  speed={0.1}
                  gapSize={0}
                />
              ))}
            </group>
          ))}
        </group>
        <group position={[0, 0, config.depth + config.bevelThickness + 0.01]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color={[0.1, 0.1, 0.1]}
                thickness={0.2}
                gapSize={0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={[0.1, 0.1, 0.1]}
                  thickness={0.2}
                  gapSize={0}
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
                  thickness={1}
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
