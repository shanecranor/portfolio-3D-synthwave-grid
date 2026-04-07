"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import type { Line2, LineMaterial } from "three-stdlib";
import { Line, Center, useFont } from "@react-three/drei";
import {
  DEFAULT_UNIVERSE_TITLE_SCALE,
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  getUniverseTitleAnchorX,
  getUniverseTitleScale,
} from "@/components/3D/universeLayout";

const UNIVERSE_TITLE_OUTLINE_GLOW_COLOR = [88, 94, 195].map((c) => c / 100);
const UNIVERSE_TITLE_OUTLINE_SHADOW_COLOR = [0.1, 0.1, 0.1] as const;
const UNIVERSE_TITLE_OUTLINE_BACK_COLOR = [88, 94, 195].map((c) => c / 100);
const TITLE_HITBOX_PADDING_X = 0.8;
const TITLE_HITBOX_PADDING_Y = 0.8;
const TITLE_HITBOX_PADDING_Z = 0.8;

const synthwaveChromeVertexShader = `
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vObjectPosition = position;
  vObjectNormal = normalize(normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const synthwaveChromeFragmentShader = `
uniform float uTime;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

vec3 gradientFromTop(float t) {
  vec3 deepBlue = vec3(0.03, 0.1, 0.38);
  vec3 electricBlue = vec3(0.16, 0.39, 1.0);
  vec3 paleBlue = vec3(0.58, 0.72, 1.0);
  vec3 skyWhite = vec3(0.99, 0.98, 1.0);
  vec3 divider = vec3(0.07, 0.0, 0.09);
  vec3 magenta = vec3(0.98, 0.02, 0.9);
  vec3 pink = vec3(1.0, 0.42, 0.95);
  vec3 lowerWhite = vec3(1.0, 0.96, 0.99);

  vec3 color = deepBlue;
  color = mix(color, electricBlue, smoothstep(0.05, 0.18, t));
  color = mix(color, paleBlue, smoothstep(0.18, 0.34, t));
  color = mix(color, skyWhite, smoothstep(0.34, 0.47, t));
  color = mix(color, divider, smoothstep(0.495, 0.515, t));
  color = mix(color, magenta, smoothstep(0.515, 0.68, t));
  color = mix(color, pink, smoothstep(0.68, 0.82, t));
  color = mix(color, lowerWhite, smoothstep(0.82, 0.94, t));
  return color;
}

void main() {
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDirection);
  vec3 reflectDir = reflect(-viewDir, normal);

  float reflectionT = clamp(0.5 - reflectDir.y * 0.5, 0.0, 1.0);
  float reflectionSweep = clamp(
    reflectionT + reflectDir.x * 0.08 - vObjectNormal.x * 0.05,
    0.0,
    1.0
  );

  float frontFace = smoothstep(0.34, 0.92, vObjectNormal.z);
  float bevelMask = 1.0 - frontFace;

  vec3 faceChrome = gradientFromTop(mix(topDown, reflectionSweep, 0.38));
  vec3 edgeChrome = gradientFromTop(mix(topDown, reflectionSweep, 0.82));

  vec3 deepShadow = vec3(0.025, 0.005, 0.04);
  vec3 color = mix(deepShadow, edgeChrome * 0.5, 0.45);
  color = mix(color, faceChrome, frontFace);

  float directional = max(dot(normal, normalize(vec3(-0.22, 0.4, 0.88))), 0.0);
  color *= mix(0.56, 1.04, pow(directional, 0.85));

  float centerShadow = smoothstep(0.0, 0.12, topDown) * (1.0 - smoothstep(0.88, 1.0, topDown));
  color *= mix(0.92, 1.0, centerShadow);

  float dividerShadow = exp(-pow((reflectionSweep - 0.51) / 0.04, 2.0));
  color *= 1.0 - dividerShadow * 0.18 * frontFace;

  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.5);
  color += rim * mix(vec3(0.3, 0.55, 1.0), vec3(1.0, 0.7, 0.95), smoothstep(0.5, 0.78, topDown)) * (0.26 + 0.36 * bevelMask);

  vec3 halfVector = normalize(viewDir + normalize(vec3(-0.4, 0.52, 0.82)));
  float specular = pow(max(dot(normal, halfVector), 0.0), 48.0);
  color += specular * vec3(1.0, 0.98, 1.0) * (0.3 + bevelMask * 0.24);

  float upperSheen = exp(-pow((reflectionSweep - 0.15) / 0.06, 2.0));
  float lowerSheen = exp(-pow((reflectionSweep - 0.9) / 0.07, 2.0));
  color += vec3(0.66, 0.8, 1.0) * upperSheen * 0.12 * frontFace;
  color += vec3(1.0, 0.94, 0.98) * lowerSheen * 0.1 * frontFace;

  float horizonLine = exp(-pow((reflectionSweep - 0.505) / 0.018, 2.0));
  color += horizonLine * vec3(1.0) * 0.08 * frontFace;

  float scan = 0.5 + 0.5 * sin((reflectionSweep * 96.0 - uTime * 0.2) * 6.28318530718);
  float scanMask = smoothstep(0.45, 1.0, scan);
  vec3 scanTint = mix(vec3(0.58, 0.7, 1.0), vec3(1.0, 0.72, 0.96), smoothstep(0.52, 0.72, reflectionSweep));
  color += scanTint * scanMask * 0.014 * frontFace;

  color = max(color, vec3(0.0));

  gl_FragColor = vec4(color, 1.0);
}
`;

const AnimatedDashLine = ({
  shape,
  color,
  thickness,
  speed = 1,
  dashSize = 0.25,
  gapSize = 0.1,
}) => {
  const lineRef = useRef<Line2 | null>(null);
  const isDashed = gapSize > 0 && dashSize > 0;
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
    if (!isDashed) return;

    const material = lineRef.current?.material as LineMaterial | undefined;
    if (!material) return;

    // move the dash offset continuously to animate
    material.dashOffset -= delta * speed * 10;
  });

  if (!isDashed) {
    return (
      <Line
        ref={lineRef}
        points={linePoints}
        color={color}
        lineWidth={thickness}
      />
    );
  }

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
  const chromeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
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
  const {
    textGeometry,
    hitboxGeometry,
    hitboxPosition,
    boundsMinY,
    boundsMaxY,
  } = useMemo(() => {
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
      boundsMinY: bounds.min.y,
      boundsMaxY: bounds.max.y,
    };
  }, [config, text]);
  const chromeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoundsMinY: { value: boundsMinY },
      uBoundsMaxY: { value: boundsMaxY },
    }),
    [boundsMaxY, boundsMinY],
  );

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
    const chromeMaterial = chromeMaterialRef.current;
    if (chromeMaterial) {
      chromeMaterial.uniforms.uTime.value = t;
    }
  });

  useEffect(() => {
    return () => {
      textGeometry.dispose();
      hitboxGeometry.dispose();
    };
  }, [hitboxGeometry, textGeometry]);

  return (
    <group ref={rootRef}>
      <Center ref={centerRef}>
        <mesh geometry={textGeometry}>
          <shaderMaterial
            ref={chromeMaterialRef}
            uniforms={chromeUniforms}
            vertexShader={synthwaveChromeVertexShader}
            fragmentShader={synthwaveChromeFragmentShader}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={hitboxGeometry} position={hitboxPosition}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {false && (
          <>
            {/* animated outlines */}
            {/* MAIN THICK LINES */}
            <group
              position={[0, 0, config.depth + config.bevelThickness + 0.01]}
            >
              {shapes.map((shape, shapeIndex) => (
                <group key={shapeIndex}>
                  <AnimatedDashLine
                    shape={shape}
                    color={UNIVERSE_TITLE_OUTLINE_GLOW_COLOR}
                    thickness={2}
                    speed={0.1}
                    gapSize={0}
                  />
                  {shape.holes.map((hole, holeIndex) => (
                    <AnimatedDashLine
                      key={holeIndex}
                      shape={hole}
                      color={UNIVERSE_TITLE_OUTLINE_GLOW_COLOR}
                      thickness={2}
                      speed={0.1}
                      gapSize={0}
                    />
                  ))}
                </group>
              ))}
            </group>
            {/* SECONDARY ALWAYS ON LINES */}
            <group
              position={[0, 0, config.depth + config.bevelThickness + 0.01]}
            >
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
          </>
        )}
      </Center>
    </group>
  );
};
