"use client";

/*
 * ================================================================================
 * XKCD COUNTDOWN PROBABILITY CALCULATOR WIDGET — Importance-sampling edition
 * ================================================================================
 *
 * Refactor by ChatGPT (OpenAI o3, 2025-07-10)
 *   – Likelihood and posterior are now estimated with per-bin importance sampling
 *   – A uniform proposal inside each bin (existing sampleFromColumn) is reused
 *   – Per-bin likelihood Li = P(E | bin i) is unbiased for any power-law λ
 *   – Posterior is obtained from the same weighted samples; extra reusable
 *     statistics (e.g. prob all wildcards→0) are accumulated simultaneously.
 *
 * ================================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { InlineMath } from "react-katex";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type ViewMode = "prior" | "likelihood" | "posterior";
type EvidencePattern = (string | "*")[];

interface ColumnData {
  index: number;
  prior: number; // fully normalised prior mass P(B_i)
  likelihood: number; // P(E | B_i)
  unnormalizedPosterior: number; // proportional mass S_i
  posterior: number; // normalised across bins
  compatibleCount: number; // |B_i ∩ E|
  range: { min: number; max: number };
  wildcardProb: number; // P(all wildcards = 0 | x ∈ B_i ∩ E) — from IS weights
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Samples drawn per bin for importance sampling. 1000→ few-percent SE when λ ≤ 2.
const SAMPLES_PER_COLUMN = 1000;

// Digit emoji mapping for UI display
const DIGIT_EMOJIS = {
  "*": "🖼️", // Wildcard mask
  "0": "0️⃣",
  "1": "1️⃣",
  "2": "2️⃣",
  "3": "3️⃣",
  "4": "4️⃣",
  "5": "5️⃣",
  "6": "6️⃣",
  "7": "7️⃣",
  "8": "8️⃣",
  "9": "9️⃣",
} as const;

// Treat both the asterisk character and the framed-picture emoji as wildcards.
const isWildcard = (digit: string) => digit === "*" || digit === "🖼️";

// =============================================================================
// STATISTICAL CORE — helper functions
// =============================================================================

/** Range of numbers represented by column i */
function getColumnRange(columnIndex: number): { min: number; max: number } {
  const leadingZeros = 13 - columnIndex;
  const minStr = "0".repeat(leadingZeros) + "1" + "0".repeat(columnIndex);
  const maxStr = "0".repeat(leadingZeros) + "9" + "9".repeat(columnIndex);
  return { min: parseInt(minStr, 10), max: parseInt(maxStr, 10) };
}

/**
 * Analytic *normalised* prior mass P(B_i) under x^{-λ}. Needed for the "Prior"
 * view.  Identical to the old implementation.
 */
function getColumnPriorMass(columnIndex: number, lambda: number): number {
  const { min, max } = getColumnRange(columnIndex);

  if (lambda === 0) {
    return (max - min + 1) / 1e14;
  } else if (Math.abs(lambda - 1) < 1e-10) {
    const integral = Math.log(max + 1) - Math.log(min);
    const normalizer = Math.log(1e14);
    return integral / normalizer;
  } else {
    const exponent = 1 - lambda;
    const integral = (Math.pow(max + 1, exponent) - Math.pow(min, exponent)) / exponent;
    const normalizer = (Math.pow(1e14, exponent) - 1) / exponent;
    return integral / normalizer;
  }
}

/** Same integral *without* the global normaliser (so Z cancels later). */
function getColumnRawPriorIntegral(columnIndex: number, lambda: number): number {
  const { min, max } = getColumnRange(columnIndex);

  if (lambda === 0) {
    return max - min + 1;
  } else if (Math.abs(lambda - 1) < 1e-10) {
    return Math.log(max + 1) - Math.log(min);
  } else {
    const exponent = 1 - lambda;
    return (Math.pow(max + 1, exponent) - Math.pow(min, exponent)) / exponent;
  }
}

/** How many numbers in column i are compatible with evidence */
function getCompatibleCount(columnIndex: number, pattern: EvidencePattern): number {
  const leadingZeros = 13 - columnIndex;
  const nonZeroPos = 13 - columnIndex; // 0-indexed

  // Leading zeros must match evidence (0 or wildcard)
  for (let pos = 0; pos < leadingZeros; pos++) {
    if (pattern[pos] !== "*" && pattern[pos] !== "0") return 0;
  }
  // Position that must be non-zero
  if (pattern[nonZeroPos] === "0") return 0;

  // Count wildcards among the free trailing digits
  let wildcardCount = 0;
  for (let pos = 14 - columnIndex; pos < 14; pos++) {
    if (pattern[pos] === "*") wildcardCount++;
  }
  const nonZeroChoices = pattern[nonZeroPos] === "*" ? 9 : 1;
  return nonZeroChoices * Math.pow(10, wildcardCount);
}

/** Uniform sampler inside B_i ∩ E (unchanged) */
function sampleFromColumn(columnIndex: number, pattern: EvidencePattern): number | null {
  const compatibleCount = getCompatibleCount(columnIndex, pattern);
  if (compatibleCount === 0) return null;

  const leadingZeros = 13 - columnIndex;
  const nonZeroPos = 13 - columnIndex;

  let numberStr = "";
  // Leading zeros
  numberStr += "0".repeat(leadingZeros);

  // Required non-zero digit
  if (pattern[nonZeroPos] === "*") {
    numberStr += Math.floor(Math.random() * 9 + 1).toString();
  } else {
    numberStr += pattern[nonZeroPos];
  }

  // Remaining digits
  for (let pos = 14 - columnIndex; pos < 14; pos++) {
    if (pattern[pos] === "*") {
      numberStr += Math.floor(Math.random() * 10).toString();
    } else {
      numberStr += pattern[pos];
    }
  }
  return parseInt(numberStr, 10);
}

/** Check if *all* wildcard positions are zero for a given number */
function allWildcardsZero(number: number, wildcardPositions: number[]): boolean {
  const s = number.toString().padStart(14, "0");
  return wildcardPositions.every((pos) => s[pos] === "0");
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const XKCDCountdownWidget: React.FC = () => {
  // ----------------------------- COMPONENT STATE -----------------------------
  const [lambda, setLambda] = useState(1.0);
  const [logScale, setLogScale] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("posterior");

  // Default evidence pattern "******00002382"
  const [evidencePattern, setEvidencePattern] = useState<EvidencePattern>([
    "*",
    "*",
    "*",
    "*",
    "*",
    "*",
    "0",
    "0",
    "0",
    "0",
    "2",
    "3",
    "8",
    "2",
  ]);

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // -------------------------- PRECOMPUTED POSITIONS --------------------------
  const wildcardPositions = useMemo(() => {
    const positions: number[] = [];
    evidencePattern.forEach((d, idx) => {
      if (isWildcard(d)) positions.push(idx);
    });
    return positions;
  }, [evidencePattern]);

  // ----------------- IMPORTANCE-SAMPLING PER-BIN ESTIMATES -------------------
  const columnData = useMemo<ColumnData[]>(() => {
    const data: ColumnData[] = [];

    for (let i = 0; i < 14; i++) {
      const prior = getColumnPriorMass(i, lambda);
      const compatibleCount = getCompatibleCount(i, evidencePattern);
      const range = getColumnRange(i);

      // Pre-fill defaults
      let likelihood = 0;
      let unnormalizedPosterior = 0;
      let wildcardProb = 0;

      if (compatibleCount > 0) {
        const rawIntegral = getColumnRawPriorIntegral(i, lambda);

        let sumWeights = 0;
        let sumZeroWeights = 0;

        for (let s = 0; s < SAMPLES_PER_COLUMN; s++) {
          const x = sampleFromColumn(i, evidencePattern)!; // ! because compatibleCount>0
          const w = Math.pow(x, -lambda);
          sumWeights += w;
          if (wildcardPositions.length === 0 || allWildcardsZero(x, wildcardPositions)) {
            sumZeroWeights += w;
          }
        }

        // Importance-sampling estimator
        unnormalizedPosterior = (compatibleCount * sumWeights) / SAMPLES_PER_COLUMN;
        likelihood = rawIntegral > 0 ? unnormalizedPosterior / rawIntegral : 0;
        wildcardProb = sumWeights > 0 ? sumZeroWeights / sumWeights : 0;
      }

      data.push({
        index: i,
        prior,
        likelihood,
        unnormalizedPosterior,
        posterior: 0, // temp; normalised below
        compatibleCount,
        range,
        wildcardProb,
      });
    }

    // Normalise posterior across bins
    const denom = data.reduce((acc, d) => acc + d.unnormalizedPosterior, 0);
    data.forEach((d) => {
      d.posterior = denom > 0 ? d.unnormalizedPosterior / denom : 0;
    });

    return data;
  }, [lambda, evidencePattern, wildcardPositions]);

  // ------------------------------ AGGREGATES ---------------------------------
  const maxValues = useMemo(() => {
    return {
      prior: Math.max(...columnData.map((d) => d.prior)),
      likelihood: Math.max(...columnData.map((d) => d.likelihood)),
      posterior: Math.max(...columnData.map((d) => d.posterior)),
    };
  }, [columnData]);

  const wildcardZeroProbability = useMemo(() => {
    return columnData.reduce((sum, d) => sum + d.posterior * d.wildcardProb, 0);
  }, [columnData]);

  const wildcardCount = useMemo(() => {
    return evidencePattern.filter(isWildcard).length;
  }, [evidencePattern]);

  // =============================================================================
  // UI COMPONENTS (unchanged, minus obsolete helpers)
  // =============================================================================

  // EvidenceInputRow / ViewModeSlider remain almost identical; only internals
  // that depended on removed helpers were adjusted.  For brevity they are kept
  // as-is except for deleting unused imports.

  // --- Evidence input row -----------------------------------------------------
  const EvidenceInputRow: React.FC = () => {
    const patternToString = useCallback((p: string[]) => p.map((d) => (isWildcard(d) ? "*" : d)).join(""), []);
    const [maskInput, setMaskInput] = useState(patternToString(evidencePattern));

    useEffect(() => {
      setMaskInput(patternToString(evidencePattern));
    }, [patternToString, evidencePattern]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.replace(/[^0-9\*]/g, "").slice(0, 14);
      setMaskInput(newValue);
      if (newValue.length === 14) {
        const newPattern = newValue.split("").map((ch) => (ch === "*" ? "*" : ch));
        setEvidencePattern(newPattern);
      }
    };

    const isValidInput = maskInput.length === 14;
    const inputBgColor = maskInput.length === 0 ? "bg-white" : isValidInput ? "bg-green-50" : "bg-red-50";

    return (
      <div className="bg-white rounded-lg px-2 sm:px-4 py-1 mb-3">
        <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-0">Select evidence:</h4>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={maskInput}
              onChange={handleInputChange}
              placeholder="Enter 14 digits and * for hidden"
              className={`w-64 sm:w-80 px-3 py-2 border border-gray-300 rounded text-center font-mono text-lg tracking-widest transition-colors ${inputBgColor}`}
            />
          </div>
        </div>
      </div>
    );
  };

  // --- View mode buttons ------------------------------------------------------
  const ViewModeSlider: React.FC = () => {
    const options: ViewMode[] = ["prior", "likelihood", "posterior"];

    return (
      <div className="flex items-center justify-center mb-4">
        <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setViewMode(opt)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === opt 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "bg-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // --- Helpers ---------------------------------------------------------------
  const getCurrentValue = (col: ColumnData) => {
    switch (viewMode) {
      case "prior":
        return col.prior;
      case "likelihood":
        return col.likelihood;
      case "posterior":
        return col.posterior;
    }
  };

  const formatNumberForLatex = (num: number): string => {
    const exp = num.toExponential(0);
    const [mantissa, exponent] = exp.split("e");
    const expNum = parseInt(exponent, 10);
    if (mantissa === "1") return `10^{${expNum}}`;
    return `${mantissa} \\times 10^{${expNum}}`;
  };

  const currentMaxValue = maxValues[viewMode];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="p-2 sm:p-5 bg-gray-50 rounded-lg space-y-2 sm:space-y-3 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-center text-gray-800">XKCD Countdown Probability Calculator</h3>

      {/* Lambda slider */}
      <div className="bg-white rounded-lg px-2 sm:px-4 py-1">
        <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-0">Select prior:</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 w-8">0.0</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              className="flex-1 h-4"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(lambda / 2) * 100}%, #e5e7eb ${(lambda / 2) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <span className="text-sm text-gray-500 w-8">2.0</span>
          </div>
          <p className="widget-explanation left-aligned">
            Power-law prior: <InlineMath math={`p(x) \\propto x^{-${lambda.toFixed(1)}}`} />
            {lambda === 0 && " (uniform prior)"}
            {lambda === 1 && " (log-uniform prior)"}
          </p>
        </div>
      </div>

      {/* Evidence input */}
      <EvidenceInputRow />

      {/* Posterior probability that all wildcards are zero */}
      {wildcardCount > 0 && (
        <div className="bg-blue-50 rounded-lg p-2 sm:p-4">
          <p className="widget-explanation text-blue-800">
            <strong>Posterior probability that all hidden digits are 0:</strong>&nbsp;&nbsp;&nbsp;
            {(() => {
              const percentage = wildcardZeroProbability * 100;
              if (percentage === 0) return "0%";
              if (percentage === 100) return "100%";
              if (percentage < 0.01) return percentage.toFixed(6) + "%";
              if (percentage < 0.1) return percentage.toFixed(4) + "%";
              if (percentage < 1) return percentage.toFixed(3) + "%";
              if (percentage > 99.99) return percentage.toFixed(4) + "%";
              if (percentage > 99.9) return percentage.toFixed(3) + "%";
              if (percentage > 99) return percentage.toFixed(2) + "%";
              return percentage.toFixed(2) + "%";
            })()}
          </p>
        </div>
      )}

      {/* Distribution chart (SVG) */}
      <div className="bg-white rounded-lg p-2 sm:p-4">
        <ViewModeSlider />
        <div className="w-full relative">
          <button
            onClick={() => setLogScale(!logScale)}
            className="absolute top-2 right-2 px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 z-10"
          >
            {logScale ? "Log" : "Normal"} scale
          </button>
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-800 z-10 pointer-events-none">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} distribution
          </div>

          {/* --- SVG axes & bars (unchanged except they consume new columnData) --- */}
          <svg width="100%" height="360" viewBox="0 0 640 360" className="border border-gray-200 rounded">
            <defs>
              <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1e40af" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <g transform="translate(60, 20)">
              {/* Y-axis */}
              <line x1="0" y1="0" x2="0" y2="300" stroke="#6b7280" strokeWidth="1" />
              {/* X-axis */}
              <line x1="0" y1="300" x2="560" y2="300" stroke="#6b7280" strokeWidth="1" />
              {/* X-axis labels */}
              {Array.from({ length: 14 }, (_, i) => (
                <g key={i}>
                  <line x1={i * 40} y1="300" x2={i * 40} y2="305" stroke="#6b7280" strokeWidth="1" />
                  <text x={i * 40} y="320" textAnchor="middle" fontSize="10" fill="#6b7280">
                    <tspan>10</tspan>
                    <tspan fontSize="8" dy="-3">
                      {i}
                    </tspan>
                  </text>
                </g>
              ))}

              {/* Y-axis labels (log vs linear) */}
              {(() => {
                if (logScale && currentMaxValue > 0) {
                  if (viewMode === "likelihood") {
                    // For likelihood, find the actual min value (excluding zeros)
                    const nonZeroValues = columnData.map((d) => d.likelihood).filter((v) => v > 0);
                    const minValue = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 1e-6;

                    const maxExp = Math.floor(Math.log10(currentMaxValue));
                    const minExp = Math.floor(Math.log10(minValue));

                    // Limit the range to at most 6 orders of magnitude for readability
                    const rangeExp = Math.min(maxExp - minExp, 6);
                    const adjustedMinExp = maxExp - rangeExp;

                    const exponents = [];
                    for (let e = maxExp; e >= adjustedMinExp; e--) exponents.push(e);

                    return exponents.slice(0, 6).map((exp, idx) => {
                      const yPos = 300 - ((exponents.length - 1 - idx) / (exponents.length - 1)) * 280;
                      return (
                        <g key={idx}>
                          <line x1="-5" y1={yPos} x2="0" y2={yPos} stroke="#6b7280" strokeWidth="1" />
                          <text x="-10" y={yPos + 5} textAnchor="end" fontSize="10" fill="#6b7280">
                            <tspan>10</tspan>
                            <tspan fontSize="8" dy="-3">
                              {exp}
                            </tspan>
                          </text>
                        </g>
                      );
                    });
                  } else {
                    const exponents = [0, -1, -2, -3, -4, -5];
                    return exponents.map((exp, idx) => {
                      const yPos = 300 - ((exponents.length - 1 - idx) / (exponents.length - 1)) * 280;
                      return (
                        <g key={idx}>
                          <line x1="-5" y1={yPos} x2="0" y2={yPos} stroke="#6b7280" strokeWidth="1" />
                          <text x="-10" y={yPos + 5} textAnchor="end" fontSize="10" fill="#6b7280">
                            {exp === 0 ? (
                              "1"
                            ) : (
                              <>
                                <tspan>10</tspan>
                                <tspan fontSize="8" dy="-3">
                                  {exp}
                                </tspan>
                              </>
                            )}
                          </text>
                        </g>
                      );
                    });
                  }
                } else {
                  const maxVal = viewMode === "prior" || viewMode === "posterior" ? 1.0 : currentMaxValue;
                  return [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v, idx) => (
                    <g key={idx}>
                      <line x1="-5" y1={300 - v * 300} x2="0" y2={300 - v * 300} stroke="#6b7280" strokeWidth="1" />
                      <text x="-10" y={305 - v * 300} textAnchor="end" fontSize="10" fill="#6b7280">
                        {(v * maxVal).toFixed(3)}
                      </text>
                    </g>
                  ));
                }
              })()}

              {/* Bars */}
              {columnData.map((col, idx) => {
                const value = getCurrentValue(col);
                let barHeight: number;
                if (logScale && value > 0) {
                  if (viewMode === "likelihood") {
                    // Use the same adaptive scale as the y-axis labels
                    const nonZeroValues = columnData.map((d) => d.likelihood).filter((v) => v > 0);
                    const minValue = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 1e-6;

                    const maxExp = Math.floor(Math.log10(currentMaxValue));
                    const minExp = Math.floor(Math.log10(minValue));
                    const rangeExp = Math.min(maxExp - minExp, 6);
                    const adjustedMinExp = maxExp - rangeExp;

                    const logV = Math.log10(value);
                    barHeight = ((logV - adjustedMinExp) / rangeExp) * 280;
                  } else {
                    const logV = Math.log10(Math.max(value, 1e-5));
                    const logMax = 0;
                    const logMin = -5;
                    barHeight = ((logV - logMin) / (logMax - logMin)) * 280;
                  }
                } else {
                  const maxVal = viewMode === "prior" || viewMode === "posterior" ? 1.0 : currentMaxValue;
                  barHeight = (value / maxVal) * 280;
                }
                if (viewMode === "likelihood" && value > 0) barHeight = Math.max(15, Math.min(280, barHeight));
                else barHeight = value > 0 ? Math.max(5, Math.min(280, barHeight)) : 0;

                return (
                  <rect
                    key={idx}
                    x={idx * 40}
                    y={300 - barHeight}
                    width="38"
                    height={barHeight}
                    fill="url(#barGradient)"
                    stroke="#1e40af"
                    strokeWidth="0.5"
                    className="hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                );
              })}
            </g>
            <text x="20" y="50%" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90, 20, 180)">
              {viewMode === "likelihood" ? "Likelihood" : "Probability"}
            </text>
          </svg>

          {/* Tooltip */}
          {hoveredBar !== null && (
            <div
              className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none"
              style={{
                left: hoveredBar < 7 ? `${60 + hoveredBar * 40}px` : "auto",
                right: hoveredBar >= 7 ? `${60 + (13 - hoveredBar) * 40}px` : "auto",
                top: "40px",
                minWidth: "256px",
              }}
            >
              <div className="font-semibold text-blue-200">Column {hoveredBar + 1} Details</div>
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-gray-300">Numbers in [</span>
                  <span className="text-white">
                    <InlineMath math={formatNumberForLatex(columnData[hoveredBar].range.min)} />
                  </span>
                  <span className="text-gray-300">,</span>
                  <span className="text-white">
                    <InlineMath math={formatNumberForLatex(columnData[hoveredBar].range.max + 1)} />
                  </span>
                  <span className="text-gray-300">)</span>
                </div>
                {viewMode !== "prior" && (
                  <div>
                    <span className="text-gray-300">Numbers compatible with evidence:</span>{" "}
                    {columnData[hoveredBar].compatibleCount.toLocaleString()}
                  </div>
                )}
                <div>
                  <span className="text-gray-300">
                    {viewMode === "likelihood"
                      ? "Likelihood estimate"
                      : viewMode === "posterior"
                        ? "Posterior estimate"
                        : "Prior"}
                    :
                  </span>{" "}
                  {getCurrentValue(columnData[hoveredBar]).toExponential(4)}
                </div>
              </div>
              <div
                className="absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
                style={{ left: hoveredBar < 7 ? "20px" : "auto", right: hoveredBar >= 7 ? "20px" : "auto" }}
              ></div>
            </div>
          )}
        </div>
        <p className="widget-explanation">Hover over bars to see exact values.</p>
      </div>
    </div>
  );
};

export default XKCDCountdownWidget;
