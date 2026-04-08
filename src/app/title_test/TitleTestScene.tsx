"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, useFont } from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  Noise,
  Scanline,
  Vignette,
} from "@react-three/postprocessing";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";
import {
  currentMainTitleFragmentShader,
  currentMainTitleVertexShader,
} from "@/components/3D/titleShaders";

const titleVertexShader = `
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

const titleFragmentShader = `
uniform float uTime;
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

float mountainProfile(float x) {
  float ridge = 0.0;
  ridge += abs(sin(x * 6.28318530718 * 1.35 + 0.45)) * 0.096;
  ridge += abs(sin(x * 6.28318530718 * 3.7 + 1.8)) * 0.034;
  ridge += abs(sin(x * 6.28318530718 * 7.8 + 0.9)) * 0.016;
  return 0.445 + ridge;
}

vec3 noirBandsDark(float skyT, float groundT, float horizonMask) {
  vec3 sky = vec3(0.004, 0.008, 0.03);
  sky = mix(sky, vec3(0.05, 0.16, 0.64), smoothstep(0.14, 0.34, skyT));
  sky = mix(sky, vec3(0.44, 0.58, 0.95), smoothstep(0.34, 0.62, skyT));
  sky = mix(sky, vec3(0.88, 0.92, 0.99), smoothstep(0.72, 0.98, skyT));

  vec3 ground = vec3(0.025, 0.0, 0.04);
  ground = mix(ground, vec3(0.62, 0.0, 0.52), smoothstep(0.04, 0.26, groundT));
  ground = mix(ground, vec3(0.92, 0.38, 0.84), smoothstep(0.26, 0.72, groundT));
  ground = mix(ground, vec3(0.98, 0.88, 0.95), smoothstep(0.82, 1.0, groundT));

  return mix(sky, ground, horizonMask);
}

void main() {
  float across = inverseLerp(uBoundsMinX, uBoundsMaxX, vObjectPosition.x);
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDirection);
  vec3 reflectDir = reflect(-viewDir, normal);
  float reflectAcross = clamp(mix(across, reflectDir.x * 0.5 + 0.5, 0.26), 0.0, 1.0);

  float reflectionT = clamp(0.5 - reflectDir.y * 0.5, 0.0, 1.0);
  float reflectionSweep = clamp(
    reflectionT + reflectDir.x * 0.08 - vObjectNormal.x * 0.05,
    0.0,
    1.0
  );
  float baseHorizon = mountainProfile(across);
  float reflectedHorizon = mountainProfile(reflectAcross);
  float horizon = mix(baseHorizon, reflectedHorizon, 0.18);
  float horizonMask = smoothstep(horizon - 0.012, horizon + 0.012, topDown);
  float skyT = clamp(topDown / max(0.0001, horizon), 0.0, 1.0);
  float groundT = clamp((topDown - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);
  float skyReflectT = clamp(reflectionSweep / max(0.0001, horizon), 0.0, 1.0);
  float groundReflectT = clamp((reflectionSweep - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);

  float frontFace = smoothstep(0.34, 0.92, vObjectNormal.z);
  float bevelMask = 1.0 - frontFace;

  vec3 faceChrome = noirBandsDark(
    mix(skyT, skyReflectT, 0.38),
    mix(groundT, groundReflectT, 0.42),
    horizonMask
  );
  vec3 edgeChrome = noirBandsDark(
    mix(skyT, skyReflectT, 0.72),
    mix(groundT, groundReflectT, 0.74),
    horizonMask
  );

  vec3 color = mix(vec3(0.0, 0.0, 0.012), edgeChrome * 0.28, 0.28);
  color = mix(color, faceChrome, frontFace);

  float directional = max(dot(normal, normalize(vec3(-0.2, 0.44, 0.88))), 0.0);
  color *= mix(0.22, 1.0, pow(directional, 0.98));

  float dividerShadow = exp(-pow((reflectionSweep - horizon) / 0.016, 2.0));
  color *= 1.0 - dividerShadow * 0.5 * frontFace;

  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.5);
  vec3 rimTint = mix(vec3(0.16, 0.42, 0.96), vec3(0.96, 0.42, 0.86), smoothstep(0.52, 0.74, topDown));
  color += rim * rimTint * (0.42 + bevelMask * 0.35);

  float edgeReflection = exp(-pow((reflectionSweep - (horizon + 0.06)) / 0.08, 2.0));
  color += edgeChrome * edgeReflection * bevelMask * 0.18;

  vec3 halfVector = normalize(viewDir + normalize(vec3(-0.45, 0.54, 0.76)));
  float specular = pow(max(dot(normal, halfVector), 0.0), 72.0);
  color += specular * vec3(1.0) * (0.2 + bevelMask * 0.26);

  float upperSheen = exp(-pow((reflectionSweep - 0.16) / 0.045, 2.0));
  float lowerSheen = exp(-pow((reflectionSweep - 0.9) / 0.04, 2.0));
  color += vec3(0.58, 0.74, 1.0) * upperSheen * 0.07 * frontFace;
  color += vec3(1.0, 0.9, 0.96) * lowerSheen * 0.06 * frontFace;

  float scan = 0.5 + 0.5 * sin((reflectionSweep * 90.0 - uTime * 0.12) * 6.28318530718);
  float scanMask = smoothstep(0.62, 1.0, scan);
  color += vec3(0.55, 0.66, 0.96) * scanMask * 0.006 * frontFace;

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

const darkMirrorFragmentShader = `
uniform float uTime;
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

float mountainProfile(float x) {
  float ridge = 0.0;
  ridge += abs(sin(x * 6.28318530718 * 1.18 + 0.6)) * 0.092;
  ridge += abs(sin(x * 6.28318530718 * 3.25 + 1.75)) * 0.032;
  ridge += abs(sin(x * 6.28318530718 * 8.1 + 0.5)) * 0.014;
  return 0.462 + ridge;
}

vec3 noirBands(float skyT, float groundT, float horizonMask) {
  vec3 sky = vec3(0.01, 0.015, 0.05);
  sky = mix(sky, vec3(0.07, 0.23, 0.8), smoothstep(0.14, 0.34, skyT));
  sky = mix(sky, vec3(0.72, 0.83, 1.0), smoothstep(0.34, 0.56, skyT));
  sky = mix(sky, vec3(0.98, 0.99, 1.0), smoothstep(0.72, 0.98, skyT));

  vec3 ground = vec3(0.03, 0.0, 0.05);
  ground = mix(ground, vec3(0.78, 0.0, 0.64), smoothstep(0.05, 0.24, groundT));
  ground = mix(ground, vec3(1.0, 0.58, 0.94), smoothstep(0.24, 0.7, groundT));
  ground = mix(ground, vec3(1.0, 0.94, 0.98), smoothstep(0.84, 1.0, groundT));

  return mix(sky, ground, horizonMask);
}

void main() {
  float across = inverseLerp(uBoundsMinX, uBoundsMaxX, vObjectPosition.x);
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDirection);
  vec3 reflectDir = reflect(-viewDir, normal);
  float reflectAcross = clamp(mix(across, reflectDir.x * 0.5 + 0.5, 0.28), 0.0, 1.0);
  float sweep = clamp(0.5 - reflectDir.y * 0.5 + reflectDir.x * 0.12, 0.0, 1.0);
  float baseHorizon = mountainProfile(across);
  float reflectedHorizon = mountainProfile(reflectAcross);
  float horizon = mix(baseHorizon, reflectedHorizon, 0.2);
  float horizonMask = smoothstep(horizon - 0.01, horizon + 0.01, topDown);
  float skyT = clamp(topDown / max(0.0001, horizon), 0.0, 1.0);
  float groundT = clamp((topDown - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);
  float skyReflectT = clamp(sweep / max(0.0001, horizon), 0.0, 1.0);
  float groundReflectT = clamp((sweep - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);

  float frontFace = smoothstep(0.38, 0.94, vObjectNormal.z);
  float bevelMask = 1.0 - frontFace;

  vec3 face = noirBands(
    mix(skyT, skyReflectT, 0.4),
    mix(groundT, groundReflectT, 0.44),
    horizonMask
  );
  vec3 edge = noirBands(
    mix(skyT, skyReflectT, 0.78),
    mix(groundT, groundReflectT, 0.8),
    horizonMask
  );

  vec3 color = mix(vec3(0.0, 0.0, 0.015), edge * 0.36, 0.35);
  color = mix(color, face, frontFace);

  float directional = max(dot(normal, normalize(vec3(-0.18, 0.44, 0.88))), 0.0);
  color *= mix(0.3, 1.02, pow(directional, 0.95));

  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.2);
  color += rim * mix(vec3(0.18, 0.45, 1.0), vec3(1.0, 0.45, 0.88), smoothstep(0.52, 0.74, topDown)) * (0.5 + bevelMask * 0.45);

  float edgeReflection = exp(-pow((sweep - (horizon + 0.055)) / 0.075, 2.0));
  color += edge * edgeReflection * bevelMask * 0.22;

  vec3 halfVector = normalize(viewDir + normalize(vec3(-0.45, 0.55, 0.75)));
  float specular = pow(max(dot(normal, halfVector), 0.0), 62.0);
  color += specular * vec3(1.0) * (0.32 + bevelMask * 0.38);

  float divider = exp(-pow((sweep - horizon) / 0.014, 2.0));
  color *= 1.0 - divider * 0.42 * frontFace;

  float lowerSpark = exp(-pow((sweep - 0.88) / 0.04, 2.0));
  color += vec3(1.0, 0.9, 0.96) * lowerSpark * 0.1 * frontFace;

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

const neonMirrorFragmentShader = `
uniform float uTime;
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

float mountainProfile(float x) {
  float ridge = 0.0;
  ridge += abs(sin(x * 6.28318530718 * 1.5 + 0.25)) * 0.094;
  ridge += abs(sin(x * 6.28318530718 * 4.0 + 1.9)) * 0.034;
  ridge += abs(sin(x * 6.28318530718 * 8.6 + 0.35)) * 0.016;
  return 0.448 + ridge;
}

vec3 neonBands(float skyT, float groundT, float horizonMask) {
  vec3 sky = vec3(0.01, 0.01, 0.04);
  sky = mix(sky, vec3(0.1, 0.3, 0.95), smoothstep(0.12, 0.32, skyT));
  sky = mix(sky, vec3(0.85, 0.9, 1.0), smoothstep(0.32, 0.58, skyT));
  sky = mix(sky, vec3(1.0), smoothstep(0.72, 0.98, skyT));

  vec3 ground = vec3(0.03, 0.0, 0.05);
  ground = mix(ground, vec3(0.98, 0.0, 0.88), smoothstep(0.05, 0.28, groundT));
  ground = mix(ground, vec3(1.0, 0.56, 0.96), smoothstep(0.28, 0.76, groundT));
  ground = mix(ground, vec3(1.0, 0.96, 0.99), smoothstep(0.86, 1.0, groundT));

  return mix(sky, ground, horizonMask);
}

void main() {
  float across = inverseLerp(uBoundsMinX, uBoundsMaxX, vObjectPosition.x);
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDirection);
  vec3 reflectDir = reflect(-viewDir, normal);
  float reflectAcross = clamp(mix(across, reflectDir.x * 0.5 + 0.5, 0.3), 0.0, 1.0);
  float sweep = clamp(0.5 - reflectDir.y * 0.5 + reflectDir.x * 0.15, 0.0, 1.0);
  float baseHorizon = mountainProfile(across);
  float reflectedHorizon = mountainProfile(reflectAcross);
  float horizon = mix(baseHorizon, reflectedHorizon, 0.22);
  float horizonMask = smoothstep(horizon - 0.012, horizon + 0.012, topDown);
  float skyT = clamp(topDown / max(0.0001, horizon), 0.0, 1.0);
  float groundT = clamp((topDown - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);
  float skyReflectT = clamp(sweep / max(0.0001, horizon), 0.0, 1.0);
  float groundReflectT = clamp((sweep - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);

  float frontFace = smoothstep(0.34, 0.9, vObjectNormal.z);
  float bevelMask = 1.0 - frontFace;

  vec3 face = neonBands(
    mix(skyT, skyReflectT, 0.42),
    mix(groundT, groundReflectT, 0.46),
    horizonMask
  );
  vec3 edge = neonBands(
    mix(skyT, skyReflectT, 0.8),
    mix(groundT, groundReflectT, 0.82),
    horizonMask
  );

  vec3 color = mix(vec3(0.0, 0.0, 0.02), edge * 0.32, 0.3);
  color = mix(color, face, frontFace);

  float directional = max(dot(normal, normalize(vec3(-0.18, 0.46, 0.88))), 0.0);
  color *= mix(0.28, 1.06, pow(directional, 0.9));

  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.8);
  color += rim * mix(vec3(0.26, 0.66, 1.0), vec3(1.0, 0.36, 0.9), smoothstep(0.52, 0.74, topDown)) * (0.42 + bevelMask * 0.45);

  float edgeReflection = exp(-pow((sweep - (horizon + 0.06)) / 0.08, 2.0));
  color += edge * edgeReflection * bevelMask * 0.2;

  vec3 halfVector = normalize(viewDir + normalize(vec3(-0.28, 0.56, 0.78)));
  float sparkle = pow(max(dot(normal, halfVector), 0.0), 56.0);
  color += vec3(1.0) * sparkle * (0.22 + bevelMask * 0.2);

  float divider = exp(-pow((sweep - horizon) / 0.015, 2.0));
  color *= 1.0 - divider * 0.34 * frontFace;

  float stripes = 0.5 + 0.5 * sin((sweep * 88.0 - uTime * 0.22) * 6.28318530718);
  float stripeMask = smoothstep(0.55, 1.0, stripes);
  color += mix(vec3(0.25, 0.74, 1.0), vec3(1.0, 0.46, 0.9), smoothstep(0.52, 0.72, sweep)) * stripeMask * 0.012 * frontFace;

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

type VariantConfig = {
  id: number;
  name: string;
  position: [number, number, number];
  shaderKind: "mirror_dark" | "mirror" | "mirror_neon" | "main";
};

const TITLE_VARIANTS: VariantConfig[] = [
  {
    id: 1,
    name: "Noir Mirror Dark",
    position: [-6.4, 2.8, 0],
    shaderKind: "mirror_dark",
  },
  {
    id: 2,
    name: "Noir Mirror",
    position: [6.4, 2.8, 0],
    shaderKind: "mirror",
  },
  {
    id: 3,
    name: "Neon Mirror",
    position: [-6.4, -3.2, 0],
    shaderKind: "mirror_neon",
  },
  {
    id: 4,
    name: "Main Title",
    position: [6.4, -3.2, 0],
    shaderKind: "main",
  },
];

type PointerState = {
  mousePos: MutableRefObject<THREE.Vector2>;
  mouseVel: MutableRefObject<THREE.Vector2>;
  targetMouse: MutableRefObject<THREE.Vector2>;
};

function ShaderTitleVariant({
  variant,
  pointerState,
}: {
  variant: VariantConfig;
  pointerState: PointerState;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const chromeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const font = useFont("/AAReg.json");
  const { size } = useThree();
  const text = "SHANE";
  const config = useMemo(
    () => ({
      font,
      size: 1.65,
      depth: 0.88,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.028,
      bevelOffset: 0,
      bevelSegments: 6,
    }),
    [font],
  );

  const { geometry, boundsMinX, boundsMaxX, boundsMinY, boundsMaxY } =
    useMemo(() => {
    const textGeometry = new TextGeometry(text, config);
    textGeometry.computeBoundingBox();
    const bounds = textGeometry.boundingBox ?? new THREE.Box3();
    return {
      geometry: textGeometry,
      boundsMinX: bounds.min.x,
      boundsMaxX: bounds.max.x,
      boundsMinY: bounds.min.y,
      boundsMaxY: bounds.max.y,
    };
    }, [config, text]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoundsMinX: { value: boundsMinX },
      uBoundsMaxX: { value: boundsMaxX },
      uBoundsMinY: { value: boundsMinY },
      uBoundsMaxY: { value: boundsMaxY },
    }),
    [boundsMaxX, boundsMaxY, boundsMinX, boundsMinY],
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const material = chromeMaterialRef.current;
    if (group) {
      group.rotation.x = -pointerState.mousePos.current.y * 0.36;
      group.rotation.y = pointerState.mousePos.current.x * 0.32;
      group.rotation.z = pointerState.mousePos.current.x * 0.125;
      group.scale.setScalar(size.width < 900 ? 0.78 : 1);
    }
    if (!material) return;
    material.uniforms.uTime.value = clock.getElapsedTime();
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <group ref={groupRef} position={variant.position}>
      <Center>
        <mesh geometry={geometry}>
          <shaderMaterial
            ref={chromeMaterialRef}
            uniforms={uniforms}
            vertexShader={
              variant.shaderKind === "main"
                ? currentMainTitleVertexShader
                : titleVertexShader
            }
            fragmentShader={
              variant.shaderKind === "main"
                ? currentMainTitleFragmentShader
                : variant.shaderKind === "mirror_dark"
                  ? titleFragmentShader
                  : variant.shaderKind === "mirror"
                    ? darkMirrorFragmentShader
                    : neonMirrorFragmentShader
            }
            toneMapped={false}
          />
        </mesh>
      </Center>
    </group>
  );
}

function SceneContents() {
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouseVel = useRef(new THREE.Vector2(0, 0));
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const pointerState = { mousePos, mouseVel, targetMouse };

  useFrame(({ pointer }, delta) => {
    targetMouse.current.set(pointer.x, pointer.y);

    const follow = 95;
    const friction = 7.5;
    const dx = targetMouse.current.x - mousePos.current.x;
    const dy = targetMouse.current.y - mousePos.current.y;

    mouseVel.current.x += dx * Math.abs(dx) * follow * delta;
    mouseVel.current.y += dy * Math.abs(dy) * follow * delta;
    mouseVel.current.multiplyScalar(Math.exp(-friction * delta));
    mousePos.current.addScaledVector(mouseVel.current, delta);
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      {TITLE_VARIANTS.map((variant) => (
        <ShaderTitleVariant
          key={variant.id}
          variant={variant}
          pointerState={pointerState}
        />
      ))}
      <EffectComposer>
        {/* <Bloom
          luminanceThreshold={0}
          intensity={1.2}
          levels={7}
          mipmapBlur
          opacity={0.9}
        /> */}

        <Bloom
          luminanceThreshold={0}
          intensity={1}
          levels={1}
          mipmapBlur
          opacity={0.9}
        />
        <Noise opacity={0.01} />
        <Vignette
          offset={0.1}
          darkness={0.6}
          blendFunction={BlendFunction.DARKEN}
        />
        <BrightnessContrast brightness={0} contrast={0} />
        <Scanline density={1} opacity={0.1} scrollSpeed={0.01} />
      </EffectComposer>
    </>
  );
}

export function TitleTestScene() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 20], zoom: 54 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <SceneContents />
    </Canvas>
  );
}

export { TITLE_VARIANTS };
