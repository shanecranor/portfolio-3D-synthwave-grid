"use client";

import { useEffect, useMemo, useState } from "react";
import "./page.scss";
import {
  TITLE_TEST_2D_VARIANTS,
  TitleTest2DScene,
  type VariantPreset,
} from "./TitleTest2DScene";

type ControlTab = "title" | "rear" | "vhs";

const ICE_CHROME_INDEX = TITLE_TEST_2D_VARIANTS.findIndex(
  (variant) => variant.name === "Ice Chrome",
);

const DEFAULT_ICE_PRESET: VariantPreset = {
  ...TITLE_TEST_2D_VARIANTS[ICE_CHROME_INDEX].preset,
};

const COLOR_CONTROLS = [
  { key: "skyDeep", label: "Sky Deep" },
  { key: "skyMid", label: "Sky Mid" },
  { key: "skyLight", label: "Sky Light" },
  { key: "groundHot", label: "Ground Hot" },
  { key: "groundMid", label: "Ground Mid" },
  { key: "groundLight", label: "Ground Light" },
  { key: "divider", label: "Divider" },
  { key: "shadowTint", label: "Edge Shadow" },
  { key: "highlightTint", label: "Highlight" },
] as const;

const REAR_COLOR_CONTROLS = [
  { key: "rearGridColor", label: "Rear Grid" },
  { key: "rearOutlineColor", label: "Rear Outline" },
] as const;

const TOGGLE_CONTROLS = [
  { key: "dividerEnabled", label: "Divider" },
  { key: "sheenEnabled", label: "Sheen" },
  { key: "edgeSoftnessEnabled", label: "Edge Softness" },
] as const;

const REAR_TOGGLE_CONTROLS = [
  { key: "rearGridEnabled", label: "Rear Grid" },
  { key: "rearOutlineEnabled", label: "Rear Outline" },
] as const;

const SLIDER_CONTROLS = [
  { key: "splitBase", label: "Split Base", min: 0.2, max: 0.7, step: 0.001, digits: 3 },
  { key: "mountainAmp1", label: "Mountain Amp 1", min: 0, max: 0.16, step: 0.001, digits: 3 },
  { key: "mountainAmp2", label: "Mountain Amp 2", min: 0, max: 0.08, step: 0.001, digits: 3 },
  { key: "mountainFreq1", label: "Mountain Freq 1", min: 0.4, max: 3, step: 0.01, digits: 2 },
  { key: "mountainFreq2", label: "Mountain Freq 2", min: 1, max: 8, step: 0.01, digits: 2 },
  { key: "mountainPhase1", label: "Mountain Phase 1", min: 0, max: 6.283, step: 0.01, digits: 2 },
  { key: "mountainPhase2", label: "Mountain Phase 2", min: 0, max: 6.283, step: 0.01, digits: 2 },
  { key: "reflectionMix", label: "Reflection Mix", min: 0, max: 1, step: 0.001, digits: 3 },
  { key: "sheenStrength", label: "Sheen Strength", min: 0, max: 2.5, step: 0.01, digits: 2 },
  { key: "edgeSoftness", label: "Edge Softness", min: 0.02, max: 0.2, step: 0.001, digits: 3 },
  { key: "edgeSoftnessOffset", label: "Edge Softness Offset", min: -0.25, max: 0.25, step: 0.001, digits: 3 },
  { key: "pointerInfluence", label: "Pointer Influence", min: 0, max: 2, step: 0.01, digits: 2 },
  { key: "dividerWidth", label: "Divider Width", min: 0.002, max: 0.05, step: 0.001, digits: 3 },
  { key: "dividerStrength", label: "Divider Strength", min: 0, max: 1.5, step: 0.01, digits: 2 },
  { key: "bandCurve", label: "Band Curve", min: 0.4, max: 2, step: 0.01, digits: 2 },
] as const;

const REAR_SLIDER_CONTROLS = [
  { key: "rearGridDensityX", label: "Grid Density X", min: 2, max: 40, step: 0.1, digits: 1 },
  { key: "rearGridDensityY", label: "Grid Density Y", min: 2, max: 30, step: 0.1, digits: 1 },
  { key: "rearGridWidth", label: "Grid Width", min: 0.002, max: 0.08, step: 0.001, digits: 3 },
  { key: "rearGridAlpha", label: "Grid Alpha", min: 0, max: 1, step: 0.01, digits: 2 },
  { key: "rearGridFade", label: "Grid Fade", min: 0.02, max: 0.4, step: 0.001, digits: 3 },
  { key: "rearGridParallax", label: "Grid Parallax", min: 0, max: 0.15, step: 0.001, digits: 3 },
  { key: "rearOutlineOpacity", label: "Outline Opacity", min: 0, max: 1, step: 0.01, digits: 2 },
  { key: "rearOutlineScale", label: "Outline Scale", min: 1, max: 1.15, step: 0.001, digits: 3 },
] as const;

const VHS_SLIDER_CONTROLS = [
  { key: "vhsFps", label: "Stepped FPS", min: 1, max: 60, step: 0.01, digits: 2 },
  { key: "vhsTimebaseStrength", label: "Timebase Strength", min: 0, max: 3, step: 0.01, digits: 2 },
  { key: "vhsChromaBleed", label: "Chroma Bleed", min: 0, max: 6, step: 0.01, digits: 2 },
  { key: "vhsHeadswitchStrength", label: "Headswitch Strength", min: 0, max: 2, step: 0.01, digits: 2 },
  { key: "vhsDropoutStrength", label: "Dropout Strength", min: 0, max: 2, step: 0.01, digits: 2 },
  { key: "vhsNoiseStrength", label: "Noise Strength", min: 0, max: 2, step: 0.01, digits: 2 },
] as const;

const CONTROL_TABS: Array<{ id: ControlTab; label: string }> = [
  { id: "title", label: "Title" },
  { id: "rear", label: "Rear Text" },
  { id: "vhs", label: "VHS" },
];

export default function Page() {
  const [activeIndex, setActiveIndex] = useState(ICE_CHROME_INDEX);
  const [icePreset, setIcePreset] = useState<VariantPreset>(DEFAULT_ICE_PRESET);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<ControlTab>("title");

  const variants = useMemo(
    () =>
      TITLE_TEST_2D_VARIANTS.map((variant, index) =>
        index === ICE_CHROME_INDEX ? { ...variant, preset: icePreset } : variant,
      ),
    [icePreset],
  );

  const activeVariant = variants[activeIndex];
  const isIceChromeActive = activeIndex === ICE_CHROME_INDEX;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        setActiveIndex((current) => (current + 1) % variants.length);
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        setActiveIndex(
          (current) => (current - 1 + variants.length) % variants.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [variants.length]);

  function updateIcePreset<K extends keyof VariantPreset>(
    key: K,
    value: VariantPreset[K],
  ) {
    setIcePreset((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleExport() {
    const payload = `{
  name: "Ice Chrome",
  preset: ${JSON.stringify(icePreset, null, 2)}
}`;

    try {
      await navigator.clipboard.writeText(payload);
      setExportStatus("Copied preset to clipboard");
      window.setTimeout(() => setExportStatus(null), 1800);
    } catch {
      setExportStatus("Clipboard export failed");
      window.setTimeout(() => setExportStatus(null), 1800);
    }
  }

  return (
    <main className="title-test-2d-page">
      <div className="title-test-2d-page__canvas">
        <TitleTest2DScene activeVariant={activeVariant} />
      </div>

      <div className="title-test-2d-page__overlay">
        <div className="title-test-2d-page__badge">{activeVariant.id}</div>
        <div className="title-test-2d-page__meta">
          <span>{activeVariant.name}</span>
        </div>
        <div className="title-test-2d-page__hint">
          <span>Use arrow keys</span>
        </div>
        <div className="title-test-2d-page__nav title-test-2d-page__nav--left">
          <span>← Prev</span>
        </div>
        <div className="title-test-2d-page__nav title-test-2d-page__nav--right">
          <span>Next →</span>
        </div>
      </div>

      <aside className="title-test-2d-page__controls">
        <button
          type="button"
          className="title-test-2d-page__controls-toggle"
          onClick={() => setControlsVisible((current) => !current)}
        >
          {controlsVisible ? "Hide Controls" : "Show Controls"}
        </button>

        {controlsVisible && (
          <div className="title-test-2d-page__controls-panel">
        <div className="title-test-2d-page__controls-header">
          <div>
            <h2>Ice Chrome Controls</h2>
            <p>
              Tweaks apply to the Ice Chrome preset. Use arrow keys to come back
              to it.
            </p>
          </div>
          <button
            type="button"
            className="title-test-2d-page__reset"
            onClick={() => setIcePreset(DEFAULT_ICE_PRESET)}
          >
            Reset
          </button>
        </div>

        <div className="title-test-2d-page__tabs">
          {CONTROL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`title-test-2d-page__tab${
                activeTab === tab.id ? " title-test-2d-page__tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="title-test-2d-page__controls-status">
          <span>{isIceChromeActive ? "Editing active preset" : "Editing preset 4 in background"}</span>
        </div>

        {activeTab === "title" && (
          <>
        <section className="title-test-2d-page__control-section">
          <h3>Toggles</h3>
          <div className="title-test-2d-page__toggle-list">
            {TOGGLE_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__toggle">
                <span>{control.label}</span>
                <input
                  type="checkbox"
                  checked={icePreset[control.key]}
                  onChange={(event) =>
                    updateIcePreset(control.key, event.target.checked)
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="title-test-2d-page__control-section">
          <h3>Colors</h3>
          <div className="title-test-2d-page__color-list">
            {COLOR_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__color">
                <span>{control.label}</span>
                <div className="title-test-2d-page__color-inputs">
                  <input
                    type="color"
                    value={String(icePreset[control.key])}
                    onChange={(event) =>
                      updateIcePreset(control.key, event.target.value)
                    }
                  />
                  <code>{String(icePreset[control.key])}</code>
                </div>
              </label>
            ))}
          </div>
        </section>
          </>
        )}

        {activeTab === "rear" && (
          <>
        <section className="title-test-2d-page__control-section">
          <h3>Rear Text Toggles</h3>
          <div className="title-test-2d-page__toggle-list">
            {REAR_TOGGLE_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__toggle">
                <span>{control.label}</span>
                <input
                  type="checkbox"
                  checked={icePreset[control.key]}
                  onChange={(event) =>
                    updateIcePreset(control.key, event.target.checked)
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="title-test-2d-page__control-section">
          <h3>Rear Text Colors</h3>
          <div className="title-test-2d-page__color-list">
            {REAR_COLOR_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__color">
                <span>{control.label}</span>
                <div className="title-test-2d-page__color-inputs">
                  <input
                    type="color"
                    value={String(icePreset[control.key])}
                    onChange={(event) =>
                      updateIcePreset(control.key, event.target.value)
                    }
                  />
                  <code>{String(icePreset[control.key])}</code>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="title-test-2d-page__control-section">
          <h3>Sliders</h3>
          <div className="title-test-2d-page__slider-list">
            {SLIDER_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__slider">
                <div className="title-test-2d-page__slider-header">
                  <span>{control.label}</span>
                  <code>{icePreset[control.key].toFixed(control.digits)}</code>
                </div>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={icePreset[control.key]}
                  onChange={(event) =>
                    updateIcePreset(control.key, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="title-test-2d-page__control-section">
          <h3>Rear Text Sliders</h3>
          <div className="title-test-2d-page__slider-list">
            {REAR_SLIDER_CONTROLS.map((control) => (
              <label key={control.key} className="title-test-2d-page__slider">
                <div className="title-test-2d-page__slider-header">
                  <span>{control.label}</span>
                  <code>{icePreset[control.key].toFixed(control.digits)}</code>
                </div>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={icePreset[control.key]}
                  onChange={(event) =>
                    updateIcePreset(control.key, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
        </section>
          </>
        )}

        {activeTab === "vhs" && (
          <section className="title-test-2d-page__control-section">
            <h3>VHS Sliders</h3>
            <div className="title-test-2d-page__slider-list">
              {VHS_SLIDER_CONTROLS.map((control) => (
                <label key={control.key} className="title-test-2d-page__slider">
                  <div className="title-test-2d-page__slider-header">
                    <span>{control.label}</span>
                    <code>{icePreset[control.key].toFixed(control.digits)}</code>
                  </div>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={icePreset[control.key]}
                    onChange={(event) =>
                      updateIcePreset(control.key, Number(event.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <div className="title-test-2d-page__controls-footer">
          <button
            type="button"
            className="title-test-2d-page__export"
            onClick={handleExport}
          >
            Export
          </button>
          <span className="title-test-2d-page__export-status">
            {exportStatus ?? "Copies current Ice Chrome settings"}
          </span>
        </div>
          </div>
        )}
      </aside>
    </main>
  );
}
