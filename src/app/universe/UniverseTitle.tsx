"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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

const UNIVERSE_TITLE_COLOR = "#ffffff";
const UNIVERSE_TITLE_OUTLINE_GLOW_COLOR = [88, 94, 195].map((c) => c / 100);
const UNIVERSE_TITLE_OUTLINE_SHADOW_COLOR = [0.1, 0.1, 0.1] as const;
const UNIVERSE_TITLE_OUTLINE_BACK_COLOR = [88, 94, 195].map((c) => c / 100);
const TITLE_HITBOX_PADDING_X = 0.8;
const TITLE_HITBOX_PADDING_Y = 0.8;
const TITLE_HITBOX_PADDING_Z = 0.8;
const TITLE_MATERIAL_FADE_SPEED = 10;
const TITLE_MATERIAL_FADE_EPSILON = 0.01;
const TITLE_POINTER_SPEED_MIN = 120;
const TITLE_POINTER_SPEED_MAX = 1600;
const TITLE_POINTER_STRENGTH_DECAY_SPEED = 2.5;

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
  const browserWidth = useThree((state) => state.size.width);
  const rootRef = useRef<THREE.Group>(null);
  const centerRef = useRef<THREE.Group>(null);
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouseVel = useRef(new THREE.Vector2(0, 0));
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const transmissionFadeRef = useRef(0);
  const transmissionMaterialRef = useRef<THREE.Material | null>(null);
  const showTransmissionMaterialRef = useRef(false);
  const pointerMotionStrengthRef = useRef(0);
  const lastPointerSampleRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const [isPrimaryLineAnimationActive, setIsPrimaryLineAnimationActive] =
    useState(false);
  const [showTransmissionMaterial, setShowTransmissionMaterial] =
    useState(false);
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
  const { textGeometry, hitboxGeometry, hitboxPosition } = useMemo(() => {
    const geometry = new TextGeometry(text, config);
    geometry.computeBoundingBox();

    const bounds = geometry.boundingBox ?? new THREE.Box3();
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const hoverGeometry = new THREE.BoxGeometry(
      size.x + TITLE_HITBOX_PADDING_X,
      size.y + TITLE_HITBOX_PADDING_Y,
      size.z + TITLE_HITBOX_PADDING_Z,
    );

    return {
      textGeometry: geometry,
      hitboxGeometry: hoverGeometry,
      hitboxPosition: center.toArray() as [number, number, number],
    };
  }, [config, text]);

  const isDefaultView = viewIndex === 0 || true;
  const responsiveTextScale = useMemo(() => {
    return getUniverseTitleScale(browserWidth, textScale);
  }, [browserWidth, textScale]);
  const titleAnchorX = useMemo(() => {
    return getUniverseTitleAnchorX(browserWidth, textScale);
  }, [browserWidth, textScale]);

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
    centerRef.current?.scale.setScalar(responsiveTextScale);

    const t = clock.getElapsedTime();
    root.rotation.set(
      -easedY * 0.5,
      Math.sin(t) * 0.005 + easedX * 0.08,
      Math.cos(t) * 0.005,
    );

    const strengthDecayEase =
      1 - Math.exp(-TITLE_POINTER_STRENGTH_DECAY_SPEED * delta);
    pointerMotionStrengthRef.current = THREE.MathUtils.lerp(
      pointerMotionStrengthRef.current,
      0,
      strengthDecayEase,
    );

    const targetFade = pointerMotionStrengthRef.current;
    const fadeEase = 1 - Math.exp(-TITLE_MATERIAL_FADE_SPEED * delta);
    const nextFade = THREE.MathUtils.lerp(
      transmissionFadeRef.current,
      targetFade,
      fadeEase,
    );
    transmissionFadeRef.current = nextFade;

    const transmissionMaterial = transmissionMaterialRef.current as
      | (THREE.Material & { opacity?: number; transmission?: number })
      | null;

    if (transmissionMaterial) {
      transmissionMaterial.opacity = nextFade;
      transmissionMaterial.transmission = nextFade;
    }

    if (targetFade > 0 && !showTransmissionMaterialRef.current) {
      showTransmissionMaterialRef.current = true;
      setShowTransmissionMaterial(true);
    }

    if (
      targetFade === 0 &&
      showTransmissionMaterialRef.current &&
      nextFade <= TITLE_MATERIAL_FADE_EPSILON
    ) {
      showTransmissionMaterialRef.current = false;
      setShowTransmissionMaterial(false);
    }
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const lastSample = lastPointerSampleRef.current;
      const nextSample = {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      };

      if (lastSample) {
        const deltaTimeMs = Math.max(1, nextSample.time - lastSample.time);
        const distance = Math.hypot(
          nextSample.x - lastSample.x,
          nextSample.y - lastSample.y,
        );
        const speed = (distance / deltaTimeMs) * 1000;
        const normalizedStrength = THREE.MathUtils.clamp(
          (speed - TITLE_POINTER_SPEED_MIN) /
            (TITLE_POINTER_SPEED_MAX - TITLE_POINTER_SPEED_MIN),
          0,
          1,
        );

        pointerMotionStrengthRef.current = Math.max(
          pointerMotionStrengthRef.current,
          normalizedStrength,
        );
      }

      lastPointerSampleRef.current = nextSample;
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      textGeometry.dispose();
      hitboxGeometry.dispose();
    };
  }, [hitboxGeometry, textGeometry]);

  return (
    <group ref={rootRef}>
      <Center ref={centerRef}>
        <mesh geometry={textGeometry}>
          <meshBasicMaterial color="black" />
        </mesh>
        {showTransmissionMaterial && (
          <mesh geometry={textGeometry} renderOrder={1}>
            <MeshTransmissionMaterial
              ref={transmissionMaterialRef}
              backside
              transparent
              samples={4}
              resolution={256}
              thickness={0.5}
              roughness={0.2}
              iridescence={50}
              iridescenceIOR={1.4}
              chromaticAberration={1}
              anisotropy={1}
              color={UNIVERSE_TITLE_COLOR}
              transmission={1}
              opacity={0}
              depthWrite={false}
              emissive={[0, 0, 0]}
            />
          </mesh>
        )}
        <mesh
          geometry={hitboxGeometry}
          position={hitboxPosition}
          onClick={(event) => {
            event.stopPropagation();
            setIsPrimaryLineAnimationActive((current) => !current);
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* animated outlines */}
        {/* MAIN THICK LINES */}
        <group position={[0, 0, config.depth + config.bevelThickness + 0.01]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color={UNIVERSE_TITLE_OUTLINE_GLOW_COLOR}
                thickness={2}
                speed={0.1}
                gapSize={isPrimaryLineAnimationActive ? 0.1 : 0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={UNIVERSE_TITLE_OUTLINE_GLOW_COLOR}
                  thickness={2}
                  speed={0.1}
                  gapSize={isPrimaryLineAnimationActive ? 0.1 : 0}
                />
              ))}
            </group>
          ))}
        </group>
        {/* SECONDARY ALWAYS ON LINES */}
        <group position={[0, 0, config.depth + config.bevelThickness + 0.01]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color={UNIVERSE_TITLE_OUTLINE_SHADOW_COLOR}
                thickness={0.4}
                gapSize={0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={UNIVERSE_TITLE_OUTLINE_SHADOW_COLOR}
                  thickness={0.4}
                  gapSize={0}
                />
              ))}
            </group>
          ))}
        </group>
        {/* REAR LINES */}
        <group position={[0, 0, -1 * (config.bevelThickness + 0.01)]}>
          {shapes.map((shape, shapeIndex) => (
            <group key={shapeIndex}>
              <AnimatedDashLine
                shape={shape}
                color={UNIVERSE_TITLE_OUTLINE_BACK_COLOR}
                thickness={1}
                speed={0.05}
                dashSize={0.3}
                gapSize={0}
              />
              {shape.holes.map((hole, holeIndex) => (
                <AnimatedDashLine
                  key={holeIndex}
                  shape={hole}
                  color={UNIVERSE_TITLE_OUTLINE_BACK_COLOR}
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
