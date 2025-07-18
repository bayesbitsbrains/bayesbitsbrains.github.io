"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";

type Props = {
  title?: string;
  numCategories?: number;
};

const EntropyWidget: React.FC<Props> = ({ title = "Entropy Explorer", numCategories = 4 }) => {
  // Initial uniform distribution
  const initialDist = Array(numCategories).fill(1 / numCategories);
  const [distribution, setDistribution] = useState<number[]>(initialDist);
  // Detect touch / coarse pointer devices for mobile-specific interactions
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkTouch = () => {
      if (typeof window === "undefined") return;
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      setIsTouchDevice(coarse || "ontouchstart" in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(Math.min(400, window.innerWidth - 80));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Chart dimensions - responsive
  const chartWidth = containerWidth;
  const chartHeight = Math.min(250, chartWidth * 0.625);
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Bar dimensions
  const categoryWidth = innerWidth / numCategories;
  const barWidth = categoryWidth * 0.8;
  const barGap = categoryWidth * 0.1;

  // Scale for probability (0 to 1)
  const yScale = innerHeight;

  // Calculate entropy
  const entropy = useMemo(() => {
    return -distribution.reduce((sum, p) => {
      return p > 0 ? sum + p * Math.log2(p) : sum;
    }, 0);
  }, [distribution]);

  // Maximum possible entropy for this number of categories
  const maxEntropy = Math.log2(numCategories);

  // Update distribution while maintaining sum = 1
  const updateDistribution = useCallback(
    (index: number, newValue: number) => {
      const clampedValue = Math.max(0, Math.min(1, newValue));
      const newDist = [...distribution];

      // Calculate remaining mass to distribute
      const remainingMass = 1 - clampedValue;
      const currentRemainingMass = distribution.reduce((sum, p, i) => (i === index ? sum : sum + p), 0);

      if (currentRemainingMass > 0) {
        const scaleFactor = remainingMass / currentRemainingMass;

        // Update all other probabilities proportionally
        for (let i = 0; i < newDist.length; i++) {
          if (i === index) {
            newDist[i] = clampedValue;
          } else {
            newDist[i] = distribution[i] * scaleFactor;
          }
        }
      } else {
        // Edge case: if all other probabilities are 0
        newDist[index] = clampedValue;
        const remaining = (1 - clampedValue) / (newDist.length - 1);
        for (let i = 0; i < newDist.length; i++) {
          if (i !== index) {
            newDist[i] = remaining;
          }
        }
      }

      setDistribution(newDist);
    },
    [distribution],
  );

  // Handle simple tap / click on a bar area (primarily for mobile)
  const handleBarClick = useCallback(
    (index: number, event: React.MouseEvent<SVGRectElement, MouseEvent> | React.PointerEvent<SVGRectElement>) => {
      if (!isTouchDevice) return; // Only activate on touch devices

      // Compute probability based on tap position
      const svg = (event.currentTarget as SVGRectElement).closest("svg")!;
      const svgRect = svg.getBoundingClientRect();
      const clientY = (event as any).clientY ?? (event as any).touches?.[0]?.clientY ?? 0;
      const y = clientY - svgRect.top;
      const relativeY = y - margin.top;
      const probability = Math.max(0, Math.min(1, 1 - relativeY / yScale));
      updateDistribution(index, probability);
    },
    [isTouchDevice, margin.top, yScale, updateDistribution],
  );

  // Handle bar dragging
  const handleBarDrag = useCallback(
    (index: number, event: React.MouseEvent<SVGRectElement>) => {
      const svg = event.currentTarget.closest("svg")!;
      const svgRect = svg.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const y = moveEvent.clientY - svgRect.top;
        const relativeY = y - margin.top;
        const probability = Math.max(0, Math.min(1, 1 - relativeY / yScale));

        updateDistribution(index, probability);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [updateDistribution, yScale],
  );

  // Generate some preset distributions
  const presets = [
    { name: "Uniform", dist: Array(numCategories).fill(1 / numCategories) },
    { name: "Skewed", dist: [0.7, 0.2, 0.07, 0.03, 0, 0].slice(0, numCategories) },
    { name: "Binary", dist: [0.5, 0.5, 0, 0, 0, 0].slice(0, numCategories) },
    { name: "Extreme", dist: [1, 0, 0, 0, 0, 0].slice(0, numCategories) },
  ];

  return (
    <div className="p-2 sm:p-4 bg-gray-50 rounded-lg space-y-4 max-w-2xl mx-auto">
      {title && <h3 className="text-lg font-semibold text-center text-gray-800">{title}</h3>}

      {/* SVG Chart */}
      <div className="flex justify-center overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="border rounded bg-white min-w-0 max-w-full">
          {/* Chart area background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
            fill="#f9fafb"
            stroke="#e5e7eb"
          />

          {/* Y-axis grid lines */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => {
            const y = margin.top + innerHeight - tick * yScale;
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="2,2"
                />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Category labels */}
          {Array.from({ length: numCategories }, (_, i) => (
            <text
              key={i}
              x={margin.left + i * categoryWidth + categoryWidth / 2}
              y={margin.top + innerHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
              fontWeight="bold"
            >
              {String.fromCharCode(65 + i)}
            </text>
          ))}

          {/* Bars */}
          {distribution.map((prob, i) => {
            const categoryX = margin.left + i * categoryWidth;
            const barHeight = Math.max(20, prob * yScale); // Minimum 20px height for better draggability
            const barX = categoryX + barGap;
            const barY = margin.top + innerHeight - barHeight;

            // Color based on probability (darker = higher probability)
            // Use lighter color for zero probability bars
            const intensity = prob === 0 ? 20 : Math.floor(prob * 200 + 55);
            const color =
              prob === 0
                ? "#f3f4f6" // Light gray for zero probability
                : `rgb(${Math.max(0, 255 - intensity)}, ${Math.max(0, 255 - intensity * 0.7)}, ${255 - intensity * 0.3})`;

            return (
              <g key={i}>
                {/* Touch overlay covering full column for easier tapping */}
                {isTouchDevice && (
                  <rect
                    x={categoryX}
                    y={margin.top}
                    width={categoryWidth}
                    height={innerHeight}
                    fill="transparent"
                    onClick={(e) => handleBarClick(i, e)}
                  />
                )}
                {/* Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  stroke="#374151"
                  strokeWidth="1"
                  className="cursor-ns-resize hover:opacity-80 transition-opacity"
                  onMouseDown={(e) => handleBarDrag(i, e)}
                  onClick={(e) => handleBarClick(i, e)}
                />

                {/* Invisible overlay for better draggability on small bars */}
                {barHeight <= 30 && (
                  <rect
                    x={barX}
                    y={margin.top + innerHeight - 30}
                    width={barWidth}
                    height={30}
                    fill="transparent"
                    className="cursor-ns-resize"
                    onMouseDown={(e) => handleBarDrag(i, e)}
                    onClick={(e) => handleBarClick(i, e)}
                  />
                )}

                {/* Probability label on top of bar */}
                <text
                  x={barX + barWidth / 2}
                  y={barY - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="bold"
                >
                  {prob.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            stroke="#374151"
            strokeWidth="2"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Y-axis label */}
          <text
            x={15}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            fontWeight="bold"
            transform={`rotate(-90, 15, ${margin.top + innerHeight / 2})`}
          >
            Probability
          </text>
        </svg>
      </div>

      {/* Instructions */}
      <div className="widget-explanation">
        {isTouchDevice
          ? "Tap above or below a bar to adjust probabilities. Other bars adjust automatically."
          : "Drag any bar up or down to adjust probabilities. Other bars adjust automatically."}
      </div>

      {/* Entropy Display */}
      <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="text-sm text-gray-700 mb-2">Entropy</div>
          <div className="text-3xl font-mono font-bold text-blue-600">{entropy.toFixed(3)} bits</div>
          <div className="text-xs text-gray-500 mt-1">Maximum possible: {maxEntropy.toFixed(3)} bits</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(entropy / maxEntropy) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setDistribution([...preset.dist])}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EntropyWidget;
