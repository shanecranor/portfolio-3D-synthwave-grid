"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Stars, useFont } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/Addons.js";
import { BlendFunction, Effect } from "postprocessing";
import { CameraRig, VIEWS } from "@/components/3D/CameraRig";
import { GlowSphere } from "@/components/3D/GlowSphere";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { UniverseSkyDome } from "@/components/3D/UniverseSkyDome";
import {
  DEFAULT_UNIVERSE_ANCHOR_Y,
  DEFAULT_UNIVERSE_ANCHOR_Z,
  DEFAULT_UNIVERSE_TITLE_SCALE,
  getUniverseTitleAnchorX,
  getUniverseTitleScale,
} from "@/components/3D/universeLayout";

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
  edgeSoftness: number;
  pointerInfluence: number;
  dividerWidth: number;
  dividerStrength: number;
  bandCurve: number;
  dividerEnabled: boolean;
  sheenEnabled: boolean;
  edgeSoftnessEnabled: boolean;
  edgeSoftnessOffset: number;
  rearGridEnabled: boolean;
  rearGridColor: THREE.ColorRepresentation;
  rearGridDensityX: number;
  rearGridDensityY: number;
  rearGridWidth: number;
  rearGridAlpha: number;
  rearGridFade: number;
  rearGridParallax: number;
  rearOutlineEnabled: boolean;
  rearOutlineColor: THREE.ColorRepresentation;
  rearOutlineOpacity: number;
  rearOutlineScale: number;
  vhsFps: number;
  vhsTimebaseStrength: number;
  vhsChromaBleed: number;
  vhsHeadswitchStrength: number;
  vhsDropoutStrength: number;
  vhsNoiseStrength: number;
};

export type VariantConfig = {
  id: number;
  name: string;
  preset: VariantPreset;
};

const UNIVERSE_EDGE_COLOR = [209, 109, 169];
const UNIVERSE_SPHERE_GLOW_COLOR = [69, 49, 99];
const VHS_EFFECT_FPS = 29.97;
const DEFAULT_VHS_SETTINGS = {
  vhsFps: 29.97,
  vhsTimebaseStrength: 1,
  vhsChromaBleed: 2.3,
  vhsHeadswitchStrength: 0.9,
  vhsDropoutStrength: 1,
  vhsNoiseStrength: 0.65,
} as const;

const VHS_EFFECT_SHADER = `
uniform sampler2D uNoiseTexture;
uniform float uSteppedTime;
uniform float uContinuousTime;
uniform float uVhsTimebaseStrength;
uniform float uVhsChromaBleed;
uniform float uVhsHeadswitchStrength;
uniform float uVhsDropoutStrength;
uniform float uVhsNoiseStrength;

#define V vec2(0.0, 1.0)
#define VHS_PI 3.14159265
#define VHS_RES vec2(320.0, 240.0)
#define vhsSaturate(i) clamp(i, 0.0, 1.0)
#define vhsValidUv(v) (abs((v).x - 0.5) < 0.5 && abs((v).y - 0.5) < 0.5)

#define LUMA_SAMPLES 7
#define CHROMA_SAMPLES 5
float v2random(vec2 uv) {
  return texture(uNoiseTexture, fract(uv)).x;
}

vec3 v3random(vec2 uv) {
  return texture(uNoiseTexture, fract(uv)).xyz;
}

mat2 rotate2D(float t) {
  return mat2(cos(t), sin(t), -sin(t), cos(t));
}

vec3 rgb2yiq(vec3 rgb) {
  return mat3(
    0.299,  0.596,  0.211,
    0.587, -0.274, -0.523,
    0.114, -0.322,  0.312
  ) * rgb;
}

vec3 yiq2rgb(vec3 yiq) {
  return mat3(
    1.000,  1.000,  1.000,
    0.956, -0.272, -1.106,
    0.621, -0.647,  1.703
  ) * yiq;
}

vec3 fetchSource(vec2 uv) {
  if (!vhsValidUv(uv)) {
    return vec3(0.03, 0.03, 0.035);
  }

  vec2 quv = (floor(uv * VHS_RES) + 0.5) / VHS_RES;
  return texture(inputBuffer, quv).xyz;
}

float trackingWarp(float y, float time) {
  float slowDrift = v2random(vec2(floor(time * 0.35) * 0.013, 0.17)) * 2.0 - 1.0;
  float lineLfo = sin(y * VHS_PI * 2.0 * 1.25 + time * 0.9 + slowDrift * 1.7);
  float lineNoise = v2random(vec2(y * 0.85, time * 0.11)) * 2.0 - 1.0;
  return (slowDrift * 1.25 + lineLfo * 0.8 + lineNoise * 0.45) * 0.75;
}

float lineTimebaseOffset(float y, float time) {
  float coarse = v2random(vec2(y * 0.21, floor(time * 1.4) * 0.031)) * 2.0 - 1.0;
  float medium = v2random(vec2(y * 2.7, time * 0.7)) * 2.0 - 1.0;
  float fine = v2random(vec2(y * 24.0, floor(time * 16.0) * 0.071)) * 2.0 - 1.0;
  float wobble = sin(y * VHS_PI * 2.0 * 2.4 + time * 2.1 + coarse * 2.2);
  return uVhsTimebaseStrength * (coarse * 2.5 + medium * 1.0 + fine * 0.35 + wobble * 0.85);
}

float chromaPhaseError(float y, float time) {
  float phaseJump = v2random(vec2(floor(time * 2.0) * 0.047, y * 1.8)) * 2.0 - 1.0;
  float flutter = v2random(vec2(y * 6.3, time * 0.55)) * 2.0 - 1.0;
  return phaseJump * 0.14 + flutter * 0.045;
}

float headSwitchMask(float y, float time) {
  float band = smoothstep(1.0 - 16.0 / VHS_RES.y, 1.0 - 8.0 / VHS_RES.y, y);
  float flicker = 0.8 + 0.2 * v2random(vec2(floor(time * 30.0) * 0.019, 0.23));
  return band * flicker;
}

float dropoutMask(vec2 uv, float time) {
  float lineId = floor(uv.y * VHS_RES.y);
  float eventSeed = floor(time * 9.0);
  float event = smoothstep(0.82, 0.985, v2random(vec2(eventSeed * 0.017, 0.61)));
  float lineSelect = smoothstep(0.74, 0.96, v2random(vec2(lineId * 0.043, eventSeed * 0.071)));
  float start = v2random(vec2(lineId * 0.011, eventSeed * 0.093));
  float length = 0.03 + 0.18 * v2random(vec2(lineId * 0.019, eventSeed * 0.057));
  float xMask = smoothstep(start - 0.01, start, uv.x) *
                (1.0 - smoothstep(start + length, start + length + 0.01, uv.x));
  return event * lineSelect * xMask;
}

float sampleLuma(vec2 uv) {
  float texel = 1.0 / VHS_RES.x;
  float accum = 0.0;
  float total = 0.0;

  for (int i = 0; i < LUMA_SAMPLES; i++) {
    float fi = float(i) - float(LUMA_SAMPLES - 1) * 0.5;
    float w = 1.0 / (1.0 + fi * fi * 0.9);
    vec3 yiq = rgb2yiq(fetchSource(uv + vec2(fi * texel * 0.55, 0.0)));
    accum += yiq.x * w;
    total += w;
  }

  return accum / max(total, 1e-4);
}

vec2 sampleChromaIQ(vec2 uv, float chromaOffset, float blurAmount) {
  float texel = 1.0 / VHS_RES.x;
  vec2 accum = vec2(0.0);
  float total = 0.0;

  for (int i = 0; i < CHROMA_SAMPLES; i++) {
    float fi = float(i) - float(CHROMA_SAMPLES - 1) * 0.5;
    float w = 1.0 / (1.0 + fi * fi * 0.45);
    vec2 sampleUv = uv + vec2((fi * blurAmount + chromaOffset) * texel, 0.0);
    vec3 yiq = rgb2yiq(fetchSource(sampleUv));
    accum += yiq.yz * w;
    total += w;
  }

  return accum / max(total, 1e-4);
}

vec3 sampleCompositeLike(vec2 uv, float time) {
  float phase = chromaPhaseError(uv.y, time);
  float chromaLag = uVhsChromaBleed * (0.85 + 0.3 * v2random(vec2(uv.y * 3.1, floor(time * 2.0) * 0.083)));
  float chromaBlur = 1.5 + 0.9 * abs(phase) * 10.0;

  float y = sampleLuma(uv);
  vec2 iq = sampleChromaIQ(uv, chromaLag, chromaBlur);
  iq = rotate2D(phase) * iq;

  return vec3(y, iq);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float time = uSteppedTime;
  float continuousTime = uContinuousTime;
  vec2 vhsUv = (floor(uv * VHS_RES) + 0.5) / VHS_RES;

  float verticalDrift = trackingWarp(vhsUv.y, time);
  float lineOffset = lineTimebaseOffset(vhsUv.y, time);
  float headSwitch = headSwitchMask(vhsUv.y, time);

  float headSwitchShift = uVhsHeadswitchStrength *
    headSwitch *
    ((v2random(vec2(floor(vhsUv.y * VHS_RES.y) * 0.013, floor(time * 30.0) * 0.17)) * 2.0 - 1.0) * 9.0);

  vec2 sampleUv = vhsUv;
  sampleUv.y += verticalDrift / VHS_RES.y;
  sampleUv.x += (lineOffset + headSwitchShift) / VHS_RES.x;

  vec3 yiq = sampleCompositeLike(sampleUv, time);

  float hsNoise = v2random(vec2(sampleUv.x * 7.0 + time * 4.0, sampleUv.y * 43.0));
  yiq.x += (hsNoise - 0.5) * 0.12 * headSwitch * uVhsHeadswitchStrength;
  yiq.yz *= 1.0 - headSwitch * 0.45 * uVhsHeadswitchStrength;
  yiq.x *= 1.0 - headSwitch * 0.12 * uVhsHeadswitchStrength;

  float dropout = dropoutMask(sampleUv, time) * uVhsDropoutStrength;
  if (dropout > 0.0) {
    float spark = v2random(vec2(sampleUv.x * 15.0 + time * 23.0, floor(sampleUv.y * VHS_RES.y) * 0.031));
    yiq.x = mix(yiq.x, 0.86 + spark * 0.28, dropout * 0.85);
    yiq.yz *= 1.0 - dropout;
  }

  float creaseEvent = smoothstep(0.88, 0.985, v2random(vec2(floor(time * 1.7) * 0.053, 0.91)));
  float creaseLine = smoothstep(0.65, 0.98, v2random(vec2(vhsUv.y * 5.7, floor(time * 12.0) * 0.067)));
  float crease = creaseEvent * creaseLine;
  if (crease > 0.0) {
    float whiteSpeck = v2random(vec2(sampleUv * vec2(13.0, 47.0) + time * vec2(9.0, 2.0)));
    yiq.x = mix(yiq.x, 1.0 + whiteSpeck * 0.25, crease * smoothstep(0.82, 1.0, whiteSpeck) * 0.8);
  }

  float gain = 0.98 + 0.05 * (v2random(vec2(floor(time * 4.0) * 0.031, 0.13)) - 0.5);
  float rf = v2random(vec2(
    sampleUv.x * 55.0 + continuousTime * 21.0,
    sampleUv.y * 3.3 + continuousTime * 1.7
  )) - 0.5;
  yiq.x = yiq.x * gain + rf * 0.035 * uVhsNoiseStrength;
  yiq.yz += (
    v3random(vec2(sampleUv.y * 9.0, continuousTime * 0.9)).xy - 0.5
  ) * 0.01 * uVhsNoiseStrength;

  yiq = vec3(0.02, -0.01, 0.0) + yiq * vec3(0.98, 0.92, 0.92);

  vec3 col = yiq2rgb(yiq);
  col = vhsSaturate(col);
  col = pow(col, vec3(1.02));

  outputColor = vec4(col, inputColor.a);
}
`;

function createNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(Math.random() * 256);
    data[i + 1] = Math.floor(Math.random() * 256);
    data[i + 2] = Math.floor(Math.random() * 256);
    data[i + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

class VhsSignalEffectImpl extends Effect {
  private rawTime = 0;

  constructor(noiseTexture: THREE.Texture, settings: Pick<
    VariantPreset,
    | "vhsFps"
    | "vhsTimebaseStrength"
    | "vhsChromaBleed"
    | "vhsHeadswitchStrength"
    | "vhsDropoutStrength"
    | "vhsNoiseStrength"
  >) {
    super("VhsSignalEffect", VHS_EFFECT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uSteppedTime", new THREE.Uniform(0)],
        ["uContinuousTime", new THREE.Uniform(0)],
        ["uNoiseTexture", new THREE.Uniform(noiseTexture)],
        ["uVhsFps", new THREE.Uniform(settings.vhsFps)],
        ["uVhsTimebaseStrength", new THREE.Uniform(settings.vhsTimebaseStrength)],
        ["uVhsChromaBleed", new THREE.Uniform(settings.vhsChromaBleed)],
        ["uVhsHeadswitchStrength", new THREE.Uniform(settings.vhsHeadswitchStrength)],
        ["uVhsDropoutStrength", new THREE.Uniform(settings.vhsDropoutStrength)],
        ["uVhsNoiseStrength", new THREE.Uniform(settings.vhsNoiseStrength)],
      ]),
    });
  }

  setSettings(
    settings: Pick<
      VariantPreset,
      | "vhsFps"
      | "vhsTimebaseStrength"
      | "vhsChromaBleed"
      | "vhsHeadswitchStrength"
      | "vhsDropoutStrength"
      | "vhsNoiseStrength"
    >,
  ) {
    this.uniforms.get("uVhsFps")!.value = settings.vhsFps;
    this.uniforms.get("uVhsTimebaseStrength")!.value = settings.vhsTimebaseStrength;
    this.uniforms.get("uVhsChromaBleed")!.value = settings.vhsChromaBleed;
    this.uniforms.get("uVhsHeadswitchStrength")!.value = settings.vhsHeadswitchStrength;
    this.uniforms.get("uVhsDropoutStrength")!.value = settings.vhsDropoutStrength;
    this.uniforms.get("uVhsNoiseStrength")!.value = settings.vhsNoiseStrength;
  }

  override update(
    _renderer: THREE.WebGLRenderer,
    _inputBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
  ) {
    this.rawTime += deltaTime;

    const steppedTimeUniform = this.uniforms.get("uSteppedTime");
    if (steppedTimeUniform) {
      steppedTimeUniform.value =
        Math.floor(this.rawTime * Math.max(1, this.uniforms.get("uVhsFps")?.value ?? VHS_EFFECT_FPS)) /
        Math.max(1, this.uniforms.get("uVhsFps")?.value ?? VHS_EFFECT_FPS);
    }

    const continuousTimeUniform = this.uniforms.get("uContinuousTime");
    if (continuousTimeUniform) {
      continuousTimeUniform.value = this.rawTime;
    }
  }
}

const VhsSignalEffect = forwardRef<
  Effect,
  {
    noiseTexture: THREE.Texture;
    settings: Pick<
      VariantPreset,
      | "vhsFps"
      | "vhsTimebaseStrength"
      | "vhsChromaBleed"
      | "vhsHeadswitchStrength"
      | "vhsDropoutStrength"
      | "vhsNoiseStrength"
    >;
  }
>(function VhsSignalEffect({ noiseTexture, settings }, ref) {
    const effect = useMemo(
      () => new VhsSignalEffectImpl(noiseTexture, settings),
      [noiseTexture, settings],
    );

    useEffect(() => {
      effect.setSettings(settings);
    }, [effect, settings]);

    useEffect(() => {
      return () => effect.dispose();
    }, [effect]);

    return <primitive ref={ref} object={effect} dispose={null} />;
  });

function RotatingStars() {
  const starfieldRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const starfield = starfieldRef.current;
    if (!starfield) return;

    starfield.rotation.y += delta * 0.03;
    starfield.rotation.x = THREE.MathUtils.lerp(
      starfield.rotation.x,
      0.12,
      1 - Math.exp(-2 * delta),
    );
  });

  return (
    <group ref={starfieldRef}>
      <Stars
        radius={50}
        depth={500}
        count={2000}
        factor={5}
        saturation={1}
        speed={0}
      />
    </group>
  );
}

function UniverseBackgroundSphere() {
  const edgeColor = useMemo(
    () =>
      new THREE.Color(...UNIVERSE_EDGE_COLOR.map((channel) => channel / 255)),
    [],
  );
  const glowColor = useMemo(
    () =>
      new THREE.Color(
        ...UNIVERSE_SPHERE_GLOW_COLOR.map((channel) => channel / 255),
      ),
    [],
  );

  return (
    <>
      <NoisySphere
        radius={10}
        widthSegments={180}
        heightSegments={70}
        noiseAmount={0.3}
        edgeColor={edgeColor}
        flatCenter
        poleNoiseFloor={0}
        equatorPower={0.85}
        yNoiseScale={0.4}
        displaceYScale={0}
        cylinderMorph={0.25}
      />
      <GlowSphere radius={10} glowColor={glowColor} />
    </>
  );
}

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
uniform float uEdgeSoftness;
uniform float uPointerInfluence;
uniform float uDividerWidth;
uniform float uDividerStrength;
uniform float uBandCurve;
uniform float uDividerEnabled;
uniform float uSheenEnabled;
uniform float uEdgeSoftnessEnabled;
uniform float uEdgeSoftnessOffset;

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
  float edgeMask = smoothstep(
    uEdgeSoftnessOffset,
    uEdgeSoftnessOffset + max(0.0001, uEdgeSoftness),
    edgeDistance
  );
  color = mix(color, mix(uShadowTint, color, edgeMask), uEdgeSoftnessEnabled);

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

const shadowFragmentShader = `
uniform float uBoundsMinX;
uniform float uBoundsMaxX;
uniform float uBoundsMinY;
uniform float uBoundsMaxY;
uniform vec2 uMouse;
uniform vec3 uGridColor;
uniform float uGridDensityX;
uniform float uGridDensityY;
uniform float uGridWidth;
uniform float uGridAlpha;
uniform float uGridFade;
uniform float uGridParallax;
uniform float uGridEnabled;

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

  float shiftedAcross = across + uMouse.x * uGridParallax;
  float shiftedDown = topDown - uMouse.y * uGridParallax;

  float verticalLines = gridLine(shiftedAcross, uGridDensityX, uGridWidth);
  float horizontalLines = gridLine(shiftedDown, uGridDensityY, uGridWidth);
  float grid = max(verticalLines, horizontalLines);

  float fade = smoothstep(0.0, max(0.0001, uGridFade), min(min(across, 1.0 - across), min(topDown, 1.0 - topDown)));
  float alpha = grid * uGridAlpha * fade * uGridEnabled;

  gl_FragColor = vec4(uGridColor, alpha);
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
      edgeSoftness: 0.085,
      pointerInfluence: 0.55,
      dividerWidth: 0.018,
      dividerStrength: 0.72,
      bandCurve: 1.34,
      dividerEnabled: true,
      sheenEnabled: true,
      edgeSoftnessEnabled: true,
      edgeSoftnessOffset: 0,
      rearGridEnabled: true,
      rearGridColor: "#ffffff",
      rearGridDensityX: 19,
      rearGridDensityY: 12,
      rearGridWidth: 0.024,
      rearGridAlpha: 0.22,
      rearGridFade: 0.16,
      rearGridParallax: 0.04,
      rearOutlineEnabled: true,
      rearOutlineColor: "#ffffff",
      rearOutlineOpacity: 0.9,
      rearOutlineScale: 1.035,
      ...DEFAULT_VHS_SETTINGS,
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
      edgeSoftness: 0.06,
      pointerInfluence: 0.42,
      dividerWidth: 0.008,
      dividerStrength: 1.0,
      bandCurve: 0.72,
      dividerEnabled: true,
      sheenEnabled: true,
      edgeSoftnessEnabled: true,
      edgeSoftnessOffset: 0,
      rearGridEnabled: true,
      rearGridColor: "#ffffff",
      rearGridDensityX: 15,
      rearGridDensityY: 9,
      rearGridWidth: 0.02,
      rearGridAlpha: 0.18,
      rearGridFade: 0.12,
      rearGridParallax: 0.03,
      rearOutlineEnabled: true,
      rearOutlineColor: "#ffffff",
      rearOutlineOpacity: 0.82,
      rearOutlineScale: 1.03,
      ...DEFAULT_VHS_SETTINGS,
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
      edgeSoftness: 0.11,
      pointerInfluence: 0.9,
      dividerWidth: 0.024,
      dividerStrength: 0.58,
      bandCurve: 1.12,
      dividerEnabled: true,
      sheenEnabled: true,
      edgeSoftnessEnabled: true,
      edgeSoftnessOffset: 0,
      rearGridEnabled: true,
      rearGridColor: "#ffdfff",
      rearGridDensityX: 22,
      rearGridDensityY: 14,
      rearGridWidth: 0.028,
      rearGridAlpha: 0.28,
      rearGridFade: 0.18,
      rearGridParallax: 0.05,
      rearOutlineEnabled: true,
      rearOutlineColor: "#fff5ff",
      rearOutlineOpacity: 0.94,
      rearOutlineScale: 1.04,
      ...DEFAULT_VHS_SETTINGS,
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
      edgeSoftness: 0.07,
      pointerInfluence: 1.05,
      dividerWidth: 0.012,
      dividerStrength: 0.92,
      bandCurve: 0.86,
      dividerEnabled: true,
      sheenEnabled: true,
      edgeSoftnessEnabled: true,
      edgeSoftnessOffset: 0,
      rearGridEnabled: true,
      rearGridColor: "#ffffff",
      rearGridDensityX: 19,
      rearGridDensityY: 12,
      rearGridWidth: 0.024,
      rearGridAlpha: 0.22,
      rearGridFade: 0.16,
      rearGridParallax: 0.04,
      rearOutlineEnabled: true,
      rearOutlineColor: "#ffffff",
      rearOutlineOpacity: 0.9,
      rearOutlineScale: 1.035,
      ...DEFAULT_VHS_SETTINGS,
    },
  },
];

function createUniformColor(value: THREE.ColorRepresentation) {
  return new THREE.Color(value);
}

function applyVariantPreset(
  material: THREE.ShaderMaterial,
  preset: VariantPreset,
) {
  material.uniforms.uSkyDeep.value.set(preset.skyDeep);
  material.uniforms.uSkyMid.value.set(preset.skyMid);
  material.uniforms.uSkyLight.value.set(preset.skyLight);
  material.uniforms.uGroundHot.value.set(preset.groundHot);
  material.uniforms.uGroundMid.value.set(preset.groundMid);
  material.uniforms.uGroundLight.value.set(preset.groundLight);
  material.uniforms.uDivider.value.set(preset.divider);
  material.uniforms.uShadowTint.value.set(preset.shadowTint);
  material.uniforms.uHighlightTint.value.set(preset.highlightTint);

  material.uniforms.uSplitBase.value = preset.splitBase;
  material.uniforms.uMountainAmp1.value = preset.mountainAmp1;
  material.uniforms.uMountainAmp2.value = preset.mountainAmp2;
  material.uniforms.uMountainFreq1.value = preset.mountainFreq1;
  material.uniforms.uMountainFreq2.value = preset.mountainFreq2;
  material.uniforms.uMountainPhase1.value = preset.mountainPhase1;
  material.uniforms.uMountainPhase2.value = preset.mountainPhase2;
  material.uniforms.uReflectionMix.value = preset.reflectionMix;
  material.uniforms.uSheenStrength.value = preset.sheenStrength;
  material.uniforms.uEdgeSoftness.value = preset.edgeSoftness;
  material.uniforms.uPointerInfluence.value = preset.pointerInfluence;
  material.uniforms.uDividerWidth.value = preset.dividerWidth;
  material.uniforms.uDividerStrength.value = preset.dividerStrength;
  material.uniforms.uBandCurve.value = preset.bandCurve;
  material.uniforms.uDividerEnabled.value = preset.dividerEnabled ? 1 : 0;
  material.uniforms.uSheenEnabled.value = preset.sheenEnabled ? 1 : 0;
  material.uniforms.uEdgeSoftnessEnabled.value = preset.edgeSoftnessEnabled
    ? 1
    : 0;
  material.uniforms.uEdgeSoftnessOffset.value = preset.edgeSoftnessOffset;
}

function FlatTitleVariant({
  variant,
  pointerState,
  position,
  baseScale,
  referenceDistance,
  referenceFov,
}: {
  variant: VariantConfig;
  pointerState: PointerState;
  position: [number, number, number];
  baseScale: number;
  referenceDistance: number;
  referenceFov: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const mainRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Group>(null);
  const titleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shadowMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const font = useFont("/AAReg.json");

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
  } = useMemo(() => {
    const nextGeometry = new TextGeometry(
      TITLE_TEXT,
      config as unknown as ConstructorParameters<typeof TextGeometry>[1],
    );
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
    };
  }, [config]);

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
      uHighlightTint: {
        value: createUniformColor(variant.preset.highlightTint),
      },
      uSplitBase: { value: variant.preset.splitBase },
      uMountainAmp1: { value: variant.preset.mountainAmp1 },
      uMountainAmp2: { value: variant.preset.mountainAmp2 },
      uMountainFreq1: { value: variant.preset.mountainFreq1 },
      uMountainFreq2: { value: variant.preset.mountainFreq2 },
      uMountainPhase1: { value: variant.preset.mountainPhase1 },
      uMountainPhase2: { value: variant.preset.mountainPhase2 },
      uReflectionMix: { value: variant.preset.reflectionMix },
      uSheenStrength: { value: variant.preset.sheenStrength },
      uEdgeSoftness: { value: variant.preset.edgeSoftness },
      uPointerInfluence: { value: variant.preset.pointerInfluence },
      uDividerWidth: { value: variant.preset.dividerWidth },
      uDividerStrength: { value: variant.preset.dividerStrength },
      uBandCurve: { value: variant.preset.bandCurve },
      uDividerEnabled: { value: variant.preset.dividerEnabled ? 1 : 0 },
      uSheenEnabled: { value: variant.preset.sheenEnabled ? 1 : 0 },
      uEdgeSoftnessEnabled: {
        value: variant.preset.edgeSoftnessEnabled ? 1 : 0,
      },
      uEdgeSoftnessOffset: { value: variant.preset.edgeSoftnessOffset },
    }),
    [boundsMaxX, boundsMaxY, boundsMinX, boundsMinY, variant.preset],
  );

  const shadowUniforms = useMemo(
    () => ({
      uMouse: { value: new THREE.Vector2(0, 0) },
      uBoundsMinX: { value: boundsMinX },
      uBoundsMaxX: { value: boundsMaxX },
      uBoundsMinY: { value: boundsMinY },
      uBoundsMaxY: { value: boundsMaxY },
      uGridColor: { value: createUniformColor(variant.preset.rearGridColor) },
      uGridDensityX: { value: variant.preset.rearGridDensityX },
      uGridDensityY: { value: variant.preset.rearGridDensityY },
      uGridWidth: { value: variant.preset.rearGridWidth },
      uGridAlpha: { value: variant.preset.rearGridAlpha },
      uGridFade: { value: variant.preset.rearGridFade },
      uGridParallax: { value: variant.preset.rearGridParallax },
      uGridEnabled: { value: variant.preset.rearGridEnabled ? 1 : 0 },
    }),
    [boundsMaxX, boundsMaxY, boundsMinX, boundsMinY, variant.preset],
  );

  useFrame(({ clock, camera }) => {
    const main = mainRef.current;
    const shadow = shadowRef.current;
    const titleMaterial = titleMaterialRef.current;
    const shadowMaterial = shadowMaterialRef.current;
    const mouse = pointerState.mousePos.current;
    const cameraToTitleDistance = camera.position.distanceTo(
      new THREE.Vector3(...position),
    );
    const currentFov =
      camera instanceof THREE.PerspectiveCamera ? camera.fov : referenceFov;
    const fovScale =
      Math.tan(THREE.MathUtils.degToRad(currentFov * 0.5)) /
      Math.tan(THREE.MathUtils.degToRad(referenceFov * 0.5));
    const distanceScale = cameraToTitleDistance / referenceDistance;
    const compensatedScale = baseScale * distanceScale * fovScale;

    if (main) {
      main.position.x = mouse.x * 0.18;
      main.position.y = mouse.y * 0.1;
      main.scale.setScalar(compensatedScale);
    }

    if (shadow) {
      shadow.position.x = -mouse.x * 0.09;
      shadow.position.y = -mouse.y * 0.05;
      shadow.scale.setScalar(
        compensatedScale * variant.preset.rearOutlineScale,
      );
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
    const titleMaterial = titleMaterialRef.current;
    if (!titleMaterial) return;
    applyVariantPreset(titleMaterial, variant.preset);
  }, [variant.preset]);

  useEffect(() => {
    const shadowMaterial = shadowMaterialRef.current;
    if (!shadowMaterial) return;
    shadowMaterial.uniforms.uGridColor.value.set(variant.preset.rearGridColor);
    shadowMaterial.uniforms.uGridDensityX.value =
      variant.preset.rearGridDensityX;
    shadowMaterial.uniforms.uGridDensityY.value =
      variant.preset.rearGridDensityY;
    shadowMaterial.uniforms.uGridWidth.value = variant.preset.rearGridWidth;
    shadowMaterial.uniforms.uGridAlpha.value = variant.preset.rearGridAlpha;
    shadowMaterial.uniforms.uGridFade.value = variant.preset.rearGridFade;
    shadowMaterial.uniforms.uGridParallax.value =
      variant.preset.rearGridParallax;
    shadowMaterial.uniforms.uGridEnabled.value = variant.preset.rearGridEnabled
      ? 1
      : 0;
  }, [variant.preset]);

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
              color={variant.preset.rearOutlineColor}
              transparent
              opacity={
                variant.preset.rearOutlineEnabled
                  ? variant.preset.rearOutlineOpacity
                  : 0
              }
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

function SceneContents({
  activeVariant,
  viewIndex,
}: {
  activeVariant: VariantConfig;
  viewIndex: number;
}) {
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouseVel = useRef(new THREE.Vector2(0, 0));
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const pointerState = { mousePos, mouseVel, targetMouse };
  const { size } = useThree();
  const noiseTexture = useMemo(() => createNoiseTexture(), []);
  const variantSignature = useMemo(
    () => `${activeVariant.id}:${JSON.stringify(activeVariant.preset)}`,
    [activeVariant],
  );
  const universeTitlePosition = useMemo(
    () =>
      [
        getUniverseTitleAnchorX(size.width, DEFAULT_UNIVERSE_TITLE_SCALE),
        DEFAULT_UNIVERSE_ANCHOR_Y,
        DEFAULT_UNIVERSE_ANCHOR_Z,
      ] as [number, number, number],
    [size.width],
  );
  const universeTitleScale = useMemo(
    () =>
      getUniverseTitleScale(size.width, DEFAULT_UNIVERSE_TITLE_SCALE) *
      (2 / 0.9),
    [size.width],
  );
  const referenceCameraPosition = useMemo(
    () => new THREE.Vector3(...VIEWS[0].position),
    [],
  );
  const referenceDistance = useMemo(
    () =>
      referenceCameraPosition.distanceTo(
        new THREE.Vector3(...universeTitlePosition),
      ),
    [referenceCameraPosition, universeTitlePosition],
  );

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

  useEffect(() => {
    return () => noiseTexture.dispose();
  }, [noiseTexture]);

  return (
    <>
      <CameraRig viewIndex={viewIndex} />
      <UniverseSkyDome />
      <UniverseBackgroundSphere />
      <RotatingStars />
      <FlatTitleVariant
        key={variantSignature}
        variant={activeVariant}
        pointerState={pointerState}
        position={universeTitlePosition}
        baseScale={universeTitleScale}
        referenceDistance={referenceDistance}
        referenceFov={50}
      />
      <EffectComposer enableNormalPass={false}>
        <VhsSignalEffect noiseTexture={noiseTexture} settings={activeVariant.preset} />
      </EffectComposer>
    </>
  );
}

export function TitleTest2DScene({
  activeVariant,
}: {
  activeVariant: VariantConfig;
}) {
  const [viewIndex, setViewIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      event.preventDefault();
      setViewIndex((current) => (current + 1) % 3);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 10.3, 0], fov: 50, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#030611"]} />
      <SceneContents activeVariant={activeVariant} viewIndex={viewIndex} />
    </Canvas>
  );
}
