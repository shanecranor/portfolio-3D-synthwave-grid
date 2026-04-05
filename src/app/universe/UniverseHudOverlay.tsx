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
const HUD_SURGE_SPRING_FREQUENCY = 13;
const HUD_SURGE_SPRING_DAMPING = 0.68;
const HUD_RENDER_ORDER = 1000;
const HUD_TEXTURE_MIN_WIDTH = 1600;
const HUD_TEXTURE_MAX_WIDTH = 2560;
const HUD_TEXTURE_MIN_HEIGHT = 900;
const HUD_TEXTURE_MAX_HEIGHT = 1600;

export const HUD_FONT_OPTIONS = ["alarmclock", "orbitron"] as const;
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
  secondaryWaveform: number[];
  markers: number[];
  levelMeters: number[];
};

const SECTION_INSTRUMENTS: Record<UniverseSectionId, SectionInstrumentData> = {
  photography: {
    channel: "CH-01",
    mode: "ARCHIVE",
    widgetTitle: "ARCHIVE",
    widgetMode: "FRAME",
    metadata: ["35MM", "F1.8", "ISO 800"],
    waveform: [0.18, 0.36, 0.58, 0.33, 0.49, 0.24],
    secondaryWaveform: [0.21, 0.26, 0.41, 0.29, 0.36, 0.22],
    markers: [0.16, 0.36, 0.64, 0.84],
    levelMeters: [0.18, 0.42, 0.62, 0.38, 0.22],
  },
  projects: {
    channel: "CH-02",
    mode: "SYSTEM",
    widgetTitle: "SYSTEM",
    widgetMode: "DIAGN",
    metadata: ["R3F", "TS", "NODE"],
    waveform: [0.22, 0.44, 0.31, 0.58, 0.4, 0.7, 0.48],
    secondaryWaveform: [0.16, 0.31, 0.24, 0.39, 0.35, 0.5, 0.3],
    markers: [0.12, 0.28, 0.52, 0.74, 0.9],
    levelMeters: [0.24, 0.52, 0.76, 0.48, 0.62, 0.34],
  },
  music: {
    channel: "CH-03",
    mode: "PLAYBACK",
    widgetTitle: "PLAYBACK",
    widgetMode: "LEVEL",
    metadata: ["BASS", "120B", "TAPE"],
    waveform: [0.18, 0.56, 0.26, 0.66, 0.32, 0.61, 0.29, 0.48],
    secondaryWaveform: [0.12, 0.34, 0.18, 0.48, 0.24, 0.44, 0.16, 0.3],
    markers: [0.08, 0.22, 0.37, 0.54, 0.7, 0.86],
    levelMeters: [0.62, 0.48, 0.76, 0.54, 0.38, 0.68],
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
  surging: boolean;
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

function formatNumber(value: number) {
  return Number(value.toFixed(2));
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
      return `${index === 0 ? "M" : "L"} ${formatNumber(x)} ${formatNumber(y)}`;
    })
    .join(" ");
}

function buildHorizontalLineSet(
  markers: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity: number,
) {
  return markers
    .map((marker, index) => {
      const lineY = y + marker * height;
      const inset = 18 + (index % 3) * 22;
      return `<path d="M ${formatNumber(x + inset)} ${formatNumber(lineY)} H ${formatNumber(x + width - inset)}" fill="none" stroke="${color}" stroke-width="1.25" stroke-opacity="${opacity}" />`;
    })
    .join("");
}

function buildVerticalMeterBars(
  values: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
  surgeBoost: number,
) {
  const step = width / Math.max(values.length, 1);

  return values
    .map((value, index) => {
      const meterHeight = Math.max(16, value * height);
      const barWidth = step * 0.5;
      const barX = x + step * index + step * 0.24;
      const color = index % 2 === 0 ? brightAccentHex : dimAccentHex;
      const opacity = 0.42 + value * 0.38 + surgeBoost * 0.12;
      return `
        <rect x="${formatNumber(barX)}" y="${formatNumber(y)}" width="${formatNumber(barWidth)}" height="${formatNumber(height)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.22" rx="3" />
        <rect x="${formatNumber(barX)}" y="${formatNumber(y + height - meterHeight)}" width="${formatNumber(barWidth)}" height="${formatNumber(meterHeight)}" fill="${color}" fill-opacity="${formatNumber(opacity)}" rx="2.5" />
      `;
    })
    .join("");
}

function buildCircleMarkers(
  markers: number[],
  x: number,
  y: number,
  width: number,
  pathValues: number[],
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
) {
  return markers
    .map((marker, index) => {
      const cx = x + marker * width;
      const sampleIndex = Math.min(
        pathValues.length - 1,
        Math.max(0, Math.round(marker * Math.max(pathValues.length - 1, 1))),
      );
      const cy = y - pathValues[sampleIndex] * height;
      const radius = index % 2 === 0 ? 4.6 : 3.2;
      return `
        <circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${radius}" fill="${index % 2 === 0 ? brightAccentHex : dimAccentHex}" fill-opacity="${index % 2 === 0 ? "0.94" : "0.72"}" />
        <circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${radius + 6}" fill="none" stroke="${dimAccentHex}" stroke-width="1" stroke-opacity="0.18" />
      `;
    })
    .join("");
}

function buildPhotographyWidget(
  instrument: SectionInstrumentData,
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
  surgeBoost: number,
) {
  const innerX = x + 22;
  const innerY = y + 18;
  const innerWidth = width - 44;
  const innerHeight = height - 36;
  const midX = x + width / 2;
  const midY = y + height / 2;
  const focusWidth = width * 0.32;
  const focusHeight = height * 0.28;
  const frameInset = 18 + surgeBoost * 8;
  const meterWidth = 56;
  const meterX = x + width - meterWidth - 12;
  const meterY = y + 26;
  const meterHeight = height - 52;
  const shutterPath = buildWavePath(
    instrument.secondaryWaveform,
    x + 26,
    y + height - 20,
    width * 0.44,
    height * 0.16,
  );

  const focusBrackets = instrument.markers
    .slice(1, 3)
    .map((marker, index) => {
      const offset = (marker - 0.5) * width * 0.28;
      const bracketX = midX + offset;
      const bracketTop = midY - focusHeight / 2 + index * 8;
      const bracketBottom = midY + focusHeight / 2 - index * 8;
      const bracketInset = 18 + index * 8;
      return `
        <path d="M ${formatNumber(bracketX - bracketInset)} ${formatNumber(bracketTop)} h 22 v 22" fill="none" stroke="${brightAccentHex}" stroke-width="2" stroke-opacity="${formatNumber(0.72 + surgeBoost * 0.15)}" />
        <path d="M ${formatNumber(bracketX + bracketInset)} ${formatNumber(bracketBottom)} h -22 v -22" fill="none" stroke="${brightAccentHex}" stroke-width="2" stroke-opacity="${formatNumber(0.72 + surgeBoost * 0.15)}" />
      `;
    })
    .join("");

  return `
    <rect x="${formatNumber(innerX)}" y="${formatNumber(innerY)}" width="${formatNumber(innerWidth)}" height="${formatNumber(innerHeight)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.6" stroke-opacity="0.34" />
    <rect x="${formatNumber(x + frameInset)}" y="${formatNumber(y + frameInset)}" width="${formatNumber(width - frameInset * 2)}" height="${formatNumber(height - frameInset * 2)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.4" stroke-opacity="0.28" />
    <path d="M ${formatNumber(x)} ${formatNumber(y + 28)} v ${formatNumber(height - 56)} h 42" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.82" />
    <path d="M ${formatNumber(x + width - 52)} ${formatNumber(y + 18)} h 52 v ${formatNumber(height - 42)}" fill="none" stroke="${brightAccentHex}" stroke-width="${formatNumber(2 + surgeBoost * 0.4)}" stroke-opacity="${formatNumber(0.88 + surgeBoost * 0.08)}" />
    <path d="M ${formatNumber(midX)} ${formatNumber(y + 14)} V ${formatNumber(y + height - 14)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.26" />
    <path d="M ${formatNumber(x + 14)} ${formatNumber(midY)} H ${formatNumber(x + width - 14)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.26" />
    <rect x="${formatNumber(midX - focusWidth / 2)}" y="${formatNumber(midY - focusHeight / 2)}" width="${formatNumber(focusWidth)}" height="${formatNumber(focusHeight)}" fill="none" stroke="${brightAccentHex}" stroke-width="1.6" stroke-opacity="${formatNumber(0.38 + surgeBoost * 0.22)}" rx="8" />
    ${focusBrackets}
    ${buildVerticalMeterBars(
      instrument.levelMeters,
      meterX,
      meterY,
      meterWidth,
      meterHeight,
      brightAccentHex,
      dimAccentHex,
      surgeBoost,
    )}
    <path d="${shutterPath}" fill="none" stroke="${brightAccentHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${formatNumber(0.78 + surgeBoost * 0.12)}" />
    <circle cx="${formatNumber(midX)}" cy="${formatNumber(midY)}" r="${formatNumber(6 + surgeBoost * 1.8)}" fill="${brightAccentHex}" fill-opacity="${formatNumber(0.86 + surgeBoost * 0.1)}" />
  `;
}

function buildProjectsWidget(
  instrument: SectionInstrumentData,
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
  surgeBoost: number,
) {
  const leftStripX = x + 12;
  const stripWidth = 50;
  const graphLeft = x + 86;
  const graphTop = y + 18;
  const graphWidth = width - 162;
  const graphHeight = height - 56;
  const graphBaseline = graphTop + graphHeight * 0.78;
  const graphPath = buildWavePath(
    instrument.waveform,
    graphLeft,
    graphBaseline,
    graphWidth,
    graphHeight * 0.58,
  );
  const secondaryPath = buildWavePath(
    instrument.secondaryWaveform,
    graphLeft,
    graphBaseline + 8,
    graphWidth,
    graphHeight * 0.42,
  );
  const diagnosticStrips = instrument.levelMeters
    .map((value, index) => {
      const segmentY = y + 18 + index * 22;
      const segmentHeight = 14;
      const segmentWidth = 18 + value * 28;
      return `
        <rect x="${formatNumber(leftStripX)}" y="${formatNumber(segmentY)}" width="${formatNumber(stripWidth)}" height="${segmentHeight}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.24" rx="3" />
        <rect x="${formatNumber(leftStripX + 4)}" y="${formatNumber(segmentY + 3)}" width="${formatNumber(segmentWidth)}" height="${segmentHeight - 6}" fill="${index % 2 === 0 ? brightAccentHex : dimAccentHex}" fill-opacity="${formatNumber(0.48 + surgeBoost * 0.08)}" rx="2" />
      `;
    })
    .join("");
  const topologyNodes = buildCircleMarkers(
    instrument.markers,
    graphLeft,
    graphBaseline,
    graphWidth,
    instrument.waveform,
    graphHeight * 0.58,
    brightAccentHex,
    dimAccentHex,
  );
  const terminalIndicators = instrument.markers
    .map((marker, index) => {
      const indicatorX = x + width - 54;
      const indicatorY = y + 20 + marker * (height - 42);
      const indicatorWidth = 28;
      const indicatorHeight = 8 + (index % 3) * 4;
      return `<rect x="${formatNumber(indicatorX)}" y="${formatNumber(indicatorY)}" width="${indicatorWidth}" height="${indicatorHeight}" fill="${index % 2 === 0 ? brightAccentHex : dimAccentHex}" fill-opacity="${formatNumber(0.38 + surgeBoost * 0.12)}" rx="2" />`;
    })
    .join("");

  return `
    <path d="M ${formatNumber(x)} ${formatNumber(y + 20)} h 34 v ${formatNumber(height - 54)}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.72" />
    <path d="M ${formatNumber(x + 22)} ${formatNumber(y + height - 20)} H ${formatNumber(x + width - 18)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.4" stroke-opacity="0.36" />
    <rect x="${formatNumber(graphLeft - 12)}" y="${formatNumber(graphTop - 8)}" width="${formatNumber(graphWidth + 20)}" height="${formatNumber(graphHeight + 16)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.2" rx="6" />
    ${buildHorizontalLineSet(
      instrument.markers,
      graphLeft - 8,
      graphTop,
      graphWidth + 16,
      graphHeight,
      dimAccentHex,
      0.16,
    )}
    ${diagnosticStrips}
    <path d="${secondaryPath}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.4" />
    <path d="${graphPath}" fill="none" stroke="${brightAccentHex}" stroke-width="${formatNumber(2.6 + surgeBoost * 0.5)}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${formatNumber(0.88 + surgeBoost * 0.08)}" />
    ${topologyNodes}
    ${buildVerticalMeterBars(
      instrument.levelMeters,
      x + width - 82,
      y + 18,
      40,
      height - 44,
      brightAccentHex,
      dimAccentHex,
      surgeBoost,
    )}
    ${terminalIndicators}
  `;
}

function buildMusicWidget(
  instrument: SectionInstrumentData,
  x: number,
  y: number,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
  surgeBoost: number,
) {
  const waveLeft = x + 18;
  const waveBaseline = y + height - 42;
  const waveWidth = width - 142;
  const waveHeight = height * 0.48;
  const wavePath = buildWavePath(
    instrument.waveform,
    waveLeft,
    waveBaseline,
    waveWidth,
    waveHeight,
  );
  const secondaryPath = buildWavePath(
    instrument.secondaryWaveform,
    waveLeft,
    waveBaseline + 6,
    waveWidth,
    waveHeight * 0.7,
  );
  const reelCx = x + width - 48;
  const reelCy = y + height / 2 + 8;
  const leftReelCx = reelCx - 54;
  const levelMeterX = x + 14;
  const playheadY = y + 28;

  return `
    ${buildHorizontalLineSet(
      instrument.markers,
      waveLeft,
      y + 14,
      waveWidth,
      height - 30,
      dimAccentHex,
      0.18,
    )}
    <path d="${secondaryPath}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.38" />
    <path d="${wavePath}" fill="none" stroke="${brightAccentHex}" stroke-width="${formatNumber(3 + surgeBoost * 0.45)}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${formatNumber(0.9 + surgeBoost * 0.08)}" />
    <path d="M ${formatNumber(waveLeft)} ${formatNumber(waveBaseline)} H ${formatNumber(waveLeft + waveWidth)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.3" stroke-opacity="0.34" />
    ${buildVerticalMeterBars(
      instrument.levelMeters,
      levelMeterX,
      y + 18,
      42,
      height - 44,
      brightAccentHex,
      dimAccentHex,
      surgeBoost,
    )}
    <path d="M ${formatNumber(waveLeft + 18)} ${formatNumber(playheadY)} H ${formatNumber(x + width - 84)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.28" />
    <path d="M ${formatNumber(x + width - 116)} ${formatNumber(playheadY - 8)} l 16 8 l -16 8 z" fill="${brightAccentHex}" fill-opacity="${formatNumber(0.68 + surgeBoost * 0.14)}" />
    <circle cx="${formatNumber(leftReelCx)}" cy="${formatNumber(reelCy)}" r="24" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.58" />
    <circle cx="${formatNumber(reelCx)}" cy="${formatNumber(reelCy)}" r="24" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.58" />
    <circle cx="${formatNumber(leftReelCx)}" cy="${formatNumber(reelCy)}" r="5.4" fill="${brightAccentHex}" fill-opacity="0.9" />
    <circle cx="${formatNumber(reelCx)}" cy="${formatNumber(reelCy)}" r="5.4" fill="${brightAccentHex}" fill-opacity="0.9" />
    <rect x="${formatNumber(leftReelCx + 18)}" y="${formatNumber(reelCy - 7)}" width="18" height="14" fill="none" stroke="${brightAccentHex}" stroke-width="1.6" stroke-opacity="${formatNumber(0.72 + surgeBoost * 0.12)}" rx="4" />
  `;
}

function buildSectionFieldMarkup(
  sectionId: UniverseSectionId,
  instrument: SectionInstrumentData,
  width: number,
  height: number,
  brightAccentHex: string,
  dimAccentHex: string,
  surgeBoost: number,
) {
  if (sectionId === "photography") {
    const frameInset = 74;
    return `
      <rect x="${frameInset}" y="${frameInset - 18}" width="${width - frameInset * 2}" height="${height - frameInset * 2 + 36}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.14" />
      <path d="M ${frameInset + 24} ${frameInset + 6} h 88" fill="none" stroke="${brightAccentHex}" stroke-width="1.4" stroke-opacity="${formatNumber(0.22 + surgeBoost * 0.08)}" />
      <path d="M ${width - frameInset - 112} ${height - frameInset - 6} h 88" fill="none" stroke="${brightAccentHex}" stroke-width="1.4" stroke-opacity="${formatNumber(0.22 + surgeBoost * 0.08)}" />
      ${buildHorizontalLineSet(
        instrument.markers,
        frameInset + 40,
        frameInset + 32,
        width - (frameInset + 40) * 2,
        height - (frameInset + 32) * 2,
        dimAccentHex,
        0.1,
      )}
    `;
  }

  if (sectionId === "projects") {
    const pathLeft = width * 0.14;
    const pathTop = height * 0.24;
    const pathWidth = width * 0.34;
    const pathHeight = height * 0.2;
    const topologyPath = buildWavePath(
      instrument.secondaryWaveform,
      pathLeft,
      pathTop + pathHeight,
      pathWidth,
      pathHeight,
    );
    return `
      <path d="${topologyPath}" fill="none" stroke="${dimAccentHex}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.16" />
      ${buildCircleMarkers(
        instrument.markers,
        pathLeft,
        pathTop + pathHeight,
        pathWidth,
        instrument.secondaryWaveform,
        pathHeight,
        brightAccentHex,
        dimAccentHex,
      )}
      <path d="M ${formatNumber(width * 0.64)} ${formatNumber(height * 0.18)} h ${formatNumber(width * 0.18)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.12" />
      <path d="M ${formatNumber(width * 0.66)} ${formatNumber(height * 0.2)} v ${formatNumber(height * 0.22)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.12" />
    `;
  }

  return `
    ${buildHorizontalLineSet(
      instrument.markers,
      width * 0.18,
      height * 0.2,
      width * 0.54,
      height * 0.28,
      dimAccentHex,
      0.11,
    )}
    <path d="M ${formatNumber(width * 0.72)} ${formatNumber(height * 0.22)} h ${formatNumber(width * 0.12)}" fill="none" stroke="${brightAccentHex}" stroke-width="1.2" stroke-opacity="${formatNumber(0.16 + surgeBoost * 0.06)}" />
    <path d="M ${formatNumber(width * 0.76)} ${formatNumber(height * 0.16)} v ${formatNumber(height * 0.18)}" fill="none" stroke="${dimAccentHex}" stroke-width="1.2" stroke-opacity="0.12" />
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
  surgeBoost: number,
) {
  if (sectionId === "photography") {
    return buildPhotographyWidget(
      instrument,
      x,
      y,
      width,
      height,
      brightAccentHex,
      dimAccentHex,
      surgeBoost,
    );
  }

  if (sectionId === "projects") {
    return buildProjectsWidget(
      instrument,
      x,
      y,
      width,
      height,
      brightAccentHex,
      dimAccentHex,
      surgeBoost,
    );
  }

  return buildMusicWidget(
    instrument,
    x,
    y,
    width,
    height,
    brightAccentHex,
    dimAccentHex,
    surgeBoost,
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
  surging,
}: HudSvgOptions) {
  const fontConfig = HUD_FONT_CONFIGS[fontOption];
  const surgeBoost = surging ? 1 : 0;
  const marginX = Math.round(width * 0.055);
  const marginY = Math.round(height * 0.085);
  const statusX = width - marginX - 336;
  const statusY = marginY + 24;
  const moduleX = marginX;
  const moduleY = height - marginY - 212;
  const moduleWidth = Math.min(620, width * 0.37);
  const widgetWidth = 340;
  const widgetHeight = 208;
  const widgetX = width - marginX - widgetWidth;
  const widgetY = Math.round(height * 0.5 - widgetHeight / 2);
  const safeLabel = escapeXml(section.label);
  const metadataStep = Math.min(
    166,
    (moduleWidth - 122) / Math.max(instrument.metadata.length, 1),
  );
  const metadataMarkup = instrument.metadata
    .map((item, index) => {
      const x = moduleX + 44 + index * metadataStep;
      const color = index === 0 ? "#eef3ff" : brightAccentHex;
      return `<text x="${formatNumber(x)}" y="${moduleY + 164}" fill="${color}" font-size="${20 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}">${escapeXml(item)}</text>`;
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
    surgeBoost,
  );
  const sectionFieldMarkup = buildSectionFieldMarkup(
    section.id,
    instrument,
    width,
    height,
    brightAccentHex,
    dimAccentHex,
    surgeBoost,
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
          <stop offset="0%" stop-color="${accentHex}" stop-opacity="${formatNumber(0.16 + surgeBoost * 0.08)}" />
          <stop offset="100%" stop-color="${accentHex}" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="widgetGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${brightAccentHex}" stop-opacity="${formatNumber(0.08 + surgeBoost * 0.06)}" />
          <stop offset="100%" stop-color="${brightAccentHex}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="rgba(0, 0, 0, 0)" />
      <g font-family="${fontConfig.fontFamily}" text-rendering="geometricPrecision">
        <g opacity="${formatNumber(0.76 + surgeBoost * 0.1)}">
          ${sectionFieldMarkup}
        </g>

        <g transform="translate(${statusX} ${statusY})">
          <circle cx="8" cy="18" r="${formatNumber(6.2 + surgeBoost * 1.2)}" fill="${brightAccentHex}" fill-opacity="0.95" />
          <text x="26" y="18" fill="#eef3ff" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">SIGNAL</text>
          <text x="164" y="18" fill="${brightAccentHex}" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">TUNING</text>
          <text x="26" y="52" fill="#eef3ff" font-size="${22 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}">${escapeXml(instrument.channel)}</text>
          <text x="134" y="52" fill="${brightAccentHex}" font-size="${22 * fontConfig.uiScale}" font-weight="600" letter-spacing="${fontConfig.letterSpacing.small}">${escapeXml(instrument.mode)}</text>
          <path d="M 18 76 H 292" fill="none" stroke="${dimAccentHex}" stroke-width="${formatNumber(2 + surgeBoost * 0.25)}" stroke-opacity="0.75" />
        </g>

        <g transform="translate(${moduleX} ${moduleY})">
          <path d="M 0 36 V 172 H 42" fill="none" stroke="${dimAccentHex}" stroke-width="2.5" stroke-opacity="0.82" />
          <path d="M ${moduleWidth - 86} 20 H ${moduleWidth} V 176" fill="none" stroke="${brightAccentHex}" stroke-width="${formatNumber(2.5 + surgeBoost * 0.35)}" stroke-opacity="${formatNumber(0.86 + surgeBoost * 0.08)}" />
          <path d="M 40 64 H ${moduleWidth - 142}" fill="none" stroke="${dimAccentHex}" stroke-width="2" stroke-opacity="0.55" />
          <rect x="40" y="86" width="${moduleWidth - 148}" height="72" fill="url(#moduleFill)" />
          <text x="42" y="66" fill="#eef3ff" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">CHANNEL</text>
          <text x="${formatNumber(Math.min(moduleWidth - 154, 250))}" y="66" fill="${brightAccentHex}" font-size="${28 * fontConfig.uiScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.medium}">${escapeXml(instrument.channel)}</text>
          <text x="42" y="136" fill="${accentHex}" stroke="${brightAccentHex}" stroke-opacity="${formatNumber(0.18 + surgeBoost * 0.08)}" stroke-width="${formatNumber(5 + surgeBoost * 1.2)}" font-size="${64 * fontConfig.displayScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.large}">${safeLabel}</text>
          <text x="42" y="136" fill="${brightAccentHex}" font-size="${64 * fontConfig.displayScale}" font-weight="700" letter-spacing="${fontConfig.letterSpacing.large}">${safeLabel}</text>
          ${metadataMarkup}
        </g>

        <g transform="translate(${widgetX} ${widgetY})">
          <rect x="0" y="36" width="${widgetWidth}" height="${widgetHeight - 36}" fill="url(#widgetGlow)" />
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
  surging?: boolean;
};

export function UniverseHudOverlay({
  active,
  fontOption,
  section,
  surging = false,
}: UniverseHudOverlayProps) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const rootRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const progressRef = useRef(Boolean(section) ? 1 : 0);
  const progressVelocityRef = useRef(0);
  const surgeRef = useRef(surging ? 1 : 0);
  const surgeVelocityRef = useRef(0);
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
      surging,
    });
  }, [
    accentHex,
    brightAccentHex,
    dimAccentHex,
    fontFaceCss,
    fontOption,
    instrument,
    section,
    surging,
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
    const progressSpring = stepDampedSpring(
      progressRef.current,
      progressVelocityRef.current,
      targetProgress,
      delta,
      HUD_PROGRESS_SPRING_FREQUENCY,
      HUD_PROGRESS_SPRING_DAMPING,
    );
    progressRef.current = progressSpring.value;
    progressVelocityRef.current = progressSpring.velocity;

    const surgeSpring = stepDampedSpring(
      surgeRef.current,
      surgeVelocityRef.current,
      surging ? 1 : 0,
      delta,
      HUD_SURGE_SPRING_FREQUENCY,
      HUD_SURGE_SPRING_DAMPING,
    );
    surgeRef.current = surgeSpring.value;
    surgeVelocityRef.current = surgeSpring.velocity;

    const reveal = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const surgeAmount = THREE.MathUtils.clamp(surgeRef.current, 0, 1.1);
    const pulse =
      1.002 +
      Math.sin(clock.getElapsedTime() * (1.6 + surgeAmount * 0.8)) *
        (0.004 + surgeAmount * 0.008);

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
        currentViewport.width * (pulse + surgeAmount * 0.02),
        currentViewport.height * (pulse + surgeAmount * 0.02),
        1,
      );
      meshRef.current.renderOrder = HUD_RENDER_ORDER;
      meshRef.current.frustumCulled = false;
      meshRef.current.visible = Boolean(texture) && reveal > 0.02;
    }

    if (materialRef.current) {
      materialRef.current.opacity = Math.min(
        1,
        reveal * (0.96 + surgeAmount * 0.18),
      );
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
