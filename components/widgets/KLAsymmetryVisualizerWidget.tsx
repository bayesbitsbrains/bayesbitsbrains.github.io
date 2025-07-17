"use client";

import React, { useState, useEffect } from "react";
import KatexMath from "@/components/content/KatexMath";

export default function KLAsymmetryVisualizerWidget() {
  const [showResults, setShowResults] = useState(false);


  // Generate points for uniform distribution (flat line)
  const uniformPoints = Array.from({ length: 100 }, (_, i) => {
    const x = i / 99;
    return { x: x * 200 + 50, y: 140 }; // Flat line closer to x-axis
  });

  // Generate points for Gaussian distribution (bell curve)
  // Properly normalized to [0,1] interval
  const gaussianPoints = Array.from({ length: 100 }, (_, i) => {
    const x = i / 99; // Map to [0, 1] interval
    const mu = 0.5; // Center at 0.5
    const sigma = 0.06; // Make it very peaky
    const y = Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
    // Normalize to make it a proper probability density on [0,1]
    const normalizedY = y / (1 / (sigma * Math.sqrt(2 * Math.PI))); // Approximate normalization
    const scaledY = 160 - normalizedY * 90; // Scale and flip for SVG coordinates, closer to x-axis
    const scaledX = x * 200 + 50; // Scale x to fit in 200px width
    return { x: scaledX, y: scaledY };
  });

  const createPath = (points: { x: number; y: number }[]) => {
    return points.reduce((path, point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${path} ${command} ${point.x} ${point.y}`;
    }, "");
  };

  const DistributionChart = ({
    pColor,
    qColor,
    pLabel,
    qLabel,
    title,
    resultText,
    sampleLineX,
    sampleLineLabel,
    isPeakyTrue,
  }: {
    pColor: string;
    qColor: string;
    pLabel: string;
    qLabel: string;
    title: string;
    resultText?: string;
    sampleLineX?: number;
    sampleLineLabel?: string;
    isPeakyTrue?: boolean;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1">
      <h4 className="text-lg font-semibold text-gray-800 mb-1 text-center">
        <KatexMath math={title} />
      </h4>

      <svg width="300" height="180" viewBox="0 0 300 180" className="w-full">
        {/* Uniform distribution (broad) */}
        <path
          d={createPath(uniformPoints)}
          fill="none"
          stroke={isPeakyTrue ? "#dc2626" : "#2563eb"}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Gaussian distribution (peaky) */}
        <path
          d={createPath(gaussianPoints)}
          fill="none"
          stroke={isPeakyTrue ? "#2563eb" : "#dc2626"}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* X-axis */}
        <line x1="50" y1="160" x2="250" y2="160" stroke="#6b7280" strokeWidth="1" />

        {/* Distribution labels */}
        <g transform="translate(70, 112)">
          <foreignObject width="100" height="30">
            <KatexMath math="p_{\text{broad}}" />
          </foreignObject>
        </g>
        <g transform="translate(100, 50)">
          <foreignObject width="100" height="30">
            <KatexMath math="p_{\text{peaky}}" />
          </foreignObject>
        </g>

        {/* Vertical sample line when results are shown */}
        {showResults && sampleLineX && (
          <>
            <line
              x1={sampleLineX}
              y1="40"
              x2={sampleLineX}
              y2="160"
              stroke="#6b7280"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {sampleLineLabel && (
              <>
                <g transform={`translate(${sampleLineX - 70}, 5)`}>
                  <foreignObject width="180" height="70" style={{ overflow: "visible" }}>
                    <div className="text-lg text-gray-700 text-center">
                      <KatexMath math={sampleLineLabel} />
                    </div>
                  </foreignObject>
                </g>
                {/* x label below the vertical line */}
                <g transform={`translate(${sampleLineX - 10}, 165)`}>
                  <foreignObject width="20" height="20">
                    <div className="text-sm text-gray-600 text-center">
                      <KatexMath math="x" />
                    </div>
                  </foreignObject>
                </g>
              </>
            )}
          </>
        )}
      </svg>

      {showResults && resultText && (
        <div className="mt-3 text-center">
          <div
            className={`text-sm font-medium px-3 py-2 rounded ${
              resultText.includes("moderate") ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
            }`}
          >
            {resultText}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 rounded-lg space-y-4 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-center text-gray-800">KL Divergence Asymmetry</h3>

      <div className="text-sm text-gray-600 text-center">
        KL divergence between a broad and a peaky distribution. The blue distribution is the &quot;truth&quot;, the red
        one the &quot;model&quot;.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionChart
          pColor="#2563eb" // blue
          qColor="#dc2626" // red
          pLabel="p"
          qLabel="q"
          title="D(p_{\text{peaky}}, p_{\text{broad}})"
          resultText={showResults ? "KL is moderate" : undefined}
          sampleLineX={showResults ? 160 : undefined} // Slightly right of peak
          sampleLineLabel={
            showResults ? "\\frac{p_{\\text{peaky}}(x)}{p_{\\text{broad}}(x)} \\text{ is moderate}" : undefined
          }
          isPeakyTrue={true}
        />

        <DistributionChart
          pColor="#2563eb" // blue
          qColor="#dc2626" // red
          pLabel="p"
          qLabel="q"
          title="D(p_{\text{broad}}, p_{\text{peaky}})"
          resultText={showResults ? "KL is large" : undefined}
          sampleLineX={showResults ? 200 : undefined} // Right of peak, 3/4 of range
          sampleLineLabel={
            showResults ? "\\frac{p_{\\text{broad}}(x)}{p_{\\text{peaky}}(x)} \\text{ is large}" : undefined
          }
          isPeakyTrue={false}
        />
      </div>

      <div className="text-center">
        <button
          onClick={() => setShowResults(!showResults)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showResults ? "Hide" : "Reveal"}
        </button>
      </div>

      {showResults && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Why?</strong> Two vertical lines show typical samples from <KatexMath math="p_{\text{peaky}}" /> and{" "}
            <KatexMath math="p_{\text{broad}}" />. On the left, <KatexMath math="p_{\text{broad}}" /> doesn&apos;t know
            where the peak of <KatexMath math="p_{\text{peaky}}" /> is, but it is spread out and covers the peak with
            reasonably-sized probability mass. The ratio <KatexMath math="p_{\text{peaky}}(x) / p_{\text{broad}}(x)" />{" "}
            is never too large. <br />
            <br />
            On the right, <KatexMath math="p_{\text{peaky}}" /> is concentrated at one place, and it doesn&apos;t try to
            cover elsewhere. Thus, its surprise on a typical sample from <KatexMath math="p_{\text{broad}}" /> is really
            big.
          </div>
        </div>
      )}
    </div>
  );
}
