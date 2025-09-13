// Single source of truth for KaTeX macros used throughout the site
// This ensures consistency across all math rendering components

export const KATEX_MACROS: Record<string, string> = {
  "\\R": "\\mathbb{R}",
  "\\eps": "\\varepsilon",
  "\\Cov": "\\mathrm{Cov}",
  "\\Var": "\\mathrm{Var}",
  "\\diag": "\\mathrm{diag}",
  "\\erf": "\\mathrm{erf}",
  "\\id": "\\mathrm{id}",
};