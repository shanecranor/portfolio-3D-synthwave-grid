type Language = {
  language: string;
  img?: string;
  color?: string;
  fluency: number;
};
export const languages: Language[] = [
  {
    language: "JavaScript",
    img: "languageIcons/JavaScript.svg",
    color: "#f7df1e",
    fluency: 90,
  },
  {
    language: "TypeScript",
    img: "languageIcons/TypeScript.svg",
    color: "#70a4db",
    fluency: 90,
  },
  {
    language: "Cloudflare Workers",
    img: "languageIcons/CloudflareWorkers.svg",
    color: "#f38020",
    fluency: 90,
  },
  {
    language: "NodeJS",
    img: "languageIcons/NodeJS.svg",
    color: "#68a063",
    fluency: 75,
  },
  {
    language: "Supabase",
    img: "languageIcons/Supabase.svg",
    color: "#4cffae",
    fluency: 80,
  },
  {
    language: "NextJS",
    img: "languageIcons/NextJS.svg",
    color: "#000000",
    fluency: 70,
  },
  {
    language: "React",
    img: "languageIcons/React.svg",
    color: "#61dafb",
    fluency: 70,
  },
  {
    language: "React Native",
    img: "languageIcons/ExpoGo.svg",
    color: "#000000",
    fluency: 70,
  },
  {
    language: "FastAPI",
    img: "languageIcons/FastAPI.svg",
    color: "#00bfac",
    fluency: 70,
  },
  {
    language: "PostgreSQL",
    img: "languageIcons/PostgreSQL.svg",
    color: "#4d9ddd", //"#336791",
    fluency: 80,
  },
  {
    language: "GraphQL",
    img: "languageIcons/GraphQL.svg",
    color: "#ff66cc",
    fluency: 70,
  },
  {
    language: "MongoDB",
    img: "languageIcons/MongoDB.svg",
    color: "#4db33d",
    fluency: 70,
  },
  {
    language: "HTML",
    img: "languageIcons/HTML5.svg",
    color: "#f09e8a",
    fluency: 100,
  },
  {
    language: "CSS",
    img: "languageIcons/CSS.svg",
    color: "#607ceb",
    fluency: 90,
  },
  {
    language: "Bash Shell",
    color: "#4eaa25",
    fluency: 80,
  },
  {
    language: "DOS Batch Script (BAT)",

    fluency: 60,
  },
  {
    language: "AutoHotKey",
    fluency: 50,
  },
  {
    language: "OpenCV",
    fluency: 80,
    color: "#5c3ee8",
  },
  {
    language: "PixiJS",
    fluency: 80,
    img: "languageIcons/PixiJS.svg",
    color: "#ff69b4",
  },
  {
    language: "ThreeJS",
    fluency: 45,
    color: "#000000",
  },
  {
    language: "Embedded C / Arduino C",
    img: "languageIcons/Arduino.svg",
    fluency: 70,
    color: "#00979d",
  },
  {
    language: "P5JS",
    fluency: 80,
    color: "#ed225d",
  },

  {
    language: "Java",
    img: "languageIcons/Java.svg",
    fluency: 60,
    color: "#4e7896",
  },

  {
    language: "C++",
    fluency: 70,
    color: "#00599c",
  },

  {
    language: "Scratch",
    fluency: 100,
  },
  {
    language: "Python",
    img: "languageIcons/Python.svg",
    fluency: 80,
    color: "#3776ab",
  },
  {
    language: "Processing",
    fluency: 80,
  },
  {
    language: "Quartz Composer",
    fluency: 90,
  },

  {
    language: "Assembly (MIPS)",
    fluency: 70,
  },
  {
    language: "PHP",
    fluency: 69,
  },
];

export const languagesMap = new Map<string, Language>();

languages.forEach((language) => {
  languagesMap.set(language.language, language);
});
