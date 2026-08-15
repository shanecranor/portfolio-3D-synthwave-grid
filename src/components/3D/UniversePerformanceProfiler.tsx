"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const REPORT_INTERVAL_MS = 10_000;
const MAX_FRAME_SAMPLES = 18_000;

type LongTaskSample = {
  startTime: number;
  duration: number;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type LargestContentfulPaintEntry = PerformanceEntry & {
  renderTime: number;
  loadTime: number;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

type UniversePerformanceApi = {
  report: () => UniversePerformanceReport;
  reset: () => void;
};

type UniversePerformanceReport = ReturnType<typeof buildReport>;

declare global {
  interface Window {
    __UNIVERSE_PERF__?: UniversePerformanceApi;
  }
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) return 0;

  const index = Math.min(
    sortedValues.length - 1,
    Math.floor(sortedValues.length * percentileValue),
  );

  return sortedValues[index];
}

function bytesToMiB(bytes: number) {
  return round(bytes / (1024 * 1024), 2);
}

function buildReport(
  startedAt: number,
  frameTimes: number[],
  longTasks: LongTaskSample[],
  layoutShiftScore: number,
  largestContentfulPaint: number,
  rendererSamples: {
    calls: number[];
    triangles: number[];
    geometries: number[];
    textures: number[];
  },
  renderer: {
    vendor: string;
    name: string;
    pixelRatio: number;
    canvasWidth: number;
    canvasHeight: number;
  },
) {
  const now = performance.now();
  const sortedFrameTimes = [...frameTimes].sort((a, b) => a - b);
  const sum = (values: number[]) =>
    values.reduce((total, value) => total + value, 0);
  const average = (values: number[]) =>
    values.length > 0 ? sum(values) / values.length : 0;
  const maximum = (values: number[]) =>
    values.length > 0 ? Math.max(...values) : 0;
  const slowFramePercentage = (threshold: number) =>
    frameTimes.length > 0
      ? (frameTimes.filter((value) => value > threshold).length /
          frameTimes.length) *
        100
      : 0;
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const paints = performance.getEntriesByType("paint");
  const firstContentfulPaint = paints.find(
    (entry) => entry.name === "first-contentful-paint",
  );
  const resourceRows = resources
    .map((resource) => ({
      name: new URL(resource.name).pathname,
      transferKiB: round(resource.transferSize / 1024, 1),
      decodedKiB: round(resource.decodedBodySize / 1024, 1),
      durationMs: round(resource.duration),
    }))
    .sort((a, b) => b.transferKiB - a.transferKiB);
  const memory = (performance as PerformanceWithMemory).memory;

  return {
    capturedAt: new Date().toISOString(),
    durationSeconds: round((now - startedAt) / 1000),
    page: {
      path: `${window.location.pathname}${window.location.search}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      visibility: document.visibilityState,
    },
    framePacing: {
      samples: frameTimes.length,
      averageFps: round(1000 / Math.max(average(frameTimes), 0.001)),
      averageFrameMs: round(average(frameTimes), 2),
      p50FrameMs: round(percentile(sortedFrameTimes, 0.5), 2),
      p95FrameMs: round(percentile(sortedFrameTimes, 0.95), 2),
      p99FrameMs: round(percentile(sortedFrameTimes, 0.99), 2),
      framesOver16_7msPercent: round(slowFramePercentage(16.7), 2),
      framesOver33_3msPercent: round(slowFramePercentage(33.3), 2),
      framesOver50msPercent: round(slowFramePercentage(50), 2),
    },
    renderer: {
      ...renderer,
      averageDrawCalls: round(average(rendererSamples.calls)),
      maxDrawCalls: maximum(rendererSamples.calls),
      averageTriangles: Math.round(average(rendererSamples.triangles)),
      maxTriangles: maximum(rendererSamples.triangles),
      maxGeometries: maximum(rendererSamples.geometries),
      maxTextures: maximum(rendererSamples.textures),
    },
    mainThread: {
      longTaskCount: longTasks.length,
      totalLongTaskMs: round(sum(longTasks.map((task) => task.duration))),
      longestTaskMs: round(maximum(longTasks.map((task) => task.duration))),
      recentLongTasks: longTasks.slice(-10).map((task) => ({
        startTimeMs: round(task.startTime),
        durationMs: round(task.duration),
      })),
    },
    loading: {
      ttfbMs: navigation
        ? round(navigation.responseStart - navigation.requestStart)
        : null,
      domContentLoadedMs: navigation
        ? round(navigation.domContentLoadedEventEnd)
        : null,
      loadMs: navigation ? round(navigation.loadEventEnd) : null,
      firstContentfulPaintMs: firstContentfulPaint
        ? round(firstContentfulPaint.startTime)
        : null,
      largestContentfulPaintMs:
        largestContentfulPaint > 0 ? round(largestContentfulPaint) : null,
      cumulativeLayoutShift: round(layoutShiftScore, 3),
      resourceCount: resources.length,
      transferredMiB: bytesToMiB(
        sum(resources.map((resource) => resource.transferSize)),
      ),
      decodedMiB: bytesToMiB(
        sum(resources.map((resource) => resource.decodedBodySize)),
      ),
      largestTransfers: resourceRows.slice(0, 10),
    },
    memory: memory
      ? {
          usedHeapMiB: bytesToMiB(memory.usedJSHeapSize),
          totalHeapMiB: bytesToMiB(memory.totalJSHeapSize),
          heapLimitMiB: bytesToMiB(memory.jsHeapSizeLimit),
        }
      : "Unavailable in this browser",
  };
}

export function UniversePerformanceProfiler() {
  const gl = useThree((state) => state.gl);
  const glRef = useRef(gl);
  const enabledRef = useRef(false);
  const startedAtRef = useRef(0);
  const lastFrameAtRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const longTasksRef = useRef<LongTaskSample[]>([]);
  const layoutShiftScoreRef = useRef(0);
  const largestContentfulPaintRef = useRef(0);
  const rendererSamplesRef = useRef({
    calls: [] as number[],
    triangles: [] as number[],
    geometries: [] as number[],
    textures: [] as number[],
  });

  useFrame(() => {
    if (!enabledRef.current || document.visibilityState !== "visible") return;

    const now = performance.now();
    const lastFrameAt = lastFrameAtRef.current;
    lastFrameAtRef.current = now;

    if (lastFrameAt !== null) {
      frameTimesRef.current.push(now - lastFrameAt);
      if (frameTimesRef.current.length > MAX_FRAME_SAMPLES) {
        frameTimesRef.current.shift();
      }
    }

    const samples = rendererSamplesRef.current;
    samples.calls.push(gl.info.render.calls);
    samples.triangles.push(gl.info.render.triangles);
    samples.geometries.push(gl.info.memory.geometries);
    samples.textures.push(gl.info.memory.textures);
    if (samples.calls.length > MAX_FRAME_SAMPLES) {
      samples.calls.shift();
      samples.triangles.shift();
      samples.geometries.shift();
      samples.textures.shift();
    }

    // EffectComposer performs multiple renderer passes. With Three's default
    // auto-reset behavior, gl.info only describes the final fullscreen pass.
    // Reset after sampling so the next sample includes the complete frame.
    gl.info.reset();
  }, 100);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("profile")) return;

    enabledRef.current = true;
    startedAtRef.current = performance.now();
    const rendererInstance = glRef.current;
    const originalInfoAutoReset = rendererInstance.info.autoReset;
    rendererInstance.info.autoReset = false;
    rendererInstance.info.reset();
    const context = rendererInstance.getContext();
    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = {
      vendor: debugInfo
        ? String(context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
        : "Unavailable",
      name: debugInfo
        ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
        : "Unavailable",
      pixelRatio: rendererInstance.getPixelRatio(),
      canvasWidth: rendererInstance.domElement.width,
      canvasHeight: rendererInstance.domElement.height,
    };

    const reset = () => {
      startedAtRef.current = performance.now();
      lastFrameAtRef.current = null;
      frameTimesRef.current = [];
      longTasksRef.current = [];
      layoutShiftScoreRef.current = 0;
      largestContentfulPaintRef.current = 0;
      rendererSamplesRef.current = {
        calls: [],
        triangles: [],
        geometries: [],
        textures: [],
      };
      console.info("[universe-perf] Capture reset.");
    };
    const report = () => {
      const result = buildReport(
        startedAtRef.current,
        frameTimesRef.current,
        longTasksRef.current,
        layoutShiftScoreRef.current,
        largestContentfulPaintRef.current,
        rendererSamplesRef.current,
        renderer,
      );

      console.info("[universe-perf] Copy the report below:");
      console.log(JSON.stringify(result, null, 2));
      return result;
    };

    window.__UNIVERSE_PERF__ = { report, reset };

    const observers: PerformanceObserver[] = [];
    const observe = (
      type: string,
      callback: (entries: PerformanceEntry[]) => void,
    ) => {
      try {
        const observer = new PerformanceObserver((list) => {
          callback(list.getEntries());
        });
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        // Some metrics are browser-specific; the rest of the profile remains useful.
      }
    };

    observe("longtask", (entries) => {
      longTasksRef.current.push(
        ...entries.map((entry) => ({
          startTime: entry.startTime,
          duration: entry.duration,
        })),
      );
    });
    observe("layout-shift", (entries) => {
      for (const entry of entries as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) layoutShiftScoreRef.current += entry.value;
      }
    });
    observe("largest-contentful-paint", (entries) => {
      const entry = entries.at(-1) as LargestContentfulPaintEntry | undefined;
      if (entry) {
        largestContentfulPaintRef.current =
          entry.renderTime || entry.loadTime || entry.startTime;
      }
    });

    console.info(
      "[universe-perf] Profiling enabled. Interact with every section for 20–30 seconds, then run window.__UNIVERSE_PERF__.report() in DevTools.",
    );
    const intervalId = window.setInterval(report, REPORT_INTERVAL_MS);

    return () => {
      enabledRef.current = false;
      window.clearInterval(intervalId);
      observers.forEach((observer) => observer.disconnect());
      rendererInstance.info.autoReset = originalInfoAutoReset;
      rendererInstance.info.reset();
      delete window.__UNIVERSE_PERF__;
    };
  }, [gl]);

  return null;
}
