"use client";

import React, { useState, useMemo, useCallback } from "react";
import KatexMath from "@/components/content/KatexMath";

type Props = {
  title?: string;
};

const MutualInformationWidget: React.FC<Props> = ({
  title = "Mutual Information Explorer"
}) => {
  // Joint distribution - 6 values that sum to 1
  const [jointProbs, setJointProbs] = useState<number[]>([0.14, 0.21, 0.35, 0.06, 0.09, 0.15]);

  // Calculate marginal probabilities
  const marginals = useMemo(() => {
    // Weather marginals: P(sun) = sum of first 3, P(cloud) = sum of last 3
    const sun = jointProbs[0] + jointProbs[1] + jointProbs[2];
    const cloud = jointProbs[3] + jointProbs[4] + jointProbs[5];
    
    // Transport marginals: P(walk) = jointProbs[0] + jointProbs[3], etc.
    const walk = jointProbs[0] + jointProbs[3];
    const bike = jointProbs[1] + jointProbs[4];
    const bus = jointProbs[2] + jointProbs[5];
    
    return { sun, cloud, walk, bike, bus };
  }, [jointProbs]);

  // Calculate mutual information
  const mutualInformation = useMemo(() => {
    let mi = 0;
    
    // I(X;Y) = sum p(x,y) log(p(x,y) / (p(x)p(y)))
    const entries = [
      { joint: jointProbs[0], marginal: marginals.sun * marginals.walk },  // sun, walk
      { joint: jointProbs[1], marginal: marginals.sun * marginals.bike },  // sun, bike
      { joint: jointProbs[2], marginal: marginals.sun * marginals.bus },   // sun, bus
      { joint: jointProbs[3], marginal: marginals.cloud * marginals.walk }, // cloud, walk
      { joint: jointProbs[4], marginal: marginals.cloud * marginals.bike }, // cloud, bike
      { joint: jointProbs[5], marginal: marginals.cloud * marginals.bus },  // cloud, bus
    ];

    entries.forEach(({ joint, marginal }) => {
      if (joint > 1e-10 && marginal > 1e-10) {
        mi += joint * Math.log(joint / marginal);
      }
    });

    return mi / Math.log(2); // Convert to bits
  }, [jointProbs, marginals]);

  // Update distribution while maintaining sum = 1 (like DistributionComparisonWidget)
  const updateDistribution = useCallback((
    index: number,
    newValue: number
  ) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    const newDist = [...jointProbs];
    
    // Calculate remaining mass to distribute
    const remainingMass = 1 - clampedValue;
    const currentRemainingMass = jointProbs.reduce((sum, p, i) => i === index ? sum : sum + p, 0);
    
    if (currentRemainingMass > 0) {
      const scaleFactor = remainingMass / currentRemainingMass;
      
      // Update all other probabilities proportionally
      for (let i = 0; i < newDist.length; i++) {
        if (i === index) {
          newDist[i] = clampedValue;
        } else {
          newDist[i] = jointProbs[i] * scaleFactor;
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
    
    setJointProbs(newDist);
  }, [jointProbs]);

  // Handle bar dragging with the same mechanism as DistributionComparisonWidget
  const handleBarDrag = useCallback((
    index: number,
    event: React.MouseEvent<SVGRectElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svg = event.currentTarget.closest('svg')!;
    const svgRect = svg.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - svgRect.left;
      const relativeX = x - 100; // Account for margin
      const barMaxWidth = 140;
      const probability = Math.max(0, Math.min(1, relativeX / barMaxWidth));
      
      updateDistribution(index, probability);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateDistribution]);

  // Reset to default distribution (independent)
  const resetToDefault = useCallback(() => {
    // Independent distribution: 70% sun, 30% cloud; 20% walk, 30% bike, 50% bus
    setJointProbs([0.14, 0.21, 0.35, 0.06, 0.09, 0.15]);
  }, []);

  const barMaxWidth = 140;
  const maxProb = Math.max(...jointProbs, 0.001);

  // Define the 2x3 table structure with indices
  const tableData = [
    [
      { index: 0, weather: '☀️', transport: '🚶‍♀️', label: 'Sun, Walk' },
      { index: 1, weather: '☀️', transport: '🚲', label: 'Sun, Bike' },
      { index: 2, weather: '☀️', transport: '🚌', label: 'Sun, Bus' }
    ],
    [
      { index: 3, weather: '☁️', transport: '🚶‍♀️', label: 'Cloud, Walk' },
      { index: 4, weather: '☁️', transport: '🚲', label: 'Cloud, Bike' },
      { index: 5, weather: '☁️', transport: '🚌', label: 'Cloud, Bus' }
    ]
  ];

  return (
    <div className="p-6 bg-gray-50 rounded-lg space-y-6 max-w-5xl mx-auto">
      {title && (
        <h3 className="text-xl font-semibold text-center text-gray-800">
          {title}
        </h3>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-700">
          Drag the bars to adjust the joint distribution P(Weather, Transport)
        </p>
        <p className="text-xs text-blue-600 mt-1">
          All 6 probabilities must sum to 1. Other bars adjust automatically.
        </p>
      </div>

      {/* Joint Distribution Table */}
      <div className="bg-white rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">Joint Distribution P(Weather, Transport)</h4>
        
        <div className="flex justify-center">
          <svg width="600" height="300" className="border rounded bg-white">
            {/* Background */}
            <rect width="600" height="300" fill="#f9fafb" stroke="#e5e7eb" />
            
            {/* Column headers (Transport) */}
            <text x="200" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">🚶‍♀️ Walk</text>
            <text x="350" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">🚲 Bike</text>
            <text x="500" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">🚌 Bus</text>
            
            {/* Row headers (Weather) */}
            <text x="80" y="100" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">☀️ Sun</text>
            <text x="80" y="200" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">☁️ Cloud</text>
            
            {/* Grid lines */}
            <line x1="100" y1="50" x2="550" y2="50" stroke="#d1d5db" strokeWidth="1" />
            <line x1="100" y1="150" x2="550" y2="150" stroke="#d1d5db" strokeWidth="1" />
            <line x1="100" y1="250" x2="550" y2="250" stroke="#d1d5db" strokeWidth="1" />
            <line x1="100" y1="50" x2="100" y2="250" stroke="#d1d5db" strokeWidth="1" />
            <line x1="250" y1="50" x2="250" y2="250" stroke="#d1d5db" strokeWidth="1" />
            <line x1="400" y1="50" x2="400" y2="250" stroke="#d1d5db" strokeWidth="1" />
            <line x1="550" y1="50" x2="550" y2="250" stroke="#d1d5db" strokeWidth="1" />
            
            {/* Probability bars for each cell */}
            {tableData.map((row, rowIndex) => 
              row.map((cell, colIndex) => {
                const prob = jointProbs[cell.index];
                const barWidth = (prob / maxProb) * barMaxWidth;
                const x = 105 + colIndex * 150;
                const y = 70 + rowIndex * 100;
                
                return (
                  <g key={cell.index}>
                    {/* Probability bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={30}
                      fill="#3b82f6"
                      stroke="#2563eb"
                      strokeWidth="1"
                      className="cursor-grab hover:fill-blue-500"
                      onMouseDown={(e) => handleBarDrag(cell.index, e)}
                    />
                    
                    {/* Probability text inside bar (if bar is wide enough) */}
                    {barWidth > 50 && (
                      <text
                        x={x + barWidth / 2}
                        y={y + 20}
                        textAnchor="middle"
                        fontSize="12"
                        fill="white"
                        fontWeight="bold"
                      >
                        {(prob * 100).toFixed(1)}%
                      </text>
                    )}
                    
                    {/* Probability text outside bar (if bar is too narrow) */}
                    {barWidth <= 50 && (
                      <text
                        x={x + barWidth + 5}
                        y={y + 20}
                        fontSize="12"
                        fill="#374151"
                        fontWeight="bold"
                      >
                        {(prob * 100).toFixed(1)}%
                      </text>
                    )}
                  </g>
                );
              })
            )}
            
            {/* Marginal probabilities (calculated dynamically) */}
            {/* Weather marginals (right side) */}
            <text x="570" y="100" fontSize="14" fontWeight="bold" fill="#059669">
              {(marginals.sun * 100).toFixed(1)}%
            </text>
            <text x="570" y="200" fontSize="14" fontWeight="bold" fill="#059669">
              {(marginals.cloud * 100).toFixed(1)}%
            </text>
            
            {/* Transport marginals (bottom) */}
            <text x="175" y="270" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#059669">
              {(marginals.walk * 100).toFixed(1)}%
            </text>
            <text x="325" y="270" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#059669">
              {(marginals.bike * 100).toFixed(1)}%
            </text>
            <text x="475" y="270" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#059669">
              {(marginals.bus * 100).toFixed(1)}%
            </text>
            
            {/* Labels for marginals */}
            <text x="570" y="40" fontSize="12" fill="#6b7280" textAnchor="middle">P(Weather)</text>
            <text x="325" y="290" fontSize="12" fill="#6b7280" textAnchor="middle">P(Transport)</text>
          </svg>
        </div>
      </div>

      {/* Mutual Information Display */}
      <div className="bg-white rounded-lg p-6">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Mutual Information</h4>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            I(Weather; Transport) = {mutualInformation.toFixed(4)} bits
          </div>
          <div className="text-sm text-gray-600">
            <KatexMath math="I(X;Y) = \sum_{x,y} P(x,y) \log_2 \frac{P(x,y)}{P(x)P(y)}" />
          </div>
          
          {/* Independence indicator */}
          <div className="mt-4">
            {Math.abs(mutualInformation) < 0.001 ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✓ Variables are independent
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                ⚡ Variables are dependent
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <button
          onClick={resetToDefault}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};

export default MutualInformationWidget;