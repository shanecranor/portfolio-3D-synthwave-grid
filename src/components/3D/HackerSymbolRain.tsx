"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HACKER_RAIN_CONFIG, type HackerRainConfig } from "@/data/hackerRain";

type HackerSymbolRainProps = {
  active: boolean;
  config?: HackerRainConfig;
};

type HackerRainColumn = {
  id: string;
  x: number;
  phase: number;
  speed: number;
  opacityPhase: number;
  opacitySpeed: number;
  glyphs: string[];
};

type HackerRainTextRenderInfo = {
  sdfTexture: THREE.Texture & {
    image: { width: number; height: number };
  };
  sdfGlyphSize: number;
  sdfExponent: number;
  glyphBounds: Float32Array;
  glyphAtlasIndices: Float32Array;
  timings?: Record<string, unknown>;
};

type HackerRainText = THREE.Object3D & {
  geometry: THREE.InstancedBufferGeometry;
  textRenderInfo: HackerRainTextRenderInfo | null;
};

const ignoreRaycast = () => undefined;
const RAIN_PROFILE_QUERY = "profile";

function isRainProfilingEnabled() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has(RAIN_PROFILE_QUERY)
  );
}

function roundProfileValue(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function logRainProfile(event: string, details: Record<string, unknown> = {}) {
  if (!isRainProfilingEnabled()) return;

  console.info(`[universe-perf][rain] ${event}`, {
    atMs: roundProfileValue(performance.now()),
    ...details,
  });
}

function createFirstGpuDrawHandler(
  activeRef: { current: boolean },
  firstGpuDrawLoggedRef: { current: boolean },
  getGlyphCount: () => number,
) {
  return () => {
    if (
      !activeRef.current ||
      firstGpuDrawLoggedRef.current ||
      !isRainProfilingEnabled()
    ) {
      return;
    }

    firstGpuDrawLoggedRef.current = true;
    const drawStartedAt = performance.now();
    logRainProfile("first-gpu-draw-start", {
      glyphCount: getGlyphCount(),
    });

    requestAnimationFrame(() => {
      logRainProfile("first-gpu-draw-frame-complete", {
        frameDurationMs: roundProfileValue(performance.now() - drawStartedAt),
      });
    });
  };
}

function createLayerFadeShaderCode(layerCount: number) {
  return layerCount > 0
    ? Array.from({ length: layerCount }, (_, layerIndex) => {
        const threshold = layerIndex + 0.5;
        return `aRainLayerIndex < ${threshold.toFixed(1)} ? uRainLayerFade${layerIndex}`;
      }).join(" : ") + " : 0.0"
    : "0.0";
}

function createRainVertexShader(layerCount: number) {
  const layerFadeUniforms = Array.from(
    { length: layerCount },
    (_, layerIndex) => `uniform float uRainLayerFade${layerIndex};`,
  ).join("\n");

  return `
uniform float uTime;
uniform float uActive;
uniform float uLayerFadeEasingPower;
uniform float uLayerCount;
uniform float uMaxColumnY;
uniform float uTravelDistance;
uniform float uDepthMotionEnabled;
uniform float uDepthTravelDistance;
uniform float uDepthTravelSpeed;
uniform float uDepthFadeInPortion;
uniform float uDepthFadeOutPortion;
uniform float uColumnOpacityEnabled;
uniform float uColumnFadeInPortion;
uniform float uColumnFadeOutPortion;
uniform float uColumnPulseMin;
uniform float uColumnPulseMax;
uniform vec2 uRainSDFTextureSize;
uniform float uRainSDFGlyphSize;
${layerFadeUniforms}

attribute vec4 aRainGlyphBounds;
attribute float aRainColumnX;
attribute float aRainPhase;
attribute float aRainSpeed;
attribute float aRainOpacityPhase;
attribute float aRainOpacitySpeed;
attribute float aRainLayerIndex;
attribute float aRainLayerZ;
attribute float aRainLayerOpacity;
attribute float aRainDepthPhase;
attribute float aRainDepthSpeed;
attribute float aTroikaGlyphIndex;

varying vec2 vRainGlyphUV;
varying vec4 vRainTextureUVBounds;
varying float vRainTextureChannel;
varying vec2 vRainGlyphDimensions;
varying float vRainOpacity;

const float RAIN_PI = 3.141592653589793;

float rainDepthFade(float progress, float fadeInPortion, float fadeOutPortion) {
  float fadeIn = fadeInPortion > 0.0
    ? smoothstep(0.0, fadeInPortion, progress)
    : 1.0;
  float fadeOut = fadeOutPortion > 0.0
    ? 1.0 - smoothstep(1.0 - fadeOutPortion, 1.0, progress)
    : 1.0;
  return fadeIn * fadeOut;
}

float rainLayerFade() {
  return ${createLayerFadeShaderCode(layerCount)};
}

void main() {
  float layerFade = rainLayerFade();
  float easedLayerFade = uActive > 0.5
    ? pow(clamp(layerFade, 0.0, 1.0), uLayerFadeEasingPower)
    : layerFade;

  float travelDistance = max(uTravelDistance, 0.0001);
  float distance = mod(aRainPhase + uTime * aRainSpeed, travelDistance);
  float columnProgress = distance / travelDistance;
  float columnFade = 1.0;

  if (uColumnOpacityEnabled > 0.5) {
    float travelFade = rainDepthFade(
      columnProgress,
      uColumnFadeInPortion,
      uColumnFadeOutPortion
    );
    float pulseProgress = 0.5 + 0.5 * sin(
      (uTime * aRainOpacitySpeed + aRainOpacityPhase) * RAIN_PI * 2.0
    );
    float pulseFade = mix(uColumnPulseMin, uColumnPulseMax, pulseProgress);
    columnFade = travelFade * pulseFade;
  }

  float depthProgress = 0.0;
  float depthFade = 1.0;
  if (
    uDepthMotionEnabled > 0.5 &&
    uDepthTravelDistance > 0.0 &&
    uDepthTravelSpeed > 0.0
  ) {
    depthProgress = mod(
      aRainDepthPhase +
        (uTime * uDepthTravelSpeed / uDepthTravelDistance) * aRainDepthSpeed,
      1.0
    );
    depthFade = rainDepthFade(
      depthProgress,
      uDepthFadeInPortion,
      uDepthFadeOutPortion
    );
  }

  vec2 glyphPosition = mix(aRainGlyphBounds.xy, aRainGlyphBounds.zw, uv);
  vec3 localPosition = vec3(
    aRainColumnX + glyphPosition.x,
    uMaxColumnY - distance + glyphPosition.y,
    aRainLayerZ + depthProgress * uDepthTravelDistance
  );

  vec4 mvPosition = modelViewMatrix * vec4(localPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vRainGlyphUV = uv;
  vRainGlyphDimensions = vec2(
    aRainGlyphBounds.z - aRainGlyphBounds.x,
    aRainGlyphBounds.w - aRainGlyphBounds.y
  );

  float txCols = uRainSDFTextureSize.x / uRainSDFGlyphSize;
  vec2 txUvPerSquare = uRainSDFGlyphSize / uRainSDFTextureSize;
  float squareIndex = floor(aTroikaGlyphIndex / 4.0);
  vec2 txStartUV = txUvPerSquare * vec2(
    mod(squareIndex, txCols),
    floor(squareIndex / txCols)
  );
  vRainTextureUVBounds = vec4(
    txStartUV,
    txStartUV + txUvPerSquare
  );
  vRainTextureChannel = mod(aTroikaGlyphIndex, 4.0);
  vRainOpacity = aRainLayerOpacity * easedLayerFade * depthFade * columnFade;
}
`;
}

const RAIN_FRAGMENT_SHADER = `
uniform sampler2D uRainSDFTexture;
uniform vec2 uRainSDFTextureSize;
uniform float uRainSDFGlyphSize;
uniform float uRainSDFExponent;
uniform vec3 uRainColor;

varying vec2 vRainGlyphUV;
varying vec4 vRainTextureUVBounds;
varying float vRainTextureChannel;
varying vec2 vRainGlyphDimensions;
varying float vRainOpacity;

float rainSdfValueToSignedDistance(float alpha) {
  float maxDimension = max(vRainGlyphDimensions.x, vRainGlyphDimensions.y);
  float absDist = (1.0 - pow(
    2.0 * (alpha > 0.5 ? 1.0 - alpha : alpha),
    1.0 / uRainSDFExponent
  )) * maxDimension;
  return absDist * (alpha > 0.5 ? -1.0 : 1.0);
}

float rainGlyphUvToSdfValue(vec2 glyphUV) {
  vec2 textureUV = mix(
    vRainTextureUVBounds.xy,
    vRainTextureUVBounds.zw,
    glyphUV
  );
  vec4 rgba = texture2D(uRainSDFTexture, textureUV);
  float channel = floor(vRainTextureChannel + 0.5);
  return channel == 0.0
    ? rgba.r
    : channel == 1.0
      ? rgba.g
      : channel == 2.0
        ? rgba.b
        : rgba.a;
}

float rainGlyphUvToDistance(vec2 uvValue) {
  return rainSdfValueToSignedDistance(rainGlyphUvToSdfValue(uvValue));
}

void main() {
  vec2 clampedGlyphUV = clamp(
    vRainGlyphUV,
    0.5 / uRainSDFGlyphSize,
    1.0 - 0.5 / uRainSDFGlyphSize
  );
  float fragDistance = rainGlyphUvToDistance(clampedGlyphUV);

  #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
    float aaDist = length(fwidth(
      vRainGlyphUV * vRainGlyphDimensions
    )) * 0.5;
  #else
    float aaDist = vRainGlyphDimensions.x / 64.0;
  #endif

  float edgeAlpha = smoothstep(aaDist, -aaDist, fragDistance);
  float alpha = edgeAlpha * vRainOpacity;
  if (alpha <= 0.0) discard;

  gl_FragColor = vec4(uRainColor, alpha);
}
`;

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createColumns(config: HackerRainConfig) {
  const { columns, rows, columnSpacing, rowSpacing } = config.field;
  const characters = config.chars.length > 0 ? config.chars : ["0"];
  const fieldHeight = rows * rowSpacing;
  const streamHeight = Math.max(0, rows - 1) * rowSpacing;
  const travelDistance = fieldHeight + streamHeight;

  return config.layers.map((layer, layerIndex) => {
    const layerSpeed = config.animation.fallSpeed * layer.speedMultiplier;

    return Array.from({ length: columns }, (_, columnIndex) => {
      const seed = (layerIndex + 1) * 1000 + columnIndex;
      const glyphs = Array.from({ length: rows }, (_, rowIndex) => {
        const characterIndex = Math.floor(
          seededRandom(seed + rowIndex * 17) * characters.length,
        );
        return characters[characterIndex] ?? characters[0];
      });

      return {
        id: `${layerIndex}-${columnIndex}`,
        x: (columnIndex - (columns - 1) / 2) * columnSpacing,
        phase: seededRandom(seed + 31) * travelDistance,
        speed:
          layerSpeed *
          THREE.MathUtils.lerp(0.75, 1.25, seededRandom(seed + 47)),
        opacityPhase: seededRandom(seed + 59),
        opacitySpeed:
          config.columnOpacity.pulseSpeed *
          THREE.MathUtils.lerp(0.8, 1.2, seededRandom(seed + 71)),
        glyphs,
      } satisfies HackerRainColumn;
    });
  });
}

function createRainMaterial(
  info: HackerRainTextRenderInfo,
  config: HackerRainConfig,
) {
  const uniforms: Record<string, THREE.IUniform<unknown>> = {
    uRainSDFTexture: { value: info.sdfTexture },
    uRainSDFTextureSize: {
      value: new THREE.Vector2(
        info.sdfTexture.image.width,
        info.sdfTexture.image.height,
      ),
    },
    uRainSDFGlyphSize: { value: info.sdfGlyphSize },
    uRainSDFExponent: { value: info.sdfExponent },
    uRainColor: { value: new THREE.Color(config.color) },
    uTime: { value: 0 },
    uActive: { value: 0 },
    uLayerFadeEasingPower: {
      value: config.animation.fadeInEasingPower,
    },
    uLayerCount: { value: config.layers.length },
    uMaxColumnY: {
      value:
        (config.field.rows * config.field.rowSpacing) / 2 +
        (Math.max(0, config.field.rows - 1) * config.field.rowSpacing) / 2,
    },
    uTravelDistance: {
      value:
        config.field.rows * config.field.rowSpacing +
        Math.max(0, config.field.rows - 1) * config.field.rowSpacing,
    },
    uDepthMotionEnabled: { value: config.depthMotion.enabled ? 1 : 0 },
    uDepthTravelDistance: { value: config.depthMotion.travelDistance },
    uDepthTravelSpeed: { value: config.depthMotion.travelSpeed },
    uDepthFadeInPortion: { value: config.depthMotion.fadeInPortion },
    uDepthFadeOutPortion: { value: config.depthMotion.fadeOutPortion },
    uColumnOpacityEnabled: { value: config.columnOpacity.enabled ? 1 : 0 },
    uColumnFadeInPortion: { value: config.columnOpacity.fadeInPortion },
    uColumnFadeOutPortion: { value: config.columnOpacity.fadeOutPortion },
    uColumnPulseMin: { value: config.columnOpacity.pulseMin },
    uColumnPulseMax: { value: config.columnOpacity.pulseMax },
  };

  for (let layerIndex = 0; layerIndex < config.layers.length; layerIndex += 1) {
    uniforms[`uRainLayerFade${layerIndex}`] = { value: 0 };
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: createRainVertexShader(config.layers.length),
    fragmentShader: RAIN_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false,
  });

  return material;
}

type HackerRainAtlasGlyph = {
  atlasIndex: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function prepareRainGeometry(
  atlasText: HackerRainText,
  atlasCharacters: string[],
  columnsByLayer: HackerRainColumn[][],
  config: HackerRainConfig,
) {
  const info = atlasText.textRenderInfo;
  if (!info) return;

  const atlasGlyphs = new Map<string, HackerRainAtlasGlyph>();
  for (const [glyphIndex, character] of atlasCharacters.entries()) {
    const boundsOffset = glyphIndex * 4;
    const atlasIndex = info.glyphAtlasIndices[glyphIndex];
    if (atlasIndex === undefined) continue;

    atlasGlyphs.set(character, {
      atlasIndex,
      minX: info.glyphBounds[boundsOffset],
      minY: info.glyphBounds[boundsOffset + 1],
      maxX: info.glyphBounds[boundsOffset + 2],
      maxY: info.glyphBounds[boundsOffset + 3],
    });
  }

  const fallbackGlyph = atlasGlyphs.values().next().value as
    | HackerRainAtlasGlyph
    | undefined;
  if (!fallbackGlyph) return;

  const glyphCount = columnsByLayer.reduce(
    (count, layerColumns) =>
      count +
      layerColumns.reduce(
        (layerCount, column) => layerCount + column.glyphs.length,
        0,
      ),
    0,
  );
  const glyphBounds = new Float32Array(glyphCount * 4);
  const glyphAtlasIndices = new Float32Array(glyphCount);
  const columnX = new Float32Array(glyphCount);
  const phase = new Float32Array(glyphCount);
  const speed = new Float32Array(glyphCount);
  const opacityPhase = new Float32Array(glyphCount);
  const opacitySpeed = new Float32Array(glyphCount);
  const layerIndex = new Float32Array(glyphCount);
  const layerZ = new Float32Array(glyphCount);
  const layerOpacity = new Float32Array(glyphCount);
  const depthPhase = new Float32Array(glyphCount);
  const depthSpeed = new Float32Array(glyphCount);

  let glyphOffset = 0;
  for (const [currentLayerIndex, layerColumns] of columnsByLayer.entries()) {
    const layer = config.layers[currentLayerIndex];

    for (const column of layerColumns) {
      for (const [rowIndex, character] of column.glyphs.entries()) {
        const glyph = atlasGlyphs.get(character) ?? fallbackGlyph;
        const targetOffset = glyphOffset * 4;
        const glyphCenterX = (glyph.minX + glyph.maxX) / 2;
        const glyphCenterY = (glyph.minY + glyph.maxY) / 2;
        const rowCenterY =
          ((config.field.rows - 1) / 2 - rowIndex) * config.field.rowSpacing;

        glyphBounds[targetOffset] = glyph.minX - glyphCenterX;
        glyphBounds[targetOffset + 1] = rowCenterY + glyph.minY - glyphCenterY;
        glyphBounds[targetOffset + 2] = glyph.maxX - glyphCenterX;
        glyphBounds[targetOffset + 3] = rowCenterY + glyph.maxY - glyphCenterY;
        glyphAtlasIndices[glyphOffset] = glyph.atlasIndex;

        columnX[glyphOffset] = column.x;
        phase[glyphOffset] = column.phase;
        speed[glyphOffset] = column.speed;
        opacityPhase[glyphOffset] = column.opacityPhase;
        opacitySpeed[glyphOffset] = column.opacitySpeed;
        layerIndex[glyphOffset] = currentLayerIndex;
        layerZ[glyphOffset] = layer.z;
        layerOpacity[glyphOffset] = layer.opacity;
        depthPhase[glyphOffset] =
          layer.depthPhase ??
          currentLayerIndex / Math.max(1, columnsByLayer.length);
        depthSpeed[glyphOffset] = layer.depthSpeedMultiplier ?? 1;

        glyphOffset += 1;
      }
    }
  }

  const sourceGeometry = atlasText.geometry;
  const geometry = new THREE.InstancedBufferGeometry();
  for (const attributeName of ["position", "normal", "uv"]) {
    const attribute = sourceGeometry.getAttribute(attributeName);
    if (attribute) geometry.setAttribute(attributeName, attribute.clone());
  }
  const index = sourceGeometry.getIndex();
  if (index) geometry.setIndex(index.clone());

  geometry.setAttribute(
    "aTroikaGlyphIndex",
    new THREE.InstancedBufferAttribute(glyphAtlasIndices, 1),
  );

  geometry.setAttribute(
    "aRainGlyphBounds",
    new THREE.InstancedBufferAttribute(glyphBounds, 4),
  );
  geometry.setAttribute(
    "aRainColumnX",
    new THREE.InstancedBufferAttribute(columnX, 1),
  );
  geometry.setAttribute(
    "aRainPhase",
    new THREE.InstancedBufferAttribute(phase, 1),
  );
  geometry.setAttribute(
    "aRainSpeed",
    new THREE.InstancedBufferAttribute(speed, 1),
  );
  geometry.setAttribute(
    "aRainOpacityPhase",
    new THREE.InstancedBufferAttribute(opacityPhase, 1),
  );
  geometry.setAttribute(
    "aRainOpacitySpeed",
    new THREE.InstancedBufferAttribute(opacitySpeed, 1),
  );
  geometry.setAttribute(
    "aRainLayerIndex",
    new THREE.InstancedBufferAttribute(layerIndex, 1),
  );
  geometry.setAttribute(
    "aRainLayerZ",
    new THREE.InstancedBufferAttribute(layerZ, 1),
  );
  geometry.setAttribute(
    "aRainLayerOpacity",
    new THREE.InstancedBufferAttribute(layerOpacity, 1),
  );
  geometry.setAttribute(
    "aRainDepthPhase",
    new THREE.InstancedBufferAttribute(depthPhase, 1),
  );
  geometry.setAttribute(
    "aRainDepthSpeed",
    new THREE.InstancedBufferAttribute(depthSpeed, 1),
  );

  geometry.instanceCount = glyphOffset;

  const maxColumnY =
    (config.field.rows * config.field.rowSpacing) / 2 +
    (Math.max(0, config.field.rows - 1) * config.field.rowSpacing) / 2;
  const travelDistance =
    config.field.rows * config.field.rowSpacing +
    Math.max(0, config.field.rows - 1) * config.field.rowSpacing;
  const halfRowSpan =
    (Math.max(0, config.field.rows - 1) * config.field.rowSpacing) / 2;
  const halfFieldWidth =
    ((config.field.columns - 1) * config.field.columnSpacing) / 2 +
    config.field.columnSpacing;
  const glyphPadding = config.font.size;
  const minLayerZ = Math.min(...config.layers.map((layer) => layer.z), 0);
  const maxLayerZ = Math.max(...config.layers.map((layer) => layer.z), 0);
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(
      -halfFieldWidth - glyphPadding,
      maxColumnY - travelDistance - halfRowSpan - glyphPadding,
      minLayerZ - glyphPadding,
    ),
    new THREE.Vector3(
      halfFieldWidth + glyphPadding,
      maxColumnY + halfRowSpan + glyphPadding,
      maxLayerZ + config.depthMotion.travelDistance + glyphPadding,
    ),
  );
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(
    new THREE.Sphere(),
  );

  return geometry;
}

export function HackerSymbolRain({
  active,
  config = HACKER_RAIN_CONFIG,
}: HackerSymbolRainProps) {
  const rootRef = useRef<THREE.Group>(null);
  const activeRef = useRef(active);
  const firstGpuDrawLoggedRef = useRef(false);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const initialActiveRef = useRef(active);
  const layerFadeRefs = useRef<number[]>(
    config.layers.map(() => (active ? 1 : 0)),
  );
  const [textRenderInfo, setTextRenderInfo] =
    useState<HackerRainTextRenderInfo | null>(null);
  const [rainGeometry, setRainGeometry] =
    useState<THREE.InstancedBufferGeometry | null>(null);
  const atlasCharacters = useMemo(() => {
    const sourceCharacters = config.chars.length > 0 ? config.chars : ["0"];
    return Array.from(new Set(sourceCharacters));
  }, [config.chars]);
  const atlasText = useMemo(() => atlasCharacters.join(""), [atlasCharacters]);
  const columnsByLayer = useMemo(() => createColumns(config), [config]);
  const rainMaterial = useMemo(
    () => (textRenderInfo ? createRainMaterial(textRenderInfo, config) : null),
    [config, textRenderInfo],
  );
  const rainMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  useEffect(() => {
    logRainProfile("columns-ready", {
      columns: config.field.columns,
      rows: config.field.rows,
      layers: config.layers.length,
    });
  }, [config]);
  useEffect(() => {
    logRainProfile("atlas-ready", {
      characters: atlasText.length,
    });
  }, [atlasText]);
  useEffect(() => {
    if (!rainMaterial || !textRenderInfo) return;

    logRainProfile("material-ready", {
      glyphCount: textRenderInfo.glyphAtlasIndices.length,
      layerCount: config.layers.length,
      vertexShaderCharacters: rainMaterial.vertexShader.length,
      fragmentShaderCharacters: rainMaterial.fragmentShader.length,
    });
  }, [config, rainMaterial, textRenderInfo]);
  useEffect(() => {
    rainMaterialRef.current = rainMaterial;
    return () => {
      if (rainMaterialRef.current === rainMaterial) {
        rainMaterialRef.current = null;
      }
      rainMaterial?.dispose();
    };
  }, [rainMaterial]);
  useEffect(() => {
    return () => {
      rainGeometry?.dispose();
    };
  }, [rainGeometry]);
  useEffect(() => {
    if (!rainGeometry || !rainMaterial) return;

    logRainProfile("rain-ready", {
      glyphCount: rainGeometry.instanceCount,
      attributes: Object.keys(rainGeometry.attributes).length,
    });
  }, [rainGeometry, rainMaterial]);
  useEffect(() => {
    logRainProfile("mounted", {
      active: initialActiveRef.current,
      columns: config.field.columns,
      rows: config.field.rows,
      layers: config.layers.length,
    });
  }, [config]);
  useEffect(() => {
    logRainProfile("state-change", {
      active,
      hasGeometry: Boolean(rainGeometry),
      hasMaterial: Boolean(rainMaterial),
    });
  }, [active, rainGeometry, rainMaterial]);
  const rainMesh = useMemo(() => {
    if (!rainGeometry || !rainMaterial) return null;

    const mesh = new THREE.Mesh(rainGeometry, rainMaterial);
    mesh.frustumCulled = true;
    mesh.renderOrder = 2;
    mesh.raycast = ignoreRaycast;
    return mesh;
  }, [rainGeometry, rainMaterial]);
  useEffect(() => {
    if (!rainMesh) return;

    const handleBeforeRender = createFirstGpuDrawHandler(
      activeRef,
      firstGpuDrawLoggedRef,
      () => rainGeometry?.instanceCount ?? 0,
    );

    // Three exposes onBeforeRender as an imperative callback on Object3D.
    // eslint-disable-next-line react-hooks/immutability
    rainMesh.onBeforeRender = handleBeforeRender;
    return () => {
      if (rainMesh.onBeforeRender === handleBeforeRender) {
        rainMesh.onBeforeRender = () => undefined;
      }
    };
  }, [rainGeometry, rainMesh]);

  const handleTextSync = useCallback(
    (text: HackerRainText) => {
      if (!text.textRenderInfo) return;

      const profileEnabled = isRainProfilingEnabled();
      const startedAt = profileEnabled ? performance.now() : 0;
      logRainProfile("text-sync-complete", {
        glyphCount: text.textRenderInfo.glyphAtlasIndices.length,
        troikaTimings: text.textRenderInfo.timings ?? "unavailable",
      });
      const geometry = prepareRainGeometry(
        text,
        atlasCharacters,
        columnsByLayer,
        config,
      );
      if (!geometry) return;

      if (profileEnabled) {
        logRainProfile("geometry-ready", {
          durationMs: roundProfileValue(performance.now() - startedAt),
          glyphCount: geometry.instanceCount,
          attributes: Object.keys(geometry.attributes).length,
        });
      }

      setTextRenderInfo(text.textRenderInfo);
      setRainGeometry(geometry);
    },
    [atlasCharacters, columnsByLayer, config],
  );

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    let maxFade = 0;
    for (const [layerIndex, layer] of config.layers.entries()) {
      const fadeSpeed =
        (active
          ? config.animation.fadeInSpeed
          : config.animation.fadeOutSpeed) *
        (active
          ? (layer.fadeInSpeedMultiplier ?? 1)
          : (layer.fadeOutSpeedMultiplier ?? 1));
      const targetFade = active ? 1 : 0;
      const nextFade = THREE.MathUtils.damp(
        layerFadeRefs.current[layerIndex],
        targetFade,
        fadeSpeed,
        delta,
      );

      layerFadeRefs.current[layerIndex] = nextFade;
      maxFade = Math.max(maxFade, nextFade);
    }

    root.visible = maxFade > 0.001;
    root.scale.setScalar(config.scale);

    if (!active && layerFadeRefs.current.every((fade) => fade <= 0.001)) {
      root.visible = false;
      return;
    }

    const material = rainMaterialRef.current;
    if (material) {
      material.uniforms.uTime.value = clock.elapsedTime;
      material.uniforms.uActive.value = active ? 1 : 0;

      for (const [layerIndex] of config.layers.entries()) {
        material.uniforms[`uRainLayerFade${layerIndex}`].value =
          layerFadeRefs.current[layerIndex];
      }
    }
  });

  return (
    <group ref={rootRef} position={config.position} rotation={config.rotation}>
      {/* Troika builds the SDF atlas; the rain instances are generated below. */}
      <Text
        key={atlasText}
        visible={false}
        font={config.font.path}
        fontSize={config.font.size}
        lineHeight={config.field.rowSpacing / config.font.size}
        anchorX={0}
        anchorY={0}
        characters={atlasText}
        onSync={(text) => handleTextSync(text as unknown as HackerRainText)}
      >
        {atlasText}
      </Text>
      {rainMesh ? <primitive object={rainMesh} /> : null}
    </group>
  );
}
