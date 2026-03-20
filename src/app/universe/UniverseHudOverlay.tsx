"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { UniverseSectionData } from "@/data/universeSections";

const HUD_EXIT_DURATION_MS = 260;
const HUD_REFRESH_DURATION_MS = 280;

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
        <div className="universe-hud__wash" />
        <div className="universe-hud__scanline" />
        <div className="universe-hud__rail universe-hud__rail--top" />
        <div className="universe-hud__rail universe-hud__rail--right" />
        <div className="universe-hud__rail universe-hud__rail--bottom" />
        <div className="universe-hud__rail universe-hud__rail--left" />
        <div className="universe-hud__corner universe-hud__corner--top-left" />
        <div className="universe-hud__corner universe-hud__corner--top-right" />
        <div className="universe-hud__corner universe-hud__corner--bottom-left" />
        <div className="universe-hud__corner universe-hud__corner--bottom-right" />
        <div className="universe-hud__header">
          <span className="universe-hud__eyebrow">Orbital Targeting HUD</span>
          <span className="universe-hud__status">
            {activeSection?.status ?? "Awaiting target acquisition"}
          </span>
        </div>

        <div className="universe-hud__target-cluster">
          <div className="universe-hud__target-ring">
            <span className="universe-hud__target-ring-line universe-hud__target-ring-line--horizontal" />
            <span className="universe-hud__target-ring-line universe-hud__target-ring-line--vertical" />
            <span className="universe-hud__target-ring-orbit" />
            <span className="universe-hud__target-ring-core" />
          </div>
          <div className="universe-hud__target-meta">
            <span className="universe-hud__target-label">
              {activeSection?.label ?? "No target locked"}
            </span>
            <span className="universe-hud__action">
              {activeSection?.actionLabel ??
                "Sweep across the scene to acquire a target"}
            </span>
          </div>
        </div>

        {activeSection ? (
          <div className="universe-hud__content">
            <div className="universe-hud__content-marker" />
            <h2 className="universe-hud__title">{activeSection.label}</h2>
            <p className="universe-hud__description">
              {activeSection.description}
            </p>
            <ul className="universe-hud__tags">
              {activeSection.tags.map((tag) => (
                <li className="universe-hud__tag" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
