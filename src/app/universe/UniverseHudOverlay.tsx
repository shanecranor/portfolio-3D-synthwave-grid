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

  if (!renderedSection) {
    return null;
  }

  const style = {
    "--hud-accent": renderedSection.accent,
    "--hud-accent-rgb": renderedSection.accentRgb,
  } as CSSProperties;

  return (
    <aside
      className={`universe-hud${isVisible ? " is-visible" : ""}${isRefreshing ? " is-refreshing" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <div className="universe-hud__frame">
        <div className="universe-hud__corner universe-hud__corner--top-left" />
        <div className="universe-hud__corner universe-hud__corner--top-right" />
        <div className="universe-hud__corner universe-hud__corner--bottom-left" />
        <div className="universe-hud__corner universe-hud__corner--bottom-right" />

        <div className="universe-hud__header">
          <span className="universe-hud__eyebrow">Target Interface</span>
          <span className="universe-hud__status">{renderedSection.status}</span>
        </div>

        <div className="universe-hud__content">
          <h2 className="universe-hud__title">{renderedSection.label}</h2>
          <p className="universe-hud__description">
            {renderedSection.description}
          </p>

          <ul className="universe-hud__tags">
            {renderedSection.tags.map((tag) => (
              <li className="universe-hud__tag" key={tag}>
                {tag}
              </li>
            ))}
          </ul>
        </div>

        <div className="universe-hud__footer">
          <span className="universe-hud__action">{renderedSection.actionLabel}</span>
        </div>

        <div className="universe-hud__reticle" />
      </div>
    </aside>
  );
}
