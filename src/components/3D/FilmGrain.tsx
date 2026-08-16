import { wrapEffect } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";

const GRAIN_TEXTURE_SIZE = 512;

const fragmentShader = /* glsl */ `
  uniform sampler2D grainMap;
  uniform float grainSize;
  uniform float grainContrast;
  uniform float secondaryGrainMix;
  uniform float secondaryGrainScale;
  uniform float exposureVariationStrength;
  uniform vec2 exposureVariationScale;
  uniform float interferenceBandHeight;
  uniform float interferenceThreshold;
  uniform float interferenceSoftness;
  uniform float interferenceStrength;
  uniform float frame;

  void mainImage(
    const in vec4 inputColor,
    const in vec2 uv,
    out vec4 outputColor
  ) {
    // Keep the grain close to a pixel scale while allowing the texture to
    // tile several times across a large display without an obvious pattern.
    vec2 grainScale = resolution / (float(${GRAIN_TEXTURE_SIZE}) * grainSize);
    vec2 fineUv = uv * grainScale;
    vec2 fineFrameOffset = vec2(
      fract(frame * 0.754877666),
      fract(frame * 0.569840296)
    );
    vec2 secondaryFrameOffset = vec2(
      fract(frame * 0.438579321),
      fract(frame * 0.913746527)
    );

    float fineGrain = texture2D(
      grainMap,
      fract(fineUv + fineFrameOffset)
    ).r;
    float secondaryGrain = texture2D(
      grainMap,
      fract(fineUv * secondaryGrainScale + secondaryFrameOffset)
    ).g;

    // A slower exposure variation makes the grain feel photographic instead
    // of looking like a perfectly uniform digital overlay.
    float exposureVariation = texture2D(
      grainMap,
      fract(
        uv * exposureVariationScale +
        vec2(fract(frame * 0.271828182), fract(frame * 0.693147181))
      )
    ).b;

    float grain = mix(fineGrain, secondaryGrain, secondaryGrainMix);
    grain = mix(0.5, grain, grainContrast);
    grain += (exposureVariation - 0.5) * exposureVariationStrength;

    // Rare horizontal disturbances provide a restrained CRT interference
    // layer. Scanline is still responsible for the regular scanline pattern.
    float bandIndex = floor(uv.y * resolution.y / interferenceBandHeight);
    float bandNoise = texture2D(
      grainMap,
      fract(vec2(
        bandIndex / float(${GRAIN_TEXTURE_SIZE}) + fract(frame * 0.381966011),
        0.83
      ))
    ).a;
    float interference = smoothstep(
      interferenceThreshold,
      min(1.0, interferenceThreshold + interferenceSoftness),
      bandNoise
    );
    grain += interference * interferenceStrength;

    outputColor = vec4(vec3(clamp(grain, 0.0, 1.0)), inputColor.a);
  }
`;

function createSeededGrainTexture(seed: number) {
  let state = seed >>> 0;
  const data = new Uint8Array(GRAIN_TEXTURE_SIZE * GRAIN_TEXTURE_SIZE * 4);

  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = 0; index < data.length; index += 4) {
    data[index] = Math.floor(random() * 256);
    data[index + 1] = Math.floor(random() * 256);
    data[index + 2] = Math.floor(random() * 256);
    data[index + 3] = Math.floor(random() * 256);
  }

  const texture = new THREE.DataTexture(
    data,
    GRAIN_TEXTURE_SIZE,
    GRAIN_TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );

  texture.name = "Universe.FilmGrain";
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;

  return texture;
}

export type FilmGrainOptions = {
  /** Maximum grain updates per second. Use 0 for every rendered frame. */
  maxFps?: number;
  grainSize?: number;
  grainContrast?: number;
  secondaryGrainMix?: number;
  secondaryGrainScale?: number;
  exposureVariationStrength?: number;
  exposureVariationScale?: [number, number];
  interferenceBandHeight?: number;
  interferenceThreshold?: number;
  interferenceSoftness?: number;
  interferenceStrength?: number;
  seed?: number;
};

class FilmGrainEffect extends Effect {
  private readonly grainTexture: THREE.DataTexture;
  private readonly frameUniform: THREE.Uniform<number>;
  private readonly maxFps: number;
  private frameAccumulator = 0;

  constructor({
    blendFunction = BlendFunction.PIN_LIGHT,
    maxFps = 0,
    grainSize = 1.5,
    grainContrast = 1,
    secondaryGrainMix = 0.32,
    secondaryGrainScale = 0.71,
    exposureVariationStrength = 0.12,
    exposureVariationScale = [1.7, 2.4],
    interferenceBandHeight = 6,
    interferenceThreshold = 0.985,
    interferenceSoftness = 0.015,
    interferenceStrength = 0.18,
    seed = 0x534e5954,
  }: FilmGrainOptions & { blendFunction?: BlendFunction } = {}) {
    const grainTexture = createSeededGrainTexture(seed);
    const frameUniform = new THREE.Uniform(0);

    super("FilmGrainEffect", fragmentShader, {
      blendFunction,
      uniforms: new Map<string, THREE.Uniform>([
        ["grainMap", new THREE.Uniform(grainTexture)],
        ["grainSize", new THREE.Uniform(grainSize)],
        ["grainContrast", new THREE.Uniform(grainContrast)],
        ["secondaryGrainMix", new THREE.Uniform(secondaryGrainMix)],
        ["secondaryGrainScale", new THREE.Uniform(secondaryGrainScale)],
        [
          "exposureVariationStrength",
          new THREE.Uniform(exposureVariationStrength),
        ],
        [
          "exposureVariationScale",
          new THREE.Uniform(new THREE.Vector2(...exposureVariationScale)),
        ],
        ["interferenceBandHeight", new THREE.Uniform(interferenceBandHeight)],
        ["interferenceThreshold", new THREE.Uniform(interferenceThreshold)],
        ["interferenceSoftness", new THREE.Uniform(interferenceSoftness)],
        ["interferenceStrength", new THREE.Uniform(interferenceStrength)],
        ["frame", frameUniform],
      ]),
    });

    this.grainTexture = grainTexture;
    this.frameUniform = frameUniform;
    this.maxFps = Number.isFinite(maxFps) ? Math.max(0, maxFps) : 0;
  }

  override update(...args: Parameters<Effect["update"]>) {
    // Advance once per EffectPass render so the grain changes discretely on
    // every rendered frame instead of continuously translating across it.
    const deltaTime = args[2] ?? 0;

    if (this.maxFps === 0) {
      this.frameUniform.value = (this.frameUniform.value + 1) % 1048576;
      return;
    }

    const frameInterval = 1 / this.maxFps;
    this.frameAccumulator += Math.max(0, deltaTime);

    if (this.frameAccumulator < frameInterval) return;

    const frameCount = Math.floor(this.frameAccumulator / frameInterval);
    this.frameAccumulator -= frameCount * frameInterval;
    this.frameUniform.value =
      (this.frameUniform.value + frameCount) % 1048576;
  }

  dispose() {
    this.grainTexture.dispose();
    super.dispose();
  }
}

export const FilmGrain = wrapEffect(FilmGrainEffect, {
  blendFunction: BlendFunction.PIN_LIGHT,
});
