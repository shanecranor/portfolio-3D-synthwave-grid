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
import * as THREE from "three";
import { BlendFunction } from "postprocessing";
import { TextGeometry } from "three/examples/jsm/Addons.js";

type PointerState = {
  mousePos: MutableRefObject<THREE.Vector2>;
  mouseVel: MutableRefObject<THREE.Vector2>;
  targetMouse: MutableRefObject<THREE.Vector2>;
};

export type VariantPreset = {
  skyDeep: THREE.ColorRepresentation;
  skyMid: THREE.ColorRepresentation;
  skyLight: THREE.ColorRepresentation;
  groundHot: THREE.ColorRepresentation;
  groundMid: THREE.ColorRepresentation;
  groundLight: THREE.ColorRepresentation;
  divider: THREE.ColorRepresentation;
  shadowTint: THREE.ColorRepresentation;
  highlightTint: THREE.ColorRepresentation;
  splitBase: number;
  mountainAmp1: number;
  mountainAmp2: number;
  mountainFreq1: number;
  mountainFreq2: number;
  mountainPhase1: number;
  mountainPhase2: number;
  reflectionMix: number;
  sheenStrength: number;
  scanStrength: number;
  edgeSoftness: number;
  pointerInfluence: number;
  dividerWidth: number;
  dividerStrength: number;
  bandCurve: number;
  dividerEnabled: boolean;
  sheenEnabled: boolean;
  scanEnabled: boolean;
};

export type VariantConfig = {
  id: number;
  name: string;
  preset: VariantPreset;
};

const TITLE_TEXT = "SHANE CRANOR";

const titleVertexShader = `
varying vec3 vObjectPosition;

void main() {
  vObjectPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const titleFragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;

uniform vec3 uSkyDeep;
uniform vec3 uSkyMid;
uniform vec3 uSkyLight;
uniform vec3 uGroundHot;
uniform vec3 uGroundMid;
uniform vec3 uGroundLight;
uniform vec3 uDivider;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;

uniform float uSplitBase;
uniform float uMountainAmp1;
uniform float uMountainAmp2;
uniform float uMountainFreq1;
uniform float uMountainFreq2;
uniform float uMountainPhase1;
uniform float uMountainPhase2;
uniform float uReflectionMix;
uniform float uSheenStrength;
uniform float uScanStrength;
uniform float uEdgeSoftness;
uniform float uPointerInfluence;
uniform float uDividerWidth;
uniform float uDividerStrength;
uniform float uBandCurve;
uniform float uDividerEnabled;
uniform float uSheenEnabled;
uniform float uScanEnabled;

varying vec3 vObjectPosition;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

float mountainProfile(float x) {
  float ridge = 0.0;
  ridge += abs(sin(x * 6.28318530718 * uMountainFreq1 + uMountainPhase1)) * uMountainAmp1;
  ridge += abs(sin(x * 6.28318530718 * uMountainFreq2 + uMountainPhase2)) * uMountainAmp2;
  ridge += abs(sin(x * 6.28318530718 * (uMountainFreq2 * 2.2) + uMountainPhase1 * 0.7)) * (uMountainAmp2 * 0.48);
  return clamp(uSplitBase + ridge, 0.18, 0.82);
}

vec3 skyBands(float t) {
  t = pow(clamp(t, 0.0, 1.0), uBandCurve);
  vec3 color = uSkyDeep;
  color = mix(color, uSkyMid, smoothstep(0.14, 0.44, t));
  color = mix(color, uSkyLight, smoothstep(0.62, 0.96, t));
  return color;
}

vec3 groundBands(float t) {
  t = pow(clamp(t, 0.0, 1.0), uBandCurve);
  vec3 color = uDivider * 0.45;
  color = mix(color, uGroundHot, smoothstep(0.02, 0.26, t));
  color = mix(color, uGroundMid, smoothstep(0.24, 0.7, t));
  color = mix(color, uGroundLight, smoothstep(0.82, 1.0, t));
  return color;
}

void main() {
  float across = inverseLerp(uBoundsMinX, uBoundsMaxX, vObjectPosition.x);
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);

  float pointerAcross = clamp(across + uMouse.x * (0.06 * uPointerInfluence), 0.0, 1.0);
  float horizon = mountainProfile(pointerAcross);
  float horizonMask = smoothstep(horizon - uDividerWidth, horizon + uDividerWidth, topDown);

  float sweep = clamp(
    topDown
      + uMouse.y * (0.16 * uPointerInfluence)
      + (across - 0.5) * uMouse.x * (0.18 * uPointerInfluence)
      + sin(across * 6.28318530718 * 1.3 + uTime * 0.08) * 0.014,
    0.0,
    1.0
  );

  float skyStatic = clamp(topDown / max(0.0001, horizon), 0.0, 1.0);
  float groundStatic = clamp((topDown - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);
  float skyReflect = clamp(sweep / max(0.0001, horizon), 0.0, 1.0);
  float groundReflect = clamp((sweep - horizon) / max(0.0001, 1.0 - horizon), 0.0, 1.0);

  float skyT = mix(skyStatic, skyReflect, uReflectionMix);
  float groundT = mix(groundStatic, groundReflect, uReflectionMix);

  vec3 color = mix(skyBands(skyT), groundBands(groundT), horizonMask);

  float dividerGlow = exp(-pow((topDown - horizon) / max(0.003, uDividerWidth * 1.5), 2.0));
  color = mix(color, uDivider, dividerGlow * uDividerStrength * uDividerEnabled);

  float upperSheen = exp(-pow((sweep - (horizon * 0.45)) / 0.075, 2.0));
  float lowerSheen = exp(-pow((sweep - (horizon + (1.0 - horizon) * 0.72)) / 0.06, 2.0));
  float centerFlash = exp(-pow((sweep - (horizon - 0.015)) / 0.03, 2.0));
  color += uHighlightTint * upperSheen * (0.14 * uSheenStrength * uSheenEnabled);
  color += mix(vec3(1.0), uGroundLight, 0.5) * lowerSheen * (0.12 * uSheenStrength * uSheenEnabled);
  color += mix(vec3(1.0), uHighlightTint, 0.4) * centerFlash * (0.09 * uSheenStrength * uSheenEnabled);

  float edgeDistance = min(min(across, 1.0 - across), min(topDown, 1.0 - topDown));
  float edgeMask = smoothstep(0.0, uEdgeSoftness, edgeDistance);
  color = mix(uShadowTint, color, edgeMask);

  float scan = 0.5 + 0.5 * sin((topDown * 86.0 - uTime * 0.16) * 6.28318530718);
  float scanMask = smoothstep(0.64, 1.0, scan);
  color += mix(uHighlightTint, vec3(1.0), 0.45) * scanMask * (0.015 * uScanStrength * uScanEnabled);

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

const shadowFragmentShader = `
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;
uniform vec2 uMouse;

varying vec3 vObjectPosition;

float inverseLerp(float a, float b, float value) {
  return clamp((value - a) / (b - a), 0.0, 1.0);
}

float gridLine(float value, float density, float width) {
  float cell = fract(value * density);
  float edgeDistance = min(cell, 1.0 - cell);
  return 1.0 - smoothstep(0.0, width, edgeDistance);
}

void main() {
  float across = inverseLerp(uBoundsMinX, uBoundsMaxX, vObjectPosition.x);
  float topDown = inverseLerp(uBoundsMaxY, uBoundsMinY, vObjectPosition.y);

  float shiftedAcross = across + uMouse.x * 0.04;
  float shiftedDown = topDown - uMouse.y * 0.04;

  float verticalLines = gridLine(shiftedAcross, 19.0, 0.024);
  float horizontalLines = gridLine(shiftedDown, 12.0, 0.024);
  float grid = max(verticalLines, horizontalLines);

  float fade = smoothstep(0.0, 0.16, min(min(across, 1.0 - across), min(topDown, 1.0 - topDown)));
  float alpha = grid * 0.22 * fade;

  gl_FragColor = vec4(vec3(1.0), alpha);
}
`;

export const TITLE_TEST_2D_VARIANTS: VariantConfig[] = [
  {
    id: 1,
    name: "Noir Poster",
    preset: {
      skyDeep: "#050a2f",
      skyMid: "#2b54d8",
      skyLight: "#ecf4ff",
      groundHot: "#7a0058",
      groundMid: "#ff38d6",
      groundLight: "#fff0fb",
      divider: "#ffffff",
      shadowTint: "#130019",
      highlightTint: "#8cb6ff",
      splitBase: 0.42,
      mountainAmp1: 0.068,
      mountainAmp2: 0.026,
      mountainFreq1: 1.25,
      mountainFreq2: 3.9,
      mountainPhase1: 0.5,
      mountainPhase2: 1.8,
      reflectionMix: 0.34,
      sheenStrength: 1,
      scanStrength: 0.9,
      edgeSoftness: 0.085,
      pointerInfluence: 0.55,
      dividerWidth: 0.018,
      dividerStrength: 0.72,
      bandCurve: 1.34,
      dividerEnabled: true,
      sheenEnabled: true,
      scanEnabled: true,
    },
  },
  {
    id: 2,
    name: "Hard Poster",
    preset: {
      skyDeep: "#09194d",
      skyMid: "#2c76ff",
      skyLight: "#ffffff",
      groundHot: "#28001d",
      groundMid: "#ff00bf",
      groundLight: "#ffffff",
      divider: "#ffffff",
      shadowTint: "#120013",
      highlightTint: "#d5e9ff",
      splitBase: 0.48,
      mountainAmp1: 0.035,
      mountainAmp2: 0.012,
      mountainFreq1: 0.82,
      mountainFreq2: 2.3,
      mountainPhase1: 0.14,
      mountainPhase2: 1.12,
      reflectionMix: 0.22,
      sheenStrength: 1.34,
      scanStrength: 0.45,
      edgeSoftness: 0.06,
      pointerInfluence: 0.42,
      dividerWidth: 0.008,
      dividerStrength: 1.0,
      bandCurve: 0.72,
      dividerEnabled: true,
      sheenEnabled: true,
      scanEnabled: true,
    },
  },
  {
    id: 3,
    name: "Neon Melt",
    preset: {
      skyDeep: "#17053b",
      skyMid: "#7d5dff",
      skyLight: "#ffe7ff",
      groundHot: "#830060",
      groundMid: "#ff19cf",
      groundLight: "#ffd2fb",
      divider: "#ffdfff",
      shadowTint: "#210019",
      highlightTint: "#ffb5eb",
      splitBase: 0.36,
      mountainAmp1: 0.096,
      mountainAmp2: 0.04,
      mountainFreq1: 1.65,
      mountainFreq2: 5.1,
      mountainPhase1: 0.48,
      mountainPhase2: 2.4,
      reflectionMix: 0.62,
      sheenStrength: 1.58,
      scanStrength: 1.55,
      edgeSoftness: 0.11,
      pointerInfluence: 0.9,
      dividerWidth: 0.024,
      dividerStrength: 0.58,
      bandCurve: 1.12,
      dividerEnabled: true,
      sheenEnabled: true,
      scanEnabled: true,
    },
  },
  {
    id: 4,
    name: "Ice Chrome",
    preset: {
      skyDeep: "#04142b",
      skyMid: "#2d8fff",
      skyLight: "#ffffff",
      groundHot: "#350032",
      groundMid: "#ff59e3",
      groundLight: "#ffffff",
      divider: "#ffffff",
      shadowTint: "#110316",
      highlightTint: "#dff6ff",
      splitBase: 0.455,
      mountainAmp1: 0.05,
      mountainAmp2: 0.019,
      mountainFreq1: 0.96,
      mountainFreq2: 2.8,
      mountainPhase1: 0.7,
      mountainPhase2: 1.4,
      reflectionMix: 0.54,
      sheenStrength: 1.18,
      scanStrength: 0.72,
      edgeSoftness: 0.07,
      pointerInfluence: 1.05,
      dividerWidth: 0.012,
      dividerStrength: 0.92,
      bandCurve: 0.86,
      dividerEnabled: true,
      sheenEnabled: true,
      scanEnabled: true,
    },
  },
];

function createUniformColor(value: THREE.ColorRepresentation) {
  return new THREE.Color(value);
}

function FlatTitleVariant({
  variant,
  pointerState,
  position,
  maxWidth,
}: {
  variant: VariantConfig;
  pointerState: PointerState;
  position: [number, number, number];
  maxWidth: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const mainRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Group>(null);
  const titleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shadowMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const font = useFont("/AAReg.json");
  const { size } = useThree();

  const config = useMemo(
    () => ({
      font,
      size: 0.9,
      depth: 0.01,
      curveSegments: 22,
      bevelEnabled: false,
    }),
    [font],
  );

  const {
    geometry,
    edgesGeometry,
    boundsMinX,
    boundsMaxX,
    boundsMinY,
    boundsMaxY,
    width,
  } = useMemo(() => {
    const nextGeometry = new TextGeometry(TITLE_TEXT, config);
    nextGeometry.computeBoundingBox();
    const bounds = nextGeometry.boundingBox ?? new THREE.Box3();
    const nextEdges = new THREE.EdgesGeometry(nextGeometry);

    return {
      geometry: nextGeometry,
      edgesGeometry: nextEdges,
      boundsMinX: bounds.min.x,
      boundsMaxX: bounds.max.x,
      boundsMinY: bounds.min.y,
      boundsMaxY: bounds.max.y,
      width: bounds.max.x - bounds.min.x,
    };
  }, [config]);

  const fitScale = useMemo(() => {
    const availableWidth = maxWidth * 0.82;
    return Math.min(availableWidth / Math.max(width, 0.001), size.width < 900 ? 0.92 : 1);
  }, [maxWidth, size.width, width]);

  const titleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uBoundsMinX: { value: boundsMinX },
      uBoundsMaxX: { value: boundsMaxX },
      uBoundsMinY: { value: boundsMinY },
      uBoundsMaxY: { value: boundsMaxY },
      uSkyDeep: { value: createUniformColor(variant.preset.skyDeep) },
      uSkyMid: { value: createUniformColor(variant.preset.skyMid) },
      uSkyLight: { value: createUniformColor(variant.preset.skyLight) },
      uGroundHot: { value: createUniformColor(variant.preset.groundHot) },
      uGroundMid: { value: createUniformColor(variant.preset.groundMid) },
      uGroundLight: { value: createUniformColor(variant.preset.groundLight) },
      uDivider: { value: createUniformColor(variant.preset.divider) },
      uShadowTint: { value: createUniformColor(variant.preset.shadowTint) },
      uHighlightTint: { value: createUniformColor(variant.preset.highlightTint) },
      uSplitBase: { value: variant.preset.splitBase },
      uMountainAmp1: { value: variant.preset.mountainAmp1 },
      uMountainAmp2: { value: variant.preset.mountainAmp2 },
      uMountainFreq1: { value: variant.preset.mountainFreq1 },
      uMountainFreq2: { value: variant.preset.mountainFreq2 },
      uMountainPhase1: { value: variant.preset.mountainPhase1 },
      uMountainPhase2: { value: variant.preset.mountainPhase2 },
      uReflectionMix: { value: variant.preset.reflectionMix },
      uSheenStrength: { value: variant.preset.sheenStrength },
      uScanStrength: { value: variant.preset.scanStrength },
      uEdgeSoftness: { value: variant.preset.edgeSoftness },
      uPointerInfluence: { value: variant.preset.pointerInfluence },
      uDividerWidth: { value: variant.preset.dividerWidth },
      uDividerStrength: { value: variant.preset.dividerStrength },
      uBandCurve: { value: variant.preset.bandCurve },
      uDividerEnabled: { value: variant.preset.dividerEnabled ? 1 : 0 },
      uSheenEnabled: { value: variant.preset.sheenEnabled ? 1 : 0 },
      uScanEnabled: { value: variant.preset.scanEnabled ? 1 : 0 },
    }),
    [
      boundsMaxX,
      boundsMaxY,
      boundsMinX,
      boundsMinY,
      variant.preset,
    ],
  );

  const shadowUniforms = useMemo(
    () => ({
      uMouse: { value: new THREE.Vector2(0, 0) },
      uBoundsMinX: { value: boundsMinX },
      uBoundsMaxX: { value: boundsMaxX },
      uBoundsMinY: { value: boundsMinY },
      uBoundsMaxY: { value: boundsMaxY },
    }),
    [boundsMaxX, boundsMaxY, boundsMinX, boundsMinY],
  );

  useFrame(({ clock }) => {
    const main = mainRef.current;
    const shadow = shadowRef.current;
    const titleMaterial = titleMaterialRef.current;
    const shadowMaterial = shadowMaterialRef.current;
    const mouse = pointerState.mousePos.current;

    if (main) {
      main.position.x = mouse.x * 0.18;
      main.position.y = mouse.y * 0.1;
      main.scale.setScalar(fitScale);
    }

    if (shadow) {
      shadow.position.x = -mouse.x * 0.09;
      shadow.position.y = -mouse.y * 0.05;
      shadow.scale.setScalar(fitScale * 1.035);
    }

    if (titleMaterial) {
      titleMaterial.uniforms.uTime.value = clock.getElapsedTime();
      titleMaterial.uniforms.uMouse.value.copy(mouse);
    }

    if (shadowMaterial) {
      shadowMaterial.uniforms.uMouse.value.copy(mouse);
    }
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      edgesGeometry.dispose();
    };
  }, [edgesGeometry, geometry]);

  return (
    <group ref={rootRef} position={position}>
      <group ref={shadowRef} position={[0, 0, -0.04]}>
        <Center>
          <mesh geometry={geometry} renderOrder={1}>
            <shaderMaterial
              ref={shadowMaterialRef}
              uniforms={shadowUniforms}
              vertexShader={titleVertexShader}
              fragmentShader={shadowFragmentShader}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <lineSegments geometry={edgesGeometry} renderOrder={2}>
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </lineSegments>
        </Center>
      </group>

      <group ref={mainRef} position={[0, 0, 0.02]}>
        <Center>
          <mesh geometry={geometry} renderOrder={3}>
            <shaderMaterial
              ref={titleMaterialRef}
              uniforms={titleUniforms}
              vertexShader={titleVertexShader}
              fragmentShader={titleFragmentShader}
              toneMapped={false}
            />
          </mesh>
          <lineSegments geometry={edgesGeometry} renderOrder={4}>
            <lineBasicMaterial
              color={variant.preset.divider}
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </lineSegments>
        </Center>
      </group>
    </group>
  );
}

function SceneContents({ activeVariant }: { activeVariant: VariantConfig }) {
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouseVel = useRef(new THREE.Vector2(0, 0));
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const pointerState = { mousePos, mouseVel, targetMouse };
  const { viewport } = useThree();

  useFrame(({ pointer }, delta) => {
    targetMouse.current.set(pointer.x, pointer.y);

    const follow = 64;
    const friction = 8;
    const dx = targetMouse.current.x - mousePos.current.x;
    const dy = targetMouse.current.y - mousePos.current.y;

    mouseVel.current.x += dx * follow * delta;
    mouseVel.current.y += dy * follow * delta;
    mouseVel.current.multiplyScalar(Math.exp(-friction * delta));
    mousePos.current.addScaledVector(mouseVel.current, delta);
  });

  return (
    <>
      <FlatTitleVariant
        key={activeVariant.id}
        variant={activeVariant}
        pointerState={pointerState}
        position={[0, 0, 0]}
        maxWidth={viewport.width}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0}
          intensity={1.08}
          levels={6}
          mipmapBlur
          opacity={0.88}
        />
        <Noise opacity={0.01} />
        <Vignette
          offset={0.1}
          darkness={0.62}
          blendFunction={BlendFunction.DARKEN}
        />
        <BrightnessContrast brightness={0.01} contrast={0.08} />
        <Scanline density={1} opacity={0.08} scrollSpeed={0.01} />
      </EffectComposer>
    </>
  );
}

export function TitleTest2DScene({
  activeVariant,
}: {
  activeVariant: VariantConfig;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 28, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#030611"]} />
      <SceneContents activeVariant={activeVariant} />
    </Canvas>
  );
}
