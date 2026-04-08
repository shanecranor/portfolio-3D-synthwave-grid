"use client";

import "./page.scss";
import { TitleTestScene, TITLE_VARIANTS } from "./TitleTestScene";

export default function Page() {
  return (
    <main className="title-test-page">
      <div className="title-test-page__canvas">
        <TitleTestScene />
      </div>

      <div className="title-test-page__overlay" aria-hidden="true">
        {TITLE_VARIANTS.map((variant) => (
          <section key={variant.id} className="title-test-page__quadrant">
            <div className="title-test-page__badge">{variant.id}</div>
            <div className="title-test-page__meta">
              <span>{variant.name}</span>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
