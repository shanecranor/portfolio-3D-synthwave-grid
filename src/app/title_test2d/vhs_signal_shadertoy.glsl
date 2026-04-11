// More signal-leaning VHS / composite emulation for ShaderToy.
//
// Channel setup:
// iChannel0: source image / video
// iChannel1: tileable monochrome or RGB noise texture
//
// This version is authored around a fixed low video resolution and tries to
// feel more like unstable analog playback than a generic "glitch" shader.

#define V vec2(0.0, 1.0)
#define PI 3.14159265
#define HUGE 1E9
#define VHSRES vec2(320.0, 240.0)
#define saturate(i) clamp(i, 0.0, 1.0)
#define lofi(i,d) (floor((i) / (d)) * (d))
#define validuv(v) (abs((v).x - 0.5) < 0.5 && abs((v).y - 0.5) < 0.5)

// Preview-friendly tuning block.
#define LUMA_SAMPLES 7
#define CHROMA_SAMPLES 5
#define TIMEBASE_STRENGTH 1.0
#define CHROMA_BLEED 2.3
#define HEADSWITCH_STRENGTH 0.9
#define DROPOUT_STRENGTH 1.0
#define NOISE_STRENGTH 0.65

float v2random(vec2 uv) {
  return texture(iChannel1, fract(uv)).x;
}

vec3 v3random(vec2 uv) {
  return texture(iChannel1, fract(uv)).xyz;
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
  if (!validuv(uv)) {
    return vec3(0.03, 0.03, 0.035);
  }

  // Quantize sampling to a low video grid so the effect scales like VHS.
  vec2 quv = (floor(uv * VHSRES) + 0.5) / VHSRES;
  return texture(iChannel0, quv).xyz;
}

float trackingWarp(float y, float time) {
  float slowDrift = v2random(vec2(floor(time * 0.35) * 0.013, 0.17)) * 2.0 - 1.0;
  float lineLfo = sin(y * PI * 2.0 * 1.25 + time * 0.9 + slowDrift * 1.7);
  float lineNoise = v2random(vec2(y * 0.85, time * 0.11)) * 2.0 - 1.0;
  return (slowDrift * 1.25 + lineLfo * 0.8 + lineNoise * 0.45) * 0.75;
}

float lineTimebaseOffset(float y, float time) {
  float coarse = v2random(vec2(y * 0.21, floor(time * 1.4) * 0.031)) * 2.0 - 1.0;
  float medium = v2random(vec2(y * 2.7, time * 0.7)) * 2.0 - 1.0;
  float fine = v2random(vec2(y * 24.0, floor(time * 16.0) * 0.071)) * 2.0 - 1.0;
  float wobble = sin(y * PI * 2.0 * 2.4 + time * 2.1 + coarse * 2.2);
  return TIMEBASE_STRENGTH * (coarse * 2.5 + medium * 1.0 + fine * 0.35 + wobble * 0.85);
}

float chromaPhaseError(float y, float time) {
  float phaseJump = v2random(vec2(floor(time * 2.0) * 0.047, y * 1.8)) * 2.0 - 1.0;
  float flutter = v2random(vec2(y * 6.3, time * 0.55)) * 2.0 - 1.0;
  return phaseJump * 0.14 + flutter * 0.045;
}

float headSwitchMask(float y, float time) {
  float band = smoothstep(1.0 - 16.0 / VHSRES.y, 1.0 - 8.0 / VHSRES.y, y);
  float flicker = 0.8 + 0.2 * v2random(vec2(floor(time * 30.0) * 0.019, 0.23));
  return band * flicker;
}

float dropoutMask(vec2 uv, float time) {
  float lineId = floor(uv.y * VHSRES.y);
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
  float texel = 1.0 / VHSRES.x;
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
  float texel = 1.0 / VHSRES.x;
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
  float chromaLag = CHROMA_BLEED * (0.85 + 0.3 * v2random(vec2(uv.y * 3.1, floor(time * 2.0) * 0.083)));
  float chromaBlur = 1.5 + 0.9 * abs(phase) * 10.0;

  float y = sampleLuma(uv);
  vec2 iq = sampleChromaIQ(uv, chromaLag, chromaBlur);
  iq = rotate2D(phase) * iq;

  return vec3(y, iq);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / iResolution.xy;
  float time = iTime;

  // Work on a fixed low-resolution coordinate system even when previewing at a
  // different viewport size.
  vec2 vhsUv = (floor(uv * VHSRES) + 0.5) / VHSRES;

  float verticalDrift = trackingWarp(vhsUv.y, time);
  float lineOffset = lineTimebaseOffset(vhsUv.y, time);
  float headSwitch = headSwitchMask(vhsUv.y, time);

  float headSwitchShift = HEADSWITCH_STRENGTH *
    headSwitch *
    ((v2random(vec2(floor(vhsUv.y * VHSRES.y) * 0.013, floor(time * 30.0) * 0.17)) * 2.0 - 1.0) * 9.0);

  vec2 sampleUv = vhsUv;
  sampleUv.y += verticalDrift / VHSRES.y;
  sampleUv.x += (lineOffset + headSwitchShift) / VHSRES.x;

  vec3 yiq = sampleCompositeLike(sampleUv, time);

  // Head switching band: noisier, slightly darker, weaker chroma lock.
  float hsNoise = v2random(vec2(sampleUv.x * 7.0 + time * 4.0, sampleUv.y * 43.0));
  yiq.x += (hsNoise - 0.5) * 0.12 * headSwitch * HEADSWITCH_STRENGTH;
  yiq.yz *= 1.0 - headSwitch * 0.45 * HEADSWITCH_STRENGTH;
  yiq.x *= 1.0 - headSwitch * 0.12 * HEADSWITCH_STRENGTH;

  // Tape dropouts: chroma collapses first, luma clips or washes.
  float dropout = dropoutMask(sampleUv, time) * DROPOUT_STRENGTH;
  if (dropout > 0.0) {
    float spark = v2random(vec2(sampleUv.x * 15.0 + time * 23.0, floor(sampleUv.y * VHSRES.y) * 0.031));
    yiq.x = mix(yiq.x, 0.86 + spark * 0.28, dropout * 0.85);
    yiq.yz *= 1.0 - dropout;
  }

  // Occasional crease / flagging event: rare and localized, not always on.
  float creaseEvent = smoothstep(0.88, 0.985, v2random(vec2(floor(time * 1.7) * 0.053, 0.91)));
  float creaseLine = smoothstep(0.65, 0.98, v2random(vec2(vhsUv.y * 5.7, floor(time * 12.0) * 0.067)));
  float crease = creaseEvent * creaseLine;
  if (crease > 0.0) {
    float whiteSpeck = v2random(vec2(sampleUv * vec2(13.0, 47.0) + time * vec2(9.0, 2.0)));
    yiq.x = mix(yiq.x, 1.0 + whiteSpeck * 0.25, crease * smoothstep(0.82, 1.0, whiteSpeck) * 0.8);
  }

  // Mild RF / gain noise. Mostly luma, very little chroma noise.
  float gain = 0.98 + 0.05 * (v2random(vec2(floor(time * 4.0) * 0.031, 0.13)) - 0.5);
  float rf = v2random(vec2(sampleUv.x * 55.0 + time * 21.0, sampleUv.y * 3.3 + time * 1.7)) - 0.5;
  yiq.x = yiq.x * gain + rf * 0.035 * NOISE_STRENGTH;
  yiq.yz += (v3random(vec2(sampleUv.y * 9.0, time * 0.9)).xy - 0.5) * 0.01 * NOISE_STRENGTH;

  // Mild final analog bias: slightly crushed chroma and softer whites.
  yiq = vec3(0.02, -0.01, 0.0) + yiq * vec3(0.98, 0.92, 0.92);

  vec3 col = yiq2rgb(yiq);
  col = saturate(col);
  col = pow(col, vec3(1.02));

  fragColor = vec4(col, 1.0);
}
