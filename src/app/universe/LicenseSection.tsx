import { LICENSE_ENTRIES, type LicenseCategory } from "@/data/licenses";
import "./LicenseSection.scss";

const LICENSE_CATEGORIES: LicenseCategory[] = ["3D models", "Fonts"];

function LicenseEntry({
  name,
  assetUrl,
  author,
  authorUrl,
  license,
  licenseUrl,
}: (typeof LICENSE_ENTRIES)[number]) {
  return (
    <li>
      <a
        className="license-section__link"
        href={assetUrl}
        target="_blank"
        rel="noreferrer"
      >
        {name}
      </a>{" "}
      by{" "}
      {authorUrl ? (
        <a
          className="license-section__link"
          href={authorUrl}
          target="_blank"
          rel="noreferrer"
        >
          {author}
        </a>
      ) : (
        author
      )}{" "}
      —{" "}
      <a
        className="license-section__link"
        href={licenseUrl}
        target="_blank"
        rel="noreferrer"
      >
        {license}
      </a>
      .
    </li>
  );
}

export function LicenseSection() {
  return (
    <footer className="license-section" aria-labelledby="licenses-title">
      <p id="licenses-title" className="license-section__kicker">
        Asset Licenses
      </p>
      <div className="license-section__grid">
        {LICENSE_CATEGORIES.map((category) => {
          const entries = LICENSE_ENTRIES.filter(
            (entry) => entry.category === category,
          );

          return (
            <section
              key={category}
              aria-labelledby={`${category}-credits-title`}
            >
              <h3
                className="license-section__heading"
                id={`${category}-credits-title`}
              >
                {category}
              </h3>
              {category === "3D models" && (
                <p className="license-section__note">
                  Models are rendered as wireframes and restyled.
                </p>
              )}
              <ul className="license-section__list">
                {entries.map((entry) => (
                  <LicenseEntry key={entry.name} {...entry} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </footer>
  );
}
