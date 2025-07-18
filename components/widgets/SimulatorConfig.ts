// Shared configuration for Evidence Accumulation and Cross-Entropy simulators
export const CHART_CONFIG = {
  margins: { 
    mobile: { top: 1, right: 8, left: 15, bottom: 20 },
    desktop: { top: 5, right: 40, left: 30, bottom: 35 }
  },
  height: {
    normal: "h-96",
    zoomed: "h-full",
  },
  colors: {
    evidence: "#8b5cf6", // violet
    trueP: "#2563eb", // blue (truth p) - also used for entropy curve (full blue)
    klExpected: "#c4b5fd", // faint violet - used for evidence expected rate
    entropy: "#93c5fd", // faint blue - for entropy rate
    modelQ: "#dc2626", // red (model q) - also used for crossentropy curve (full red)
    crossentropyRate: "#fca5a5", // faint red - for crossentropy rate
    klDivergence: "#c4b5fd", // faint violet - for KL divergence line
    // Full versions for activeDots on faint lines
    entropyFull: "#2563eb", // full blue - for dots on faint blue entropy rate
    crossentropyRateFull: "#dc2626", // full red - for dots on faint red crossentropy rate
    klDivergenceFull: "#8b5cf6", // full violet - for dots on faint violet KL divergence
    // Gray colors for speed and control elements
    speed: "#6b7280", // gray for speed controls
  },
  animation: {
    transitionDuration: 300,
    isAnimationActive: false,
  },
  controls: {
    defaultSpeed: 50,
    defaultNumFlips: 200,
    speedRange: { min: 10, max: 500, step: 10 },
    flipsRange: { min: 10, max: 500, step: 10 },
    probRange: { min: 0.01, max: 0.99, step: 0.01 },
  },
};

// Shared button styles
export const BUTTON_STYLES = {
  primary: {
    running: "bg-yellow-500 hover:bg-yellow-600",
    stopped: "bg-blue-500 hover:bg-blue-600",
  },
  secondary: "bg-gray-500 hover:bg-gray-600",
  zoom: "bg-blue-500 hover:bg-blue-600",
  base: "px-4 py-2 rounded-md font-medium text-white",
  small: "px-3 py-1 text-xs rounded font-medium text-white",
};

// Shared input styles  
export const INPUT_STYLES = {
  rangeColors: {
    trueP: "bg-blue-200 slider-thumb-blue",
    modelQ: "bg-red-200 slider-thumb-red", 
    flips: "bg-gray-200 slider-thumb-gray",
    speed: "bg-gray-200 slider-thumb-gray",
  },
  base: "w-full h-2 rounded-lg appearance-none cursor-pointer",
};
