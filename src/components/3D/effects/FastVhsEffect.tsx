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
uniform float vignetteStrength;
uniform vec3 tint;
uniform float scanlineSpeed;
uniform float scanlineHeight;

float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 bloomSample(sampler2D tex, vec2 uv, vec2 pixel, float strength) {
  vec3 sum = texture(tex, uv).rgb * 0.4;
  sum += texture(tex, uv + pixel * vec2(1.5, 0.0)).rgb * 0.15;
  sum += texture(tex, uv - pixel * vec2(1.5, 0.0)).rgb * 0.15;
  sum += texture(tex, uv + pixel * vec2(0.0, 1.5)).rgb * 0.1;
  sum += texture(tex, uv - pixel * vec2(0.0, 1.5)).rgb * 0.1;
  sum += texture(tex, uv + pixel * vec2(1.2, 1.2)).rgb * 0.05;
  sum += texture(tex, uv - pixel * vec2(1.2, 1.2)).rgb * 0.05;
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

  vec3 bloom = bloomSample(inputBuffer, uv, pixel * 2.0, bloomStrength);
  vec3 color = baseColor + bloom;

  float noise = random(uv * resolution.xy * 1.2 + time * 1.3) * 2.0 - 1.0;
  color += noise * noiseIntensity;
  color *= scanMix;

  float vignette = smoothstep(0.9, 0.45, length(uv - 0.5));
  color *= mix(1.0, vignette, vignetteStrength);

  color = mix(color, color * tint, 0.2);
  color = mix(color, baseColor, 0.1);
  color = clamp(color, vec3(0.0), vec3(1.25));

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
  bloomStrength: 2,
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
