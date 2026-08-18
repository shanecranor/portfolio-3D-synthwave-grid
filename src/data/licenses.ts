export type LicenseCategory = "3D models" | "Fonts";

export type LicenseEntry = {
  category: LicenseCategory;
  name: string;
  assetUrl: string;
  author: string;
  authorUrl?: string;
  license: string;
  licenseUrl: string;
};

export const LICENSE_ENTRIES: LicenseEntry[] = [
  {
    category: "3D models",
    name: "Old Computer",
    assetUrl:
      "https://sketchfab.com/3d-models/old-computer-6dc2702f05e847be941a5587596fe624",
    author: "sookendestroy1",
    authorUrl: "https://sketchfab.com/sookendestroy1",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    category: "3D models",
    name: "Low polygons Shiho's bass",
    assetUrl:
      "https://sketchfab.com/3d-models/low-polygons-shihos-bass-9da4c87f5ed84c8fb00f823f969bd142",
    author: "Resix6",
    authorUrl: "https://sketchfab.com/Resix6",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    category: "3D models",
    name: "Reflex camera",
    assetUrl:
      "https://sketchfab.com/3d-models/reflex-camera-228d92307870440496e23b95b6c5b2a4",
    author: "1-3D.com",
    authorUrl: "https://sketchfab.com/1-3D.com",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    category: "Fonts",
    name: "Astro Armada",
    assetUrl: "https://www.iconian.com/commercial.html",
    author: "Dan Zadorozny / Iconian Fonts",
    authorUrl: "https://www.iconian.com/commercial.html",
    license: "Iconian Fonts terms",
    licenseUrl: "https://www.iconian.com/commercial.html",
  },
  {
    category: "Fonts",
    name: "Orbitron, Inter, Open Sans, and Poppins",
    assetUrl: "https://fonts.google.com/",
    author: "Matt McInerney; Inter, Open Sans, and Poppins via Google Fonts",
    license: "SIL Open Font License 1.1",
    licenseUrl: "https://scripts.sil.org/OFL",
  },
];
