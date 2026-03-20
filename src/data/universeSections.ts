export type UniverseSectionId = "photography" | "projects" | "music";

export type UniverseSectionData = {
  id: UniverseSectionId;
  label: string;
  description: string;
  tags: string[];
  status: string;
  actionLabel: string;
  href: string;
  accent: string;
  accentRgb: string;
  external?: boolean;
};

export const UNIVERSE_SECTIONS: Record<UniverseSectionId, UniverseSectionData> =
  {
    photography: {
      id: "photography",
      label: "Photography",
      description:
        "Framing quiet moments, neon nights, and texture-rich scenes with a cinematic eye.",
      tags: ["Mirrorless", "RAW Workflow", "Street", "Low Light"],
      status: "Hover target locked",
      actionLabel: "Click to enter archive",
      href: "https://shane.cranor.org/photos",
      accent: "#ff86f7",
      accentRgb: "255, 134, 247",
      external: true,
    },
    projects: {
      id: "projects",
      label: "Projects",
      description:
        "Interactive builds, experimental interfaces, and full-stack systems tuned for clarity.",
      tags: ["React", "TypeScript", "R3F", "Full Stack"],
      status: "Hover target locked",
      actionLabel: "Click to enter lab",
      href: "/code",
      accent: "#73d1ad",
      accentRgb: "115, 209, 173",
    },
    music: {
      id: "music",
      label: "Music",
      description:
        "Bass-driven songwriting, synth textures, and production work shaped by analog energy.",
      tags: ["Bass", "Synth", "Production", "Mixing"],
      status: "Hover target locked",
      actionLabel: "Click to enter signal",
      href: "/music",
      accent: "#73b4ff",
      accentRgb: "115, 180, 255",
    },
  };

