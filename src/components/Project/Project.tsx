"use client";
import { Project as ProjectType } from "@/data/projects";
import React, { useState } from "react";
import Image from "next/image";
import "./Project.scss";
import { PlaceholderImage } from "../PlaceholderImage/PlaceholderImage";
import { ProjectTags } from "../ProjectTags/ProjectTags";
export default function Project({
  data,
  onClick,
}: {
  data: ProjectType;
  onClick: () => void;
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const { title, summary, languages } = data;
  const handleMouseMove = (event: React.MouseEvent) => {
    const target = event.target;
    // while (target.className != 'project-container'){
    // 	target = target.parentElement
    // }
    if (!(target instanceof HTMLElement)) return;
    const rect = target.getBoundingClientRect();
    setCoords({
      x:
        (event.clientX - rect.left - target.offsetWidth / 2) /
        target.offsetWidth,
      y:
        (event.clientY - rect.top - target.offsetHeight / 2) /
        target.offsetHeight,
    });
  };
  const style = {
    "--t-x-1": coords.x * -10 + "px",
    "--t-y-1": coords.y * -10 + "px",
    "--t-b": (coords.y * coords.y + coords.x * coords.x) * 10 + "px",
  };
  return (
    <article className="project-container" onClick={onClick}>
      <div className="img-container">
        {data.img ? (
          <Image
            src={data.img}
            alt={`${title} project preview`}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="project-image"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <PlaceholderImage seed={title} />
        )}
      </div>
      <div className="project-contents">
        <h2
          className="project-title"
          style={style as React.CSSProperties}
          onMouseMove={handleMouseMove}
          data-text={title}
        >
          <div>{title}</div>
          <div className="links">
            {data.links?.map((link) => (
              <a href={link.link} key={link.link}>
                {link.img ? (
                  <Image
                    src={link.img}
                    alt={`${title} ${link.description}`}
                    width={40}
                    height={40}
                    className="project-link-icon"
                  />
                ) : (
                  link.description
                )}{" "}
              </a>
            )) || ""}
          </div>
        </h2>
        <ProjectTags languages={languages} />
        <section className="project-summary">
          <p>{summary}</p>
        </section>
      </div>
    </article>
  );
}
