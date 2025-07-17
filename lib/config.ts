import { join } from "path";

export const TITLE = "Bayes, bits & brains";
export const DESCRIPTION = "Bayes, bits & brains";
export const TITLE_SHORT = "Bayes, bits & brains";
export const TITLE_ABBR = "BBB";
// Part structure
export const PARTS = [
  {
    name: "Intro",
    chapters: [["Riddles", "00-riddles"]],
  },
  {
    name: "Part I: Foundations",
    chapters: [
      ["Bayes & KL divergence", "01-kl_intro"],
      ["Crossentropy & Entropy", "02-crossentropy"],
      ["KL & Entropy properties", "03-entropy_properties"],
    ],
  },
  {
    name: "Part II: Optimization",
    chapters: [
      ["Maximum likelihood", "04-mle"],
      ["Maximum entropy", "05-max_entropy"],
      ["Loss functions", "07-machine_learning"],
    ],
  },
  {
    name: "Part III: Compression",
    chapters: [
      ["Coding theory", "08-coding_theory"],
    ],
  },
];

// Meta pages (always visible)
export const META_PAGES = [
  ["About", "about"],
  ["Resources", "resources"],
  ["Graveyard", "bonus"],
];

// For backward compatibility
export const MAIN_CHAPTERS = [
  ...PARTS[0].chapters,
  ["", ""], // Gap
  ...PARTS[1].chapters,
  ["", ""], // Gap
  ...PARTS[2].chapters,
  ["", ""], // Gap
  ...META_PAGES,
];

export const BONUS_CHAPTERS = [
  ["Kolmogorov complexity", "09-kolmogorov"],
  ...PARTS[3].chapters,
];

// Combined chapters for compatibility
export const CHAPTERS = [
  ...MAIN_CHAPTERS,
  ["", ""], // Gap
  ...BONUS_CHAPTERS,
];
export const rootSlug = "00-riddles";
export const contentDirectory = join(process.cwd(), "public");
export const GTM_ID = undefined;
export const referencesPath = join(contentDirectory, "references.bib");
