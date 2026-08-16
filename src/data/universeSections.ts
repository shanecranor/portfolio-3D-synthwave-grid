export type UniverseSectionId = "photography" | "projects" | "music" | "end";

export type UniverseModelAppearance = {
  fillColor: string;
  wireframeColor: string;
  wireframeColorIntensity?: number;
  wireframeOpacity: number;
};

export type UniverseSectionData =
  | {
      type: "full";
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
      sphereColorSaturationMultiplier: number;
      modelPose: {
        rotation: [number, number, number];
        revealRotationOffset: [number, number, number];
        scale: number;
      };
      modelAppearance: UniverseModelAppearance;
      external?: boolean;
    }
  | {
      type: "empty";
      id: UniverseSectionId;
      accent: string;
      accentRgb: string;
      spherePosition: [number, number, number];
      sphereColorSaturationMultiplier: number;
    };

export const UNIVERSE_INTRO_SPHERE_POSITION: [number, number, number] = [
  0, 0, 0,
];

export const UNIVERSE_SECTIONS: Record<UniverseSectionId, UniverseSectionData> =
  {
    projects: {
      type: "full",
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
      sphereColorSaturationMultiplier: 0.8,
      modelPose: {
        rotation: [0.2, -Math.PI / 2, 0],
        revealRotationOffset: [-0.18, -0.58, 0.08],
        scale: 1,
      },
      modelAppearance: {
        fillColor: "#000000",
        wireframeColor: "#8cd6b9",
        wireframeOpacity: 0.24,
      },
    },
    photography: {
      type: "full",
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
      sphereColorSaturationMultiplier: 0.8,
      modelPose: {
        rotation: [0, -1.1, 0.1],
        revealRotationOffset: [-0.16, -0.62, -0.1],
        scale: 1,
      },
      modelAppearance: {
        fillColor: "#050505",
        wireframeColor: "#f2aced",
        wireframeOpacity: 0.3,
      },
    },
    music: {
      type: "full",
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
      sphereColorSaturationMultiplier: 1,
      modelPose: {
        rotation: [Math.PI / 2 + 0.6, Math.PI - 0.9, 0],
        revealRotationOffset: [0, -0.5, 0.18],
        scale: 1,
      },
      modelAppearance: {
        fillColor: "#040814",
        wireframeColor: "#73b4ff",
        wireframeColorIntensity: 1.35,
        wireframeOpacity: 0.14,
      },
    },
    end: {
      type: "empty",
      id: "end",
      accent: "#444444",
      accentRgb: "68, 68, 68",
      spherePosition: [0, 10, -30],
      sphereColorSaturationMultiplier: 1,
    },
  };
