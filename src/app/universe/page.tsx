"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ThreeJsUniverse } from "./ThreeJsUniverse";
import {
  UNIVERSE_SECTIONS,
  type UniverseSectionId,
} from "@/data/universeSections";
import "./page.scss";

const SECTION_ORDER: UniverseSectionId[] = [
  "projects",
  "photography",
  "music",
];

const SECTION_NUMBERS: Record<UniverseSectionId, string> = {
  projects: "01",
  photography: "02",
  music: "03",
};

const EXPLORE_FADE_VIEWPORT_FRACTION = 0.35;

// 1 preserves the original crossfade. Higher values shrink both models more
// around the midpoint, reducing how much they visually overlap.
const MAIN_TRANSITION_CURVE_EXPONENT = 2;

type UniverseSceneId = "intro" | UniverseSectionId;

type UniverseScrollState = {
  activeSectionId: UniverseSectionId | null;
  exploreProgress: number;
  revealProgress: Record<UniverseSceneId, number>;
};

const INITIAL_SCROLL_STATE: UniverseScrollState = {
  activeSectionId: null,
  exploreProgress: 1,
  revealProgress: {
    intro: 1,
    projects: 0,
    photography: 0,
    music: 0,
  },
};

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function smootherStep(progress: number) {
  const t = clampProgress(progress);

  // Zero velocity and acceleration at each page center keeps the object nearly
  // still there, while the pose continues changing everywhere in between.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export default function UniversePage() {
  const [scrollState, setScrollState] =
    useState<UniverseScrollState>(INITIAL_SCROLL_STATE);
  const { activeSectionId, exploreProgress, revealProgress } = scrollState;

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-universe-stage]"),
    );
    let frameId: number | undefined;

    const updateActiveSection = () => {
      frameId = undefined;
      const scrollY = window.scrollY;
      const viewportCenter = window.innerHeight / 2;
      const stageIds = sections.map(
        (section) => section.dataset.universeStage as UniverseSceneId,
      );
      const pageCenters = sections.map((section) => {
        const bounds = section.getBoundingClientRect();

        return bounds.top + scrollY + bounds.height / 2 - viewportCenter;
      });
      const nextRevealProgress: Record<UniverseSceneId, number> = {
        intro: 0,
        projects: 0,
        photography: 0,
        music: 0,
      };
      let activeIndex: number;

      if (scrollY <= pageCenters[0]) {
        activeIndex = 0;
        nextRevealProgress[stageIds[activeIndex]] = 1;
      } else if (scrollY >= pageCenters[pageCenters.length - 1]) {
        activeIndex = pageCenters.length - 1;
        nextRevealProgress[stageIds[activeIndex]] = 1;
      } else {
        const nextIndex = pageCenters.findIndex((center) => center >= scrollY);
        const previousIndex = nextIndex - 1;
        const segmentLength = Math.max(
          pageCenters[nextIndex] - pageCenters[previousIndex],
          1,
        );
        const linearProgress =
          (scrollY - pageCenters[previousIndex]) / segmentLength;
        const curvedProgress = smootherStep(linearProgress);

        nextRevealProgress[stageIds[previousIndex]] = Math.pow(
          1 - curvedProgress,
          MAIN_TRANSITION_CURVE_EXPONENT,
        );
        nextRevealProgress[stageIds[nextIndex]] = Math.pow(
          curvedProgress,
          MAIN_TRANSITION_CURVE_EXPONENT,
        );
        activeIndex = curvedProgress < 0.5 ? previousIndex : nextIndex;
      }

      const activeStageId = stageIds[activeIndex];
      const exploreFadeDistance = Math.max(
        window.innerHeight * EXPLORE_FADE_VIEWPORT_FRACTION,
        1,
      );
      setScrollState({
        activeSectionId:
          activeStageId === "intro" ? null : activeStageId,
        exploreProgress:
          1 - smootherStep(scrollY / exploreFadeDistance),
        revealProgress: nextRevealProgress,
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== undefined) return;
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="universe-page">
      <div className="three-js-canvas">
        <ThreeJsUniverse
          activeSectionId={activeSectionId}
          revealProgress={revealProgress}
        />
      </div>

      <header className="universe-masthead">
        <a href="#intro" aria-label="Back to the beginning">
          SZC
        </a>
        {/* <span>Selected works</span> */}
      </header>

      <nav className="universe-jump-nav" aria-label="Universe sections">
        <a
          href="#intro"
          className={activeSectionId === null ? "is-active" : undefined}
          aria-label="Introduction"
        >
          <span>Home</span>
        </a>
        {SECTION_ORDER.map((sectionId) => (
          <a
            key={sectionId}
            href={`#${sectionId}`}
            className={activeSectionId === sectionId ? "is-active" : undefined}
            aria-label={UNIVERSE_SECTIONS[sectionId].label}
          >
            <span>{UNIVERSE_SECTIONS[sectionId].label}</span>
          </a>
        ))}
      </nav>

      <main className="universe-story">
        <section
          id="intro"
          className="universe-stage universe-intro"
          data-universe-stage="intro"
        >
          <h1 className="sr-only">Shane Cranor</h1>
          <div className="universe-intro-copy">
            {/* <p>Developer · Musician · Photographer</p> */}
            <a
              className={`universe-explore${
                exploreProgress <= 0 ? " is-hidden" : ""
              }`}
              href="#projects"
              style={{ opacity: exploreProgress }}
              aria-hidden={exploreProgress <= 0}
              tabIndex={exploreProgress <= 0 ? -1 : undefined}
            >
              Explore
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        {SECTION_ORDER.map((sectionId, index) => {
          const section = UNIVERSE_SECTIONS[sectionId];
          const linkProps = section.external
            ? { target: "_blank", rel: "noreferrer" }
            : {};

          return (
            <section
              key={sectionId}
              id={sectionId}
              className={`universe-stage universe-artifact-stage ${
                index % 2 === 0 ? "copy-right" : "copy-left"
              }`}
              data-universe-stage={sectionId}
              style={
                {
                  "--section-accent": section.accent,
                  "--section-accent-rgb": section.accentRgb,
                } as CSSProperties
              }
            >
              <article className="universe-artifact-copy">
                <p className="universe-section-number">
                  {SECTION_NUMBERS[sectionId]} / {section.status}
                </p>
                <h2>{section.label}</h2>
                <p className="universe-section-description">
                  {section.description}
                </p>
                <ul className="universe-section-tags" aria-label="Highlights">
                  {section.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                {section.external ? (
                  <a
                    className="universe-section-link"
                    href={section.href}
                    {...linkProps}
                  >
                    {section.actionLabel}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <Link className="universe-section-link" href={section.href}>
                    {section.actionLabel}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </article>
            </section>
          );
        })}
      </main>
    </div>
  );
}
