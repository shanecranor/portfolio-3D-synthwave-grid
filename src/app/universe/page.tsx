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

export default function UniversePage() {
  const [activeSectionId, setActiveSectionId] =
    useState<UniverseSectionId | null>(null);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-universe-stage]"),
    );
    let frameId: number | undefined;

    const updateActiveSection = () => {
      frameId = undefined;
      const viewportCenter = window.innerHeight / 2;
      const activeSection = sections.find((section) => {
        const bounds = section.getBoundingClientRect();
        return bounds.top <= viewportCenter && bounds.bottom > viewportCenter;
      });
      const nextSectionId = activeSection?.dataset.universeStage;

      setActiveSectionId(
        !nextSectionId || nextSectionId === "intro"
          ? null
          : (nextSectionId as UniverseSectionId),
      );
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
        <ThreeJsUniverse activeSectionId={activeSectionId} />
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
            <a className="universe-explore" href="#projects">
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
