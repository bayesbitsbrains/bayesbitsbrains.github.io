"use client";

import React, { useState, useEffect } from "react";
import ZoomButton from "./ZoomButton";
import { getAssetPath } from "@/lib/utils";

interface VolatilityData {
  histogram: {
    binCenters: number[];
    density: number[];
    binEdges: number[];
    counts: number[];
  };
  fits: {
    exponential: {
      params: { rate: number; mean: number };
      curve: { x: number; y: number }[];
      label: string;
    };
    logNormal: {
      params: { mu: number; sigma: number };
      curve: { x: number; y: number }[];
      label: string;
    };
    inverseGamma: {
      params: { alpha: number; beta: number };
      curve: { x: number; y: number }[];
      label: string;
    };
  };
  stats: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
  };
}

const VolatilityDistributionWidget: React.FC = () => {
  const [data, setData] = useState<VolatilityData | null>(null);
  const [isLogScale, setIsLogScale] = useState(true);
  const [showFits, setShowFits] = useState({
    exponential: true,
    logNormal: true,
    inverseGamma: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false); // Fullscreen zoom
  const [rangeZoomed, setRangeZoomed] = useState(false); // Data range zoom to 0.005

  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load 15-day data first, then fall back to full data, then truncated
        let response = await fetch(getAssetPath('/volatility_data_15day.json'));
        if (!response.ok) {
          // Fallback to full data
          response = await fetch(getAssetPath('/volatility_data_full.json'));
          if (!response.ok) {
            // Final fallback to truncated data
            response = await fetch(getAssetPath('/volatility_data.json'));
            if (!response.ok) {
              throw new Error(`Failed to load data: ${response.status}`);
            }
          }
        }
        const volatilityData = await response.json();
        setData(volatilityData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading volatility data:', err);
        setError('Failed to load volatility data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleFit = (fitType: keyof typeof showFits) => {
    setShowFits(prev => ({
      ...prev,
      [fitType]: !prev[fitType]
    }));
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error || 'No data available'}</p>
      </div>
    );
  }

  // Responsive chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  // Find max values for scaling
  const dataMaxX = Math.max(...data.histogram.binCenters, ...Object.values(data.fits).flatMap(fit => fit.curve.map(point => point.x)));
  const maxX = rangeZoomed ? 0.002 : dataMaxX;
  
  // Filter data for current view
  const visibleIndices = data.histogram.binCenters.map((x, i) => x <= maxX ? i : -1).filter(i => i >= 0);
  const visibleDensities = visibleIndices.map(i => data.histogram.density[i]);
  const visibleFitY = Object.values(data.fits).flatMap(fit => 
    fit.curve.filter(point => point.x <= maxX).map(point => point.y)
  );
  
  const maxDensity = Math.max(...visibleDensities);
  const maxFitY = Math.max(...visibleFitY);
  const maxY = Math.max(maxDensity, maxFitY);

  const scaleY = isLogScale ? 
    (y: number) => y <= 0.1 ? plotHeight : plotHeight - (Math.log10(y) / Math.log10(maxY)) * plotHeight :
    (y: number) => plotHeight - (y / maxY) * plotHeight;

  const scaleX = (x: number) => (x / maxX) * plotWidth;

  // Generate Y-axis ticks
  const yTicks = isLogScale ? 
    [0.1, 1, 10, 100, 1000, 10000].filter(v => v >= 0.1 && v <= maxY) :
    Array.from({ length: 6 }, (_, i) => (i / 5) * maxY);

  return (
    <div className="p-2 sm:p-6 bg-gray-50 rounded-lg space-y-4 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">
        S&P 500 Variance Distribution
      </h3>
      
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center sm:justify-between">
        {/* Scale and Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Y-axis:</span>
          <button
            onClick={() => setIsLogScale(!isLogScale)}
            className={`px-4 py-2 text-sm rounded-md border transition-colors min-h-[44px] ${
              isLogScale
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isLogScale ? 'Log Scale' : 'Linear Scale'}
          </button>
          <button
            onClick={() => setRangeZoomed(!rangeZoomed)}
            className={`px-4 py-2 text-sm rounded-md border transition-colors min-h-[44px] ${
              rangeZoomed
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {rangeZoomed ? 'Show Full Range' : 'Show Main Range'}
          </button>
        </div>

        {/* Fit Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Show fits:</span>
          <div className="flex gap-2">
            {Object.entries(showFits).map(([fitType, isVisible]) => (
              <button
                key={fitType}
                onClick={() => toggleFit(fitType as keyof typeof showFits)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors min-h-[44px] ${
                  isVisible
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {fitType === 'exponential' ? 'Exponential' : 
                 fitType === 'logNormal' ? 'Log-Normal' : 'Inverse-Γ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={isZoomed ? 'fixed inset-0 z-50 bg-white p-8' : 'bg-white p-2 sm:p-4 rounded-lg border relative'}>
        <div className={`${isZoomed ? 'h-full' : ''} relative`}>
          <ZoomButton 
            type="zoom-toggle"
            isZoomed={isZoomed}
            onClick={() => setIsZoomed(!isZoomed)}
            className="absolute top-2 right-2 z-10"
          />
          <svg width="100%" height={isZoomed ? "100%" : chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="border border-gray-200 rounded">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            
            {/* Y-axis */}
            <line x1="0" y1="0" x2="0" y2={plotHeight} stroke="#6b7280" strokeWidth="1" />
            
            {/* X-axis */}
            <line x1="0" y1={plotHeight} x2={plotWidth} y2={plotHeight} stroke="#6b7280" strokeWidth="1" />
            
            {/* Y-axis labels and grid */}
            {yTicks.map((tick, i) => {
              const y = scaleY(tick);
              return (
                <g key={i}>
                  <line 
                    x1="-5" 
                    y1={y} 
                    x2="0" 
                    y2={y} 
                    stroke="#6b7280" 
                    strokeWidth="1" 
                  />
                  <line 
                    x1="0" 
                    y1={y} 
                    x2={plotWidth} 
                    y2={y} 
                    stroke="#e5e7eb" 
                    strokeWidth="0.5" 
                  />
                  <text 
                    x="-10" 
                    y={y + 3} 
                    textAnchor="end" 
                    fontSize="10" 
                    fill="#6b7280"
                  >
                    {tick >= 1 ? tick.toFixed(0) : tick.toFixed(1)}
                  </text>
                </g>
              );
            })}
            
            {/* X-axis labels */}
            {(() => {
              const numTicks = 6;
              const ticks = Array.from({ length: numTicks }, (_, i) => (i / (numTicks - 1)) * maxX);
              return ticks.map((tick, i) => {
                const x = scaleX(tick);
                return (
                  <g key={i}>
                    <line 
                      x1={x} 
                      y1={plotHeight} 
                      x2={x} 
                      y2={plotHeight + 5} 
                      stroke="#6b7280" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={x} 
                      y={plotHeight + 18} 
                      textAnchor="middle" 
                      fontSize="10" 
                      fill="#6b7280"
                    >
                      {tick.toFixed(4)}
                    </text>
                  </g>
                );
              });
            })()}
            
            {/* Histogram bars */}
            {data.histogram.binCenters.map((binCenter, i) => {
              const density = data.histogram.density[i];
              if (density <= 0 || binCenter > maxX || (isLogScale && density < 0.1)) return null;
              
              const x = scaleX(binCenter);
              const y = scaleY(density);
              const height = plotHeight - y;
              const binWidth = data.histogram.binEdges[1] - data.histogram.binEdges[0];
              const barWidth = scaleX(binWidth) * 0.8;
              
              return (
                <rect
                  key={i}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="#93c5fd"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  opacity="0.7"
                >
                  <title>
                    {`Variance: ${binCenter.toFixed(6)}\\nDensity: ${density.toFixed(1)}`}
                  </title>
                </rect>
              );
            })}
            
            {/* Fitted curves */}
            {showFits.exponential && (
              <path
                d={data.fits.exponential.curve
                  .filter(point => point.x <= maxX && (isLogScale ? point.y >= 0.1 : point.y > 0))
                  .map((point, i) => 
                    `${i === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`
                  ).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray={isLogScale ? "8 4" : "none"}
              />
            )}
            
            {showFits.logNormal && (
              <path
                d={data.fits.logNormal.curve
                  .filter(point => point.x <= maxX && (isLogScale ? point.y >= 0.1 : point.y > 0))
                  .map((point, i) => 
                    `${i === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`
                  ).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={isLogScale ? "8 4" : "none"}
              />
            )}
            
            {showFits.inverseGamma && (
              <path
                d={data.fits.inverseGamma.curve
                  .filter(point => point.x <= maxX && (isLogScale ? point.y >= 0.1 : point.y > 0))
                  .map((point, i) => 
                    `${i === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`
                  ).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray={isLogScale ? "8 4" : "none"}
              />
            )}
          </g>
          
          {/* Chart title */}
          <text x={chartWidth / 2} y={15} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
            Daily Variance Distribution (15-day rolling window){rangeZoomed ? ' - Showing 0 to 0.002' : ''}
          </text>
          
          {/* X-axis label */}
          <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#6b7280">
            Variance (σ²)
          </text>
          
          {/* Y-axis label */}
          <text x={15} y={chartHeight / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90, 15, ${chartHeight / 2})`}>
            Probability Density
          </text>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-2 sm:p-3 rounded-lg border">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-300 border border-blue-500 rounded"></div>
            <span>Empirical variance</span>
          </div>
          {showFits.exponential && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Exponential</span>
            </div>
          )}
          {showFits.logNormal && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>Log-normal</span>
            </div>
          )}
          {showFits.inverseGamma && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span>Inverse-Gamma</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="bg-white p-2 rounded-lg border text-xs">
        <h4 
          className="text-sm font-normal text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setShowStats(!showStats)}
        >
          Distribution Statistics {showStats ? '▼' : '▶'}
        </h4>
        {showStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            <div className="p-1.5 bg-gray-50 rounded"><strong>Count:</strong> {data.stats.count.toLocaleString()}</div>
            <div className="p-1.5 bg-gray-50 rounded"><strong>Mean:</strong> {data.stats.mean.toFixed(6)}</div>
            <div className="p-1.5 bg-gray-50 rounded"><strong>Median:</strong> {data.stats.median.toFixed(6)}</div>
            <div className="p-1.5 bg-gray-50 rounded"><strong>Std Dev:</strong> {data.stats.std.toFixed(6)}</div>
            <div className="p-1.5 bg-gray-50 rounded"><strong>Min:</strong> {data.stats.min.toFixed(6)}</div>
            <div className="p-1.5 bg-gray-50 rounded"><strong>Max:</strong> {data.stats.max.toFixed(6)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolatilityDistributionWidget;