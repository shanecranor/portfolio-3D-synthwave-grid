import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { Color, Uniform, Vector2 } from "three";

const fragmentShader = /* glsl */ `
uniform float time;
uniform vec2 resolution;
uniform float noiseIntensity;
uniform float scanlineIntensity;
uniform float chromaticOffset;
uniform float bloomStrength;
uniform float bloomThreshold;
uniform float bloomRadius;
uniform float bloomSoftStrength;
uniform float bloomSoftThreshold;
uniform float bloomSoftRadius;
uniform float vignetteStrength;
uniform vec3 tint;
uniform float scanlineSpeed;
uniform float scanlineHeight;

float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 bloomSample(sampler2D tex, vec2 uv, vec2 pixel, float strength, float radius, float threshold) {
  float knee = max(0.0001, threshold * 0.75);
  vec3 sum = vec3(0.0);

  vec2 off1 = pixel * radius;
  vec2 off2 = pixel * (radius * 1.8);
  float d = 0.70710678;
  float rotC1 = 0.9238795;
  float rotS1 = 0.3826834;
  float angle = random(uv * resolution.xy + time * 0.07) * 6.2831853;
  float ca = cos(angle);
  float sa = sin(angle);
  mat2 rot = mat2(ca, -sa, sa, ca);

  vec2 off1x = rot * vec2(off1.x, 0.0);
  vec2 off1y = rot * vec2(0.0, off1.y);
  vec2 off1d1 = rot * (off1 * vec2(d, d));
  vec2 off1d2 = rot * (off1 * vec2(-d, d));
  vec2 off1d3 = rot * (off1 * vec2(d, -d));
  vec2 off1d4 = rot * (off1 * vec2(-d, -d));

  vec2 off2a = rot * (off2 * vec2(rotC1, rotS1));
  vec2 off2b = rot * (off2 * vec2(-rotC1, rotS1));
  vec2 off2c = rot * (off2 * vec2(rotC1, -rotS1));
  vec2 off2d = rot * (off2 * vec2(-rotC1, -rotS1));
  vec2 off2e = rot * (off2 * vec2(rotS1, rotC1));
  vec2 off2f = rot * (off2 * vec2(-rotS1, rotC1));
  vec2 off2g = rot * (off2 * vec2(rotS1, -rotC1));
  vec2 off2h = rot * (off2 * vec2(-rotS1, -rotC1));

  vec3 c0 = texture(tex, uv).rgb;
  vec3 c1 = texture(tex, uv + off1x).rgb;
  vec3 c2 = texture(tex, uv - off1x).rgb;
  vec3 c3 = texture(tex, uv + off1y).rgb;
  vec3 c4 = texture(tex, uv - off1y).rgb;
  vec3 c5 = texture(tex, uv + off1d1).rgb;
  vec3 c6 = texture(tex, uv + off1d2).rgb;
  vec3 c7 = texture(tex, uv + off1d3).rgb;
  vec3 c8 = texture(tex, uv + off1d4).rgb;
  vec3 c9 = texture(tex, uv + off2a).rgb;
  vec3 c10 = texture(tex, uv + off2b).rgb;
  vec3 c11 = texture(tex, uv + off2c).rgb;
  vec3 c12 = texture(tex, uv + off2d).rgb;
  vec3 c13 = texture(tex, uv + off2e).rgb;
  vec3 c14 = texture(tex, uv + off2f).rgb;
  vec3 c15 = texture(tex, uv + off2g).rgb;
  vec3 c16 = texture(tex, uv + off2h).rgb;

  float w0 = smoothstep(threshold - knee, threshold + knee, max(max(c0.r, c0.g), c0.b));
  float w1 = smoothstep(threshold - knee, threshold + knee, max(max(c1.r, c1.g), c1.b));
  float w2 = smoothstep(threshold - knee, threshold + knee, max(max(c2.r, c2.g), c2.b));
  float w3 = smoothstep(threshold - knee, threshold + knee, max(max(c3.r, c3.g), c3.b));
  float w4 = smoothstep(threshold - knee, threshold + knee, max(max(c4.r, c4.g), c4.b));
  float w5 = smoothstep(threshold - knee, threshold + knee, max(max(c5.r, c5.g), c5.b));
  float w6 = smoothstep(threshold - knee, threshold + knee, max(max(c6.r, c6.g), c6.b));
  float w7 = smoothstep(threshold - knee, threshold + knee, max(max(c7.r, c7.g), c7.b));
  float w8 = smoothstep(threshold - knee, threshold + knee, max(max(c8.r, c8.g), c8.b));
  float w9 = smoothstep(threshold - knee, threshold + knee, max(max(c9.r, c9.g), c9.b));
  float w10 = smoothstep(threshold - knee, threshold + knee, max(max(c10.r, c10.g), c10.b));
  float w11 = smoothstep(threshold - knee, threshold + knee, max(max(c11.r, c11.g), c11.b));
  float w12 = smoothstep(threshold - knee, threshold + knee, max(max(c12.r, c12.g), c12.b));
  float w13 = smoothstep(threshold - knee, threshold + knee, max(max(c13.r, c13.g), c13.b));
  float w14 = smoothstep(threshold - knee, threshold + knee, max(max(c14.r, c14.g), c14.b));
  float w15 = smoothstep(threshold - knee, threshold + knee, max(max(c15.r, c15.g), c15.b));
  float w16 = smoothstep(threshold - knee, threshold + knee, max(max(c16.r, c16.g), c16.b));

  sum += c0 * w0 * 0.20;
  sum += c1 * w1 * 0.07;
  sum += c2 * w2 * 0.07;
  sum += c3 * w3 * 0.07;
  sum += c4 * w4 * 0.07;
  sum += c5 * w5 * 0.06;
  sum += c6 * w6 * 0.06;
  sum += c7 * w7 * 0.06;
  sum += c8 * w8 * 0.06;
  sum += c9 * w9 * 0.04;
  sum += c10 * w10 * 0.04;
  sum += c11 * w11 * 0.04;
  sum += c12 * w12 * 0.04;
  sum += c13 * w13 * 0.03;
  sum += c14 * w14 * 0.03;
  sum += c15 * w15 * 0.03;
  sum += c16 * w16 * 0.03;

  return sum * strength;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixel = 1.0 / resolution;
  float scan = sin((uv.y + time * scanlineSpeed) * resolution.y * scanlineHeight);
  float scanMix = mix(1.0, 0.5 + 0.5 * scan, scanlineIntensity);

  vec2 chroma = vec2(chromaticOffset) * pixel;
  float chromaTime = (sin(time * 0.6) * 0.5 + 0.5);

  float r = texture(inputBuffer, uv + chroma * (0.6 + chromaTime)).r;
  float g = texture(inputBuffer, uv).g;
  float b = texture(inputBuffer, uv - chroma * (0.6 + chromaTime)).b;
  vec3 baseColor = vec3(r, g, b);

  vec3 bloom = bloomSample(inputBuffer, uv, pixel, bloomStrength, bloomRadius, bloomThreshold);
  vec3 bloomSoft = bloomSample(inputBuffer, uv, pixel, bloomSoftStrength, bloomSoftRadius, bloomSoftThreshold);
  vec3 color = baseColor + bloom + bloomSoft;

  float noise = random(uv * resolution.xy * 1.2 + time * 1.3) * 2.0 - 1.0;
  color += noise * noiseIntensity;
  color *= scanMix;

  float vignette = smoothstep(0.9, 0.45, length(uv - 0.5));
  color *= mix(1.0, vignette, vignetteStrength);

  color = mix(color, color * tint, 0.2);
  color = mix(color, baseColor, 0.1);
  color = clamp(color, vec3(0.0), vec3(1.5));

  outputColor = vec4(color, inputColor.a);
}
`;

interface FastVhsParams {
  noiseIntensity?: number;
  scanlineIntensity?: number;
  scanlineHeight?: number;
  scanlineSpeed?: number;
  chromaticOffset?: number;
  bloomStrength?: number;
  bloomThreshold?: number;
  bloomRadius?: number;
  bloomSoftStrength?: number;
  bloomSoftThreshold?: number;
  bloomSoftRadius?: number;
  vignetteStrength?: number;
  tint?: Color | string | number;
}

class FastVhsEffectImpl extends Effect {
  private readonly timeUniform: Uniform;
  private readonly resolutionUniform: Uniform<Vector2>;
  private readonly noiseUniform: Uniform<number>;
  private readonly scanlineUniform: Uniform<number>;
  private readonly chromaUniform: Uniform<number>;
  private readonly bloomUniform: Uniform<number>;
  private readonly bloomThresholdUniform: Uniform<number>;
  private readonly bloomRadiusUniform: Uniform<number>;
  private readonly bloomSoftUniform: Uniform<number>;
  private readonly bloomSoftThresholdUniform: Uniform<number>;
  private readonly bloomSoftRadiusUniform: Uniform<number>;
  private readonly vignetteUniform: Uniform<number>;
  private readonly tintUniform: Uniform<Color>;
  private readonly scanlineSpeedUniform: Uniform<number>;
  private readonly scanlineHeightUniform: Uniform<number>;

  constructor(params: Required<FastVhsParams>) {
    const timeUniform = new Uniform(0);
    const resolutionUniform = new Uniform(new Vector2(1, 1));
    const noiseUniform = new Uniform(params.noiseIntensity);
    const scanlineUniform = new Uniform(params.scanlineIntensity);
    const scanlineSpeedUniform = new Uniform(params.scanlineSpeed);
    const scanlineHeightUniform = new Uniform(params.scanlineHeight);
    const chromaUniform = new Uniform(params.chromaticOffset);
    const bloomUniform = new Uniform(params.bloomStrength);
    const bloomThresholdUniform = new Uniform(params.bloomThreshold);
    const bloomRadiusUniform = new Uniform(params.bloomRadius);
    const bloomSoftUniform = new Uniform(params.bloomSoftStrength);
    const bloomSoftThresholdUniform = new Uniform(params.bloomSoftThreshold);
    const bloomSoftRadiusUniform = new Uniform(params.bloomSoftRadius);
    const vignetteUniform = new Uniform(params.vignetteStrength);
    const tintUniform = new Uniform(new Color(params.tint));

    super("FastVhsEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["time", timeUniform],
        ["resolution", resolutionUniform],
        ["noiseIntensity", noiseUniform],
        ["scanlineIntensity", scanlineUniform],
        ["scanlineSpeed", scanlineSpeedUniform],
        ["scanlineHeight", scanlineHeightUniform],
        ["chromaticOffset", chromaUniform],
        ["bloomStrength", bloomUniform],
        ["bloomThreshold", bloomThresholdUniform],
        ["bloomRadius", bloomRadiusUniform],
        ["bloomSoftStrength", bloomSoftUniform],
        ["bloomSoftThreshold", bloomSoftThresholdUniform],
        ["bloomSoftRadius", bloomSoftRadiusUniform],
        ["vignetteStrength", vignetteUniform],
        ["tint", tintUniform],
      ]),
    });

    this.timeUniform = timeUniform;
    this.resolutionUniform = resolutionUniform;
    this.noiseUniform = noiseUniform;
    this.scanlineUniform = scanlineUniform;
    this.scanlineSpeedUniform = scanlineSpeedUniform;
    this.scanlineHeightUniform = scanlineHeightUniform;
    this.chromaUniform = chromaUniform;
    this.bloomUniform = bloomUniform;
    this.bloomThresholdUniform = bloomThresholdUniform;
    this.bloomRadiusUniform = bloomRadiusUniform;
    this.bloomSoftUniform = bloomSoftUniform;
    this.bloomSoftThresholdUniform = bloomSoftThresholdUniform;
    this.bloomSoftRadiusUniform = bloomSoftRadiusUniform;
    this.vignetteUniform = vignetteUniform;
    this.tintUniform = tintUniform;
  }

  public updateSize(width: number, height: number) {
    this.resolutionUniform.value.set(width, height);
  }

  public updateParams(params: FastVhsParams) {
    if (params.noiseIntensity !== undefined) {
      this.noiseUniform.value = params.noiseIntensity;
    }
    if (params.scanlineIntensity !== undefined) {
      this.scanlineUniform.value = params.scanlineIntensity;
    }
    if (params.scanlineSpeed !== undefined) {
      this.scanlineSpeedUniform.value = params.scanlineSpeed;
    }
    if (params.scanlineHeight !== undefined) {
      this.scanlineHeightUniform.value = params.scanlineHeight;
    }
    if (params.chromaticOffset !== undefined) {
      this.chromaUniform.value = params.chromaticOffset;
    }
    if (params.bloomStrength !== undefined) {
      this.bloomUniform.value = params.bloomStrength;
    }
    if (params.bloomThreshold !== undefined) {
      this.bloomThresholdUniform.value = params.bloomThreshold;
    }
    if (params.bloomRadius !== undefined) {
      this.bloomRadiusUniform.value = params.bloomRadius;
    }
    if (params.bloomSoftStrength !== undefined) {
      this.bloomSoftUniform.value = params.bloomSoftStrength;
    }
    if (params.bloomSoftThreshold !== undefined) {
      this.bloomSoftThresholdUniform.value = params.bloomSoftThreshold;
    }
    if (params.bloomSoftRadius !== undefined) {
      this.bloomSoftRadiusUniform.value = params.bloomSoftRadius;
    }
    if (params.vignetteStrength !== undefined) {
      this.vignetteUniform.value = params.vignetteStrength;
    }
    if (params.tint !== undefined) {
      this.tintUniform.value.set(params.tint as Color | string | number);
    }
  }

  public addTime(delta: number) {
    this.timeUniform.value += delta;
  }
}

type FastVhsEffectProps = FastVhsParams & {
  enabled?: boolean;
};

const defaultParams: Required<FastVhsParams> = {
  noiseIntensity: 0.012,
  scanlineIntensity: 0.4,
  scanlineHeight: 1,
  scanlineSpeed: 0.01,
  chromaticOffset: 0,
  bloomStrength: 0.8,
  bloomThreshold: 0.85,
  bloomRadius: 10.2,
  bloomSoftStrength: 0.8,
  bloomSoftThreshold: 0.2,
  bloomSoftRadius: 30,
  vignetteStrength: 0.45,
  tint: new Color(0.96, 0.72, 1.0),
};

export const FastVhsEffect = ({ enabled = true, ...params }: FastVhsEffectProps) => {
  const effect = useMemo(() => new FastVhsEffectImpl({ ...defaultParams }), []);
  const effectRef = useRef(effect);
  const mergedParams = useMemo<Required<FastVhsParams>>(
    () => ({ ...defaultParams, ...params }),
    [params]
  );

  const { size } = useThree();

  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.updateSize(size.width, size.height);
    }
  }, [size.height, size.width]);

  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.updateParams(mergedParams);
    }
  }, [mergedParams]);

  useFrame((_, delta) => {
    if (!enabled || !effectRef.current) return;
    effectRef.current.addTime(delta);
  });

  return enabled ? <primitive object={effect} /> : null;
};
