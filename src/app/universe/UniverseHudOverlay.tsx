"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { stepDampedSpring } from "@/components/3D/stepDampedSpring";
import type {
  UniverseSectionData,
  UniverseSectionId,
} from "@/data/universeSections";

const HUD_DEPTH = 8.5;
const HUD_PROGRESS_SPRING_FREQUENCY = 10;
const HUD_PROGRESS_SPRING_DAMPING = 0.78;
const HUD_RENDER_ORDER = 1000;
const HUD_TEXTURE_MIN_WIDTH = 1600;
const HUD_TEXTURE_MAX_WIDTH = 2560;
const HUD_TEXTURE_MIN_HEIGHT = 900;
const HUD_TEXTURE_MAX_HEIGHT = 1600;

export const HUD_FONT_OPTIONS = ["alarmclock"] as const;
export type HudFontOption = (typeof HUD_FONT_OPTIONS)[number];

type HudFontConfig = {
  assetPath: string;
  assetFormat: string;
  assetMimeType: string;
  familyName: string;
  fontFamily: string;
  displayScale: number;
  uiScale: number;
  letterSpacing: {
    small: number;
    medium: number;
    large: number;
  };
};

const HUD_FONT_CONFIGS: Record<HudFontOption, HudFontConfig> = {
  alarmclock: {
    assetPath: "/alarm clock.ttf",
    assetFormat: "truetype",
    assetMimeType: "font/ttf",
    familyName: "HudAlarmClock",
    fontFamily: "HudAlarmClock, monospace",
    displayScale: 1.08,
    uiScale: 1.04,
    letterSpacing: {
      small: 2.5,
      medium: 2.9,
      large: 2.3,
    },
  },
  orbitron: {
    assetPath: "/Orbitron-Bold.ttf",
    assetFormat: "truetype",
    assetMimeType: "font/ttf",
    familyName: "HudOrbitron",
    fontFamily: "HudOrbitron, monospace",
    displayScale: 1,
    uiScale: 1,
    letterSpacing: {
      small: 2.1,
      medium: 2.5,
      large: 1.8,
    },
  },
};

const hudFontDataUriCache = new Map<HudFontOption, Promise<string>>();

type SectionInstrumentData = {
  channel: string;
  mode: string;
  widgetTitle: string;
  widgetMode: string;
  metadata: string[];
  waveform: number[];
};

const SECTION_INSTRUMENTS: Record<UniverseSectionId, SectionInstrumentData> = {
  photography: {
    channel: "CH-01",
    mode: "ARCHIVE",
    widgetTitle: "ARCHIVE",
    widgetMode: "FRAME",
    metadata: ["35MM", "ISO 400"],
    waveform: [0.22, 0.41, 0.28, 0.47],
  },
  projects: {
    channel: "CH-02",
    mode: "SIGNAL",
    widgetTitle: "SIGNAL",
    widgetMode: "DIAGN",
    metadata: ["TS", "R3F"],
    waveform: [0.31, 0.58, 0.42, 0.68],
  },
  music: {
    channel: "CH-03",
    mode: "PLAYBACK",
    widgetTitle: "PLAYBACK",
    widgetMode: "LEVEL",
    metadata: ["BASS", "ANLG"],
    waveform: [0.46, 0.22, 0.54, 0.34, 0.62, 0.28],
  },
};

type HudSvgOptions = {
  width: number;
  height: number;
  section: UniverseSectionData;
  instrument: SectionInstrumentData;
  accentHex: string;
  brightAccentHex: string;
  dimAccentHex: string;
  fontOption: HudFontOption;
  fontFaceCss: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function loadHudFontDataUri(fontOption: HudFontOption) {
  const cached = hudFontDataUriCache.get(fontOption);
  if (cached) {
    return cached;
  }

  const config = HUD_FONT_CONFIGS[fontOption];
  const promise = fetch(config.assetPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load HUD font: ${config.assetPath}`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const base64 = arrayBufferToBase64(buffer);
      return `data:${config.assetMimeType};base64,${base64}`;
    });

  hudFontDataUriCache.set(fontOption, promise);
  return promise;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildWavePath(
  values: number[],
  left: number,
  baseline: number,
  width: number,
  height: number,
) {
  if (values.length === 0) {
    return `M ${left} ${baseline}`;
  }

  return values
    .map((value, index) => {
      const x = left + (width * index) / Math.max(values.length - 1, 1);
      const y = baseline - value * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildProjectBars(
  values: number[],
  left: number,
  baseline: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
) {
  const step = width / Math.max(values.length, 1);

  return values
    .map((value, index) => {
      const x = left + step * index + step * 0.18;
      const barWidth = step * 0.44;
      const barHeight = Math.max(12, value * height);
      const color = index % 2 === 0 ? brightAccentHex : dimAccentHex;
      return `<rect x="${x.toFixed(2)}" y="${(baseline - barHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${color}" fill-opacity="${index % 2 === 0 ? "0.9" : "0.55"}" rx="2" />`;
    })
    .join("");
}

function buildPhotographyWidget(
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
) {
  const inset = 28;
  const midX = x + width / 2;
  const midY = y + height / 2;
  return `
    <rect x="${x + 18}" y="${y + 18}" width="${width - 36}" height="${height - 36}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.38" />
    <path d="M ${x} ${y + 28} v ${height - 56} h 42" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.82" />
    <path d="M ${x + width - 52} ${y + 18} h 52 v ${height - 42}" fill="none" stroke="${brightAccentHex}" stroke-width="2" stroke-opacity="0.9" />
    <path d="M ${x + inset} ${midY} H ${x + width - inset}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.38" />
    <path d="M ${midX} ${y + inset} V ${y + height - inset}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.38" />
    <circle cx="${midX}" cy="${midY}" r="6" fill="${brightAccentHex}" fill-opacity="0.9" />
  `;
}

function buildProjectsWidget(
  x: number,
  y: number,
  width: number,
  height: number,
  values: number[],
  brightAccentHex: string,
  dimAccentHex: string,
) {
  const baseline = y + height - 34;
  return `
    <path d="M ${x} ${y + 20} h 34 v ${height - 54}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.7" />
    <path d="M ${x + 22} ${baseline} H ${x + width - 18}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.4" />
    ${buildProjectBars(values, x + 36, baseline, width - 58, height - 64, brightAccentHex, dimAccentHex)}
  `;
}

function buildMusicWidget(
  x: number,
  y: number,
  width: number,
  height: number,
  values: number[],
  brightAccentHex: string,
  dimAccentHex: string,
) {
  const waveLeft = x + 18;
  const waveBaseline = y + height - 46;
  const waveWidth = width - 142;
  const waveHeight = height * 0.42;
  const wavePath = buildWavePath(
    values,
    waveLeft,
    waveBaseline,
    waveWidth,
    waveHeight,
  );
  const scopeCx = x + width - 54;
  const scopeCy = y + height / 2 + 6;
  return `
    <path d="${wavePath}" fill="none" stroke="${brightAccentHex}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M ${waveLeft} ${waveBaseline} H ${waveLeft + waveWidth}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.35" />
    <path d="M ${scopeCx - 34} ${scopeCy} H ${scopeCx + 34}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.35" />
    <path d="M ${scopeCx} ${scopeCy - 34} V ${scopeCy + 34}" fill="none" stroke="${dimAccentHex}" stroke-width="1.5" stroke-opacity="0.35" />
    <path d="M ${scopeCx - 28} ${scopeCy + 8} A 30 30 0 1 1 ${scopeCx + 22} ${scopeCy - 22}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.52" />
    <path d="M ${scopeCx - 12} ${scopeCy + 30} A 18 18 0 0 0 ${scopeCx + 18} ${scopeCy + 6}" fill="none" stroke="${brightAccentHex}" stroke-width="2" stroke-opacity="0.88" />
    <circle cx="${scopeCx}" cy="${scopeCy}" r="5.5" fill="${brightAccentHex}" fill-opacity="0.92" />
  `;
}

function buildWidgetMarkup(
  sectionId: UniverseSectionId,
  instrument: SectionInstrumentData,
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
) {
  if (sectionId === "photography") {
    return buildPhotographyWidget(
      x,
      y,
      width,
      height,
      brightAccentHex,
      dimAccentHex,
    );
  }

  if (sectionId === "projects") {
    return buildProjectsWidget(
      x,
      y,
      width,
      height,
      instrument.waveform,
      brightAccentHex,
      dimAccentHex,
    );
  }

  return buildMusicWidget(
    x,
    y,
    width,
    height,
    instrument.waveform,
    brightAccentHex,
    dimAccentHex,
  );
}

function buildHudSvg({
  width,
  height,
  section,
  instrument,
  accentHex,
  brightAccentHex,
  dimAccentHex,
  fontOption,
  fontFaceCss,
}: HudSvgOptions) {
  const fontConfig = HUD_FONT_CONFIGS[fontOption];
  const marginX = Math.round(width * 0.055);
  const marginY = Math.round(height * 0.085);
  const statusX = width - marginX - 336;
  const statusY = marginY + 24;
  const moduleX = marginX;
  const moduleY = height - marginY - 212;
  const moduleWidth = Math.min(560, width * 0.33);
  const widgetWidth = 304;
  const widgetHeight = 182;
  const widgetX = width - marginX - widgetWidth;
  const widgetY = Math.round(height * 0.52 - widgetHeight / 2);
  const safeLabel = escapeXml(section.label);

  const metadataMarkup = instrument.metadata
    .map((item, index) => {
      const x = moduleX + 44 + index * 156;
      const color = index === 0 ? "#eef3ff" : brightAccentHex;
      return `<text x="${x}" y="${moduleY + 164}" fill="${color}" font-size="20" font-weight="600" letter-spacing="2.2">${escapeXml(item)}</text>`;
    })
    .join("");

  const widgetMarkup = buildWidgetMarkup(
    section.id,
    instrument,
    widgetX,
    widgetY + 34,
    widgetWidth,
    widgetHeight - 34,
    brightAccentHex,
    dimAccentHex,
  );

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <style>
          <![CDATA[
            ${fontFaceCss}
          ]]>
        </style>
        <linearGradient id="moduleFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${accentHex}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g font-family="${fontConfig.fontFamily}" text-rendering="geometricPrecision">
        <g transform="translate(${statusX} ${statusY})">
          <circle cx="8" cy="18" r="6" fill="${brightAccentHex}" fill-opacity="0.95" />
          <text x="26" y="18" fill="#eef3ff" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">SIGNAL</text>
          <text x="164" y="18" fill="${brightAccentHex}" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">TUNING</text>
          <text x="26" y="52" fill="#eef3ff" font-size="${22 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}">${escapeXml(instrument.channel)}</text>
          <text x="134" y="52" fill="${brightAccentHex}" font-size="${22 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}">${escapeXml(instrument.mode)}</text>
          <path d="M 18 76 H 292" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.75" />
        </g>

        <g transform="translate(${moduleX} ${moduleY})">
          <path d="M 0 36 V 172 H 42" fill="none" stroke="${dimAccentHex}" stroke-width="2.5" stroke-opacity="0.82" />
          <path d="M ${moduleWidth - 86} 20 H ${moduleWidth} V 176" fill="none" stroke="${brightAccentHex}" stroke-width="2.5" stroke-opacity="0.86" />
          <path d="M 40 64 H ${moduleWidth - 142}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.55" />
          <rect x="40" y="86" width="${moduleWidth - 148}" height="72" fill="url(#moduleFill)" />
          <text x="42" y="66" fill="#eef3ff" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">CHANNEL</text>
          <text x="226" y="66" fill="${brightAccentHex}" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">${escapeXml(instrument.channel)}</text>
          <text x="42" y="136" fill="${accentHex}" stroke="${brightAccentHex}" stroke-opacity="0.18" stroke-width="5" font-size="${64 * fontConfig.displayScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.large}">${safeLabel}</text>
          <text x="42" y="136" fill="${brightAccentHex}" font-size="${64 * fontConfig.displayScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.large}">${safeLabel}</text>
          ${metadataMarkup}
        </g>

        <g transform="translate(${widgetX} ${widgetY})">
          <text x="${widgetWidth}" y="0" fill="#eef3ff" font-size="${24 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.small}" text-anchor="end">${escapeXml(instrument.widgetTitle)}</text>
          <text x="${widgetWidth}" y="28" fill="${brightAccentHex}" font-size="${20 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}" text-anchor="end">${escapeXml(instrument.widgetMode)}</text>
          ${widgetMarkup}
        </g>
      </g>
    </svg>
  `;
}

type UniverseHudOverlayProps = {
  active: boolean;
  fontOption: HudFontOption;
  section: UniverseSectionData | null;
};

export function UniverseHudOverlay({
  active,
  fontOption,
  section,
}: UniverseHudOverlayProps) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const rootRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const progressRef = useRef(Boolean(section) ? 1 : 0);
  const progressVelocityRef = useRef(0);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const rootPosition = useMemo(() => new THREE.Vector3(), []);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [fontFaceCss, setFontFaceCss] = useState<string | null>(null);

  const instrument = section ? SECTION_INSTRUMENTS[section.id] : null;
  const accent = section?.accent ?? "#b09cff";
  const accentHex = useMemo(() => new THREE.Color(accent).getStyle(), [accent]);
  const brightAccentHex = useMemo(
    () =>
      new THREE.Color(accent).lerp(new THREE.Color("#ffffff"), 0.18).getStyle(),
    [accent],
  );
  const dimAccentHex = useMemo(
    () => new THREE.Color(accent).multiplyScalar(0.72).getStyle(),
    [accent],
  );

  const textureSize = useMemo(() => {
    const pixelRatio =
      typeof window === "undefined"
        ? 1
        : Math.min(window.devicePixelRatio || 1, 2);

    return {
      width: Math.max(
        HUD_TEXTURE_MIN_WIDTH,
        Math.min(HUD_TEXTURE_MAX_WIDTH, Math.round(size.width * pixelRatio)),
      ),
      height: Math.max(
        HUD_TEXTURE_MIN_HEIGHT,
        Math.min(HUD_TEXTURE_MAX_HEIGHT, Math.round(size.height * pixelRatio)),
      ),
    };
  }, [size.height, size.width]);

  const svgMarkup = useMemo(() => {
    if (!section || !instrument || !fontFaceCss) {
      return null;
    }

    return buildHudSvg({
      width: textureSize.width,
      height: textureSize.height,
      section,
      instrument,
      accentHex,
      brightAccentHex,
      dimAccentHex,
      fontOption,
      fontFaceCss,
    });
  }, [
    accentHex,
    brightAccentHex,
    dimAccentHex,
    fontFaceCss,
    fontOption,
    instrument,
    section,
    textureSize.height,
    textureSize.width,
  ]);

  useEffect(() => {
    let isCancelled = false;
    const fontConfig = HUD_FONT_CONFIGS[fontOption];

    loadHudFontDataUri(fontOption)
      .then((dataUri) => {
        if (isCancelled) {
          return;
        }

        setFontFaceCss(`
          @font-face {
            font-family: "${fontConfig.familyName}";
            src: url("${dataUri}") format("${fontConfig.assetFormat}");
          }
        `);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setFontFaceCss(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [fontOption]);

  useEffect(() => {
    if (!svgMarkup) {
      setTexture((current) => {
        current?.dispose();
        textureRef.current = null;
        return null;
      });
      return;
    }

    let isCancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = textureSize.width;
    canvas.height = textureSize.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const svgBlob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      if (isCancelled) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const nextTexture = new THREE.CanvasTexture(canvas);
      nextTexture.colorSpace = THREE.SRGBColorSpace;
      nextTexture.generateMipmaps = false;
      nextTexture.minFilter = THREE.LinearFilter;
      nextTexture.magFilter = THREE.LinearFilter;
      nextTexture.needsUpdate = true;

      setTexture((current) => {
        current?.dispose();
        textureRef.current = nextTexture;
        return nextTexture;
      });

      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [svgMarkup, textureSize.height, textureSize.width]);

  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const targetProgress = active ? 1 : 0;
    const spring = stepDampedSpring(
      progressRef.current,
      progressVelocityRef.current,
      targetProgress,
      delta,
      HUD_PROGRESS_SPRING_FREQUENCY,
      HUD_PROGRESS_SPRING_DAMPING,
    );

    progressRef.current = spring.value;
    progressVelocityRef.current = spring.velocity;

    const reveal = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const pulse = 1.002 + Math.sin(clock.getElapsedTime() * 1.6) * 0.004;

    if (rootRef.current) {
      camera.getWorldDirection(forward).normalize();
      rootPosition.copy(camera.position).addScaledVector(forward, HUD_DEPTH);
      rootRef.current.position.copy(rootPosition);
      rootRef.current.quaternion.copy(camera.quaternion);
      rootRef.current.renderOrder = HUD_RENDER_ORDER;
    }

    if (meshRef.current) {
      const currentViewport = viewport.getCurrentViewport(camera, rootPosition);
      meshRef.current.scale.set(
        currentViewport.width * pulse,
        currentViewport.height * pulse,
        1,
      );
      meshRef.current.renderOrder = HUD_RENDER_ORDER;
      meshRef.current.frustumCulled = false;
      meshRef.current.visible = Boolean(texture) && reveal > 0.02;
    }

    if (materialRef.current) {
      materialRef.current.opacity = reveal * 0.96;
      materialRef.current.transparent = true;
      materialRef.current.depthTest = false;
      materialRef.current.depthWrite = false;
      materialRef.current.toneMapped = false;
    }
  });

  if (!section || !instrument || !texture) {
    return null;
  }

  return (
    <group ref={rootRef}>
      <mesh ref={meshRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
