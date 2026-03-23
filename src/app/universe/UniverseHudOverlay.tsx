"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type {
  UniverseSectionData,
  UniverseSectionId,
} from "@/data/universeSections";

const HUD_EXIT_DURATION_MS = 260;
const HUD_REFRESH_DURATION_MS = 280;

const SECTION_INSTRUMENTS: Record<
  UniverseSectionId,
  {
    channel: string;
    mode: string;
    scope: string;
    waveform: number[];
  }
> = {
  photography: {
    channel: "CH-01",
    mode: "ARCHIVE",
    scope: "FRAME",
    waveform: [24, 42, 20, 54, 28, 36],
  },
  projects: {
    channel: "CH-02",
    mode: "SIGNAL",
    scope: "VECTOR",
    waveform: [18, 58, 30, 48, 24, 62],
  },
  music: {
    channel: "CH-03",
    mode: "PLAYBACK",
    scope: "LEVEL",
    waveform: [46, 22, 58, 32, 62, 28],
  },
};

type UniverseHudOverlayProps = {
  section: UniverseSectionData | null;
};

export function UniverseHudOverlay({ section }: UniverseHudOverlayProps) {
  const [renderedSection, setRenderedSection] =
    useState<UniverseSectionData | null>(section);
  const [isVisible, setIsVisible] = useState(Boolean(section));
  const [isRefreshing, setIsRefreshing] = useState(Boolean(section));

  useEffect(() => {
    let frameId: number | undefined;
    let timeoutId: number | undefined;

    if (section) {
      frameId = window.requestAnimationFrame(() => {
        setRenderedSection(section);
        setIsVisible(true);
        setIsRefreshing(true);
      });
      timeoutId = window.setTimeout(() => {
        setIsRefreshing(false);
      }, HUD_REFRESH_DURATION_MS);

      return () => {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setIsRefreshing(false);
      setIsVisible(false);
    });
    timeoutId = window.setTimeout(() => {
      setRenderedSection(null);
    }, HUD_EXIT_DURATION_MS);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [section]);

  const activeSection = renderedSection;
  const activeInstrument = activeSection
    ? SECTION_INSTRUMENTS[activeSection.id]
    : null;
  const metadata = activeSection && activeInstrument
    ? [activeInstrument.mode, activeSection.tags[0]].filter(
        (item): item is string => Boolean(item),
      )
    : [];
  const style = {
    "--hud-accent": activeSection?.accent ?? "#b09cff",
    "--hud-accent-rgb": activeSection?.accentRgb ?? "176, 156, 255",
  } as CSSProperties;

  return (
    <aside
      className={`universe-hud${activeSection ? " is-armed" : ""}${isVisible ? " is-visible" : ""}${isRefreshing ? " is-refreshing" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <div className="universe-hud__shell">
        <div className="universe-hud__drift" />

        <div className="universe-hud__status-strip">
          <span className="universe-hud__led" />
          <span className="universe-hud__microcopy">SIGNAL</span>
          <span className="universe-hud__microcopy universe-hud__microcopy--accent">
            {activeSection ? "TUNING" : "STANDBY"}
          </span>
        </div>

        {activeSection && activeInstrument ? (
          <>
            <div className="universe-hud__readout">
              <div className="universe-hud__readout-header">
                <span className="universe-hud__microcopy">CHANNEL</span>
                <span className="universe-hud__microcopy universe-hud__microcopy--accent">
                  {activeInstrument.channel}
                </span>
              </div>

              <div className="universe-hud__readout-rule" />

              <div className="universe-hud__display-frame">
                <span className="universe-hud__display-bracket universe-hud__display-bracket--left" />
                <span className="universe-hud__display-bracket universe-hud__display-bracket--right" />
                <span className="universe-hud__display-label">VFD</span>
                <span className="universe-hud__display">{activeSection.label}</span>
              </div>

              <div className="universe-hud__metadata-line">
                {metadata.map((item) => (
                  <span className="universe-hud__microcopy" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="universe-hud__scope">
              <div className="universe-hud__scope-header">
                <span className="universe-hud__microcopy">PLAYBACK</span>
                <span className="universe-hud__microcopy universe-hud__microcopy--accent">
                  {activeInstrument.scope}
                </span>
              </div>

              <div className="universe-hud__bars" aria-hidden="true">
                {activeInstrument.waveform.map((height, index) => (
                  <span
                    className="universe-hud__bar"
                    key={`${activeSection.id}-${index}`}
                    style={
                      {
                        "--bar-height": `${height}%`,
                        "--bar-delay": `${index * 80}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="universe-hud__vectorscope" aria-hidden="true">
                <span className="universe-hud__vector-arc universe-hud__vector-arc--a" />
                <span className="universe-hud__vector-arc universe-hud__vector-arc--b" />
                <span className="universe-hud__vector universe-hud__vector--horizontal" />
                <span className="universe-hud__vector universe-hud__vector--vertical" />
                <span className="universe-hud__vector-core" />
              </div>
            </div>
          </>
        ) : (
          <div className="universe-hud__idle-mark" />
        )}
      </div>
    </aside>
  );
}
