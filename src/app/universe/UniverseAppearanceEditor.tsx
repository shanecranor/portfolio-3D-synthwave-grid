"use client";

import type { UniverseAppearanceSettings } from "./universeAppearance";

type UniverseAppearanceEditorProps = {
  settings: UniverseAppearanceSettings;
  visible: boolean;
  exportStatus: string | null;
  onToggleVisibility: () => void;
  onReset: () => void;
  onExport: () => void;
  onColorChange: (key: UniverseColorSettingKey, value: string) => void;
  onNumberChange: (key: UniverseNumberSettingKey, value: number) => void;
};

const COLOR_CONTROLS = [
  { key: "backgroundColor", label: "Scene Background" },
  { key: "skyTopColor", label: "Sky Top" },
  { key: "skyBottomColor", label: "Sky Bottom" },
  { key: "horizonColor", label: "Horizon" },
  { key: "horizonGlowColor", label: "Horizon Glow" },
  { key: "fogColor", label: "Fog" },
  { key: "sphereBaseColor", label: "Sphere Fill" },
  { key: "wireframeColor", label: "Wireframe" },
  { key: "sphereGlowColor", label: "Sphere Glow" },
] as const satisfies ReadonlyArray<{
  key: keyof UniverseAppearanceSettings;
  label: string;
}>;

const SLIDER_CONTROLS = [
  {
    key: "horizonGlowStrength",
    label: "Horizon Glow Strength",
    min: 0,
    max: 3,
    step: 0.01,
    digits: 2,
  },
  {
    key: "sphereGlowOpacity",
    label: "Sphere Glow Opacity",
    min: 0,
    max: 0.6,
    step: 0.01,
    digits: 2,
  },
  {
    key: "fogNear",
    label: "Fog Near",
    min: 4,
    max: 80,
    step: 0.5,
    digits: 1,
  },
  {
    key: "fogFar",
    label: "Fog Far",
    min: 8,
    max: 140,
    step: 0.5,
    digits: 1,
  },
] as const satisfies ReadonlyArray<{
  key: keyof UniverseAppearanceSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}>;

type UniverseColorSettingKey = (typeof COLOR_CONTROLS)[number]["key"];
type UniverseNumberSettingKey = (typeof SLIDER_CONTROLS)[number]["key"];

export function UniverseAppearanceEditor({
  settings,
  visible,
  exportStatus,
  onToggleVisibility,
  onReset,
  onExport,
  onColorChange,
  onNumberChange,
}: UniverseAppearanceEditorProps) {
  return (
    <div className={`universe-editor${visible ? " is-visible" : ""}`}>
      <button
        type="button"
        className="universe-editor__toggle"
        onClick={onToggleVisibility}
      >
        {visible ? "Close Editor" : "Edit Colors"}
        <span>Press E</span>
      </button>

      {visible && (
        <aside className="universe-editor__panel">
          <div className="universe-editor__header">
            <div>
              <h2>Universe Appearance</h2>
              <p>Adjust the gradient, horizon, fog, and sphere colors live.</p>
            </div>
            <button
              type="button"
              className="universe-editor__reset"
              onClick={onReset}
            >
              Reset
            </button>
          </div>

          <section className="universe-editor__section">
            <h3>Colors</h3>
            <div className="universe-editor__color-list">
              {COLOR_CONTROLS.map((control) => (
                <label
                  key={control.key}
                  className="universe-editor__color-control"
                >
                  <span>{control.label}</span>
                  <div className="universe-editor__color-inputs">
                    <input
                      type="color"
                      value={settings[control.key]}
                      onChange={(event) =>
                        onColorChange(control.key, event.target.value)
                      }
                    />
                    <code>{settings[control.key]}</code>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="universe-editor__section">
            <h3>Atmosphere</h3>
            <div className="universe-editor__slider-list">
              {SLIDER_CONTROLS.map((control) => (
                <label
                  key={control.key}
                  className="universe-editor__slider-control"
                >
                  <div className="universe-editor__slider-header">
                    <span>{control.label}</span>
                    <code>{settings[control.key].toFixed(control.digits)}</code>
                  </div>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={settings[control.key]}
                    onChange={(event) =>
                      onNumberChange(control.key, Number(event.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="universe-editor__footer">
            <button
              type="button"
              className="universe-editor__export"
              onClick={onExport}
            >
              Export JSON
            </button>
            <span className="universe-editor__status">
              {exportStatus ?? "Downloads the current universe appearance preset"}
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}
