type Language = {
  language: string;
  img?: string;
  color?: string;
};
export const languages: Language[] = [
  {
    language: "JavaScript",
    img: "languageIcons/JavaScript.svg",
    color: "#f7df1e",
  },
  {
    language: "TypeScript",
    img: "languageIcons/TypeScript.svg",
    color: "#70a4db",
  },
  {
    language: "VueJS",
    img: "languageIcons/VueJS.svg",
    color: "#41b883",
  },
  {
    language: "Cloudflare Workers",
    img: "languageIcons/CloudflareWorkers.svg",
    color: "#f38020",
  },
  {
    language: "NodeJS",
    img: "languageIcons/NodeJS.svg",
    color: "#68a063",
  },
  {
    language: "Supabase",
    img: "languageIcons/Supabase.svg",
    color: "#4cffae",
  },
  {
    language: "NextJS",
    img: "languageIcons/NextJS.svg",
    color: "#000000",
  },
  {
    language: "React",
    img: "languageIcons/React.svg",
    color: "#61dafb",
  },
  {
    language: "React Native",
    img: "languageIcons/ExpoGo.svg",
    color: "#000000",
  },
  {
    language: "FastAPI",
    img: "languageIcons/FastAPI.svg",
    color: "#00bfac",
  },
  {
    language: "PostgreSQL",
    img: "languageIcons/PostgreSQL.svg",
    color: "#4d9ddd", //"#336791",
  },
  {
    language: "MySQL",
    img: "languageIcons/MySQL.svg",
    color: "#4eabd3",
  },
  {
    language: "GraphQL",
    img: "languageIcons/GraphQL.svg",
    color: "#ff66cc",
  },
  {
    language: "MongoDB",
    img: "languageIcons/MongoDB.svg",
    color: "#4db33d",
  },
  {
    language: "HTML",
    img: "languageIcons/HTML5.svg",
    color: "#f09e8a",
  },
  {
    language: "CSS",
    img: "languageIcons/CSS.svg",
    color: "#607ceb",
  },
  {
    language: "Bash Shell",
    color: "#4eaa25",
  },
  {
    language: "DOS Batch Script (BAT)",
  },
  {
    language: "AutoHotKey",
  },
  {
    language: "OpenCV",
    color: "#5c3ee8",
  },
  {
    language: "PixiJS",
    img: "languageIcons/PixiJS.svg",
    color: "#ff69b4",
  },
  {
    language: "ThreeJS",
    color: "#000000",
  },
  {
    language: "Embedded C / Arduino C",
    img: "languageIcons/Arduino.svg",
    color: "#00979d",
  },
  {
    language: "P5JS",
    color: "#ed225d",
  },

  {
    language: "Java",
    img: "languageIcons/Java.svg",
    color: "#4e7896",
  },

  {
    language: "C++",
    color: "#00599c",
  },

  {
    language: "Scratch",
  },
  {
    language: "Python",
    img: "languageIcons/Python.svg",
    color: "#3776ab",
  },
  {
    language: "Processing",
  },
  {
    language: "Quartz Composer",
  },

  {
    language: "Assembly (MIPS)",
  },
  {
    language: "PHP",
  },
  {
    language: "Perl",
    img: "languageIcons/Perl.svg",
    color: "#7f87ff",
  },
];

export const languagesMap = new Map<string, Language>();

languages.forEach((language) => {
  languagesMap.set(language.language, language);
});
