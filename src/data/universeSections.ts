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
  spherePosition: [number, number, number];
  modelPose: {
    rotation: [number, number, number];
    revealRotationOffset: [number, number, number];
    scale: number;
  };
  external?: boolean;
};

export const UNIVERSE_INTRO_SPHERE_POSITION: [number, number, number] = [
  0, 0, 0,
];

export const UNIVERSE_SECTIONS: Record<UniverseSectionId, UniverseSectionData> =
  {
    projects: {
      id: "projects",
      label: "Projects",
      description:
        "I work as a fullstack software engineer and spend much of my free time working on cool cross discipline projects.",
      tags: ["Web", "Open Source", "Electronics", "3D Printing", "Games"],
      status: "Building Stuff",
      actionLabel: "Check it out!",
      href: "/code",
      accent: "#73d1ad",
      accentRgb: "115, 209, 173",
      spherePosition: [0, -0.75, -2],
      modelPose: {
        rotation: [0.2, -Math.PI / 2, 0],
        revealRotationOffset: [-0.18, -0.58, 0.08],
        scale: 1,
      },
    },
    photography: {
      id: "photography",
      label: "Photography",
      description:
        "Taking pictures of whatever catches my eye. Designing 3D printed adapters for niche vintage lenses.",
      tags: ["Nikon Z6", "Darktable", "Super-Multi-Coated TAKUMAR 50mm f/1.4"],
      status: "bogos binted",
      actionLabel: "Photos",
      href: "/photos",
      accent: "#ff86f7",
      accentRgb: "255, 134, 247",
      spherePosition: [-3, -0.75, -4.5],
      modelPose: {
        rotation: [0, -1.1, 0.1],
        revealRotationOffset: [-0.16, -0.62, -0.1],
        scale: 1,
      },
    },
    music: {
      id: "music",
      label: "Music",
      description:
        "In my free time, I play bass, guitar, drums, keyboard, and make electronic music. Listen to the rock album I wrote, recorded, & produced with my friends: Hotbed of Descent by The Electric Army.",
      tags: [],
      status: "head banging",
      actionLabel: "Rock out",
      href: "/music",
      accent: "#73b4ff",
      accentRgb: "115, 180, 255",
      spherePosition: [0, 0, -10],
      modelPose: {
        rotation: [Math.PI / 2 + 0.6, Math.PI - 0.9, 0],
        revealRotationOffset: [0, -0.5, 0.18],
        scale: 1,
      },
    },
  };
