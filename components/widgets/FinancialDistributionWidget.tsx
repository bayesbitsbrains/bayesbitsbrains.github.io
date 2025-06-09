"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Line } from "recharts";

interface DistributionData {
  n_samples: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  kurtosis: number;
  histogram: {
    counts: number[];
    bin_edges: number[];
  };
  distributions: {
    gaussian: {
      mu: number;
      std: number;
      kl_divergence: number;
    };
    laplace: {
      loc: number;
      scale: number;
      kl_divergence: number;
    };
  };
}

interface FinancialData {
  asset: string;
  start_date: string;
  end_date: string;
  max_days: number;
  daily_data: Record<string, DistributionData>;
}

interface Props {
  showBTC?: boolean;
  showSAP?: boolean;
}

// Function to compute PDF values
function computePDF(x: number[], dist: string, params: any): number[] {
  switch (dist) {
    case 'gaussian':
      return x.map(xi => {
        const z = (xi - params.mu) / params.std;
        return Math.exp(-0.5 * z * z) / (params.std * Math.sqrt(2 * Math.PI));
      });
    case 'laplace':
      return x.map(xi => {
        const scale = params.scale || 1e-10;
        return Math.exp(-Math.abs(xi - params.loc) / scale) / (2 * scale);
      });
    default:
      return x.map(() => 0);
  }
}

export default function FinancialDistributionWidget({ showBTC = true, showSAP = false }: Props) {
  const [btcData, setBtcData] = useState<FinancialData | null>(null);
  const [sapData, setSapData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'SAP'>(showBTC ? 'BTC' : 'SAP');
  const [selectedDays, setSelectedDays] = useState(100);
  const [xAxisRange, setXAxisRange] = useState(3); // Standard deviations
  const [showGaussian, setShowGaussian] = useState(true);
  const [showLaplace, setShowLaplace] = useState(true);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const promises = [];
        
        if (showBTC) {
          promises.push(
            fetch('/financial_data/btc_data_test.json')
              .then(res => {
                console.log('BTC fetch response:', res.status, res.statusText);
                if (!res.ok) {
                  throw new Error(`BTC fetch failed: ${res.status} ${res.statusText}`);
                }
                return res.json();
              })
              .then(data => {
                console.log('BTC data loaded, keys:', Object.keys(data));
                setBtcData(data);
              })
          );
        }
        
        if (showSAP) {
          promises.push(
            fetch('/financial_data/sap_data_test.json')
              .then(res => {
                console.log('SAP fetch response:', res.status, res.statusText);
                if (!res.ok) {
                  throw new Error(`SAP fetch failed: ${res.status} ${res.statusText}`);
                }
                return res.json();
              })
              .then(data => {
                console.log('SAP data loaded, keys:', Object.keys(data));
                setSapData(data);
              })
          );
        }
        
        await Promise.all(promises);
      } catch (err) {
        setError(`Failed to load financial data: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Financial data loading error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [showBTC, showSAP]);

  // Get current data
  const currentData = selectedAsset === 'BTC' ? btcData : sapData;
  const maxDays = currentData ? currentData.max_days : 100;
  
  // Adjust selected days if needed
  useEffect(() => {
    if (selectedDays > maxDays) {
      setSelectedDays(Math.min(100, maxDays));
    }
  }, [selectedDays, maxDays]);

  // Compute plot data
  const plotData = useMemo(() => {
    if (!currentData || !currentData.daily_data[selectedDays]) {
      return null;
    }

    const dayData = currentData.daily_data[selectedDays];
    const { mean, std, histogram, distributions } = dayData;
    
    // Create x-axis range
    const xMin = mean - xAxisRange * std;
    const xMax = mean + xAxisRange * std;
    const nPoints = 400;
    const xValues = Array.from({ length: nPoints }, (_, i) => 
      xMin + (i / (nPoints - 1)) * (xMax - xMin)
    );

    // Compute PDFs
    const gaussianPDF = showGaussian ? computePDF(xValues, 'gaussian', distributions.gaussian) : null;
    const laplacePDF = showLaplace ? computePDF(xValues, 'laplace', distributions.laplace) : null;

    // Prepare histogram data
    const histogramData = [];
    const binWidth = histogram.bin_edges[1] - histogram.bin_edges[0];
    for (let i = 0; i < histogram.counts.length; i++) {
      const binCenter = (histogram.bin_edges[i] + histogram.bin_edges[i + 1]) / 2;
      if (binCenter >= xMin && binCenter <= xMax) {
        histogramData.push({
          x: binCenter,
          y: histogram.counts[i] / (dayData.n_samples * binWidth) // Normalize to density
        });
      }
    }

    return {
      xValues,
      gaussianPDF,
      laplacePDF,
      histogramData,
      distributions,
      mean,
      std
    };
  }, [currentData, selectedDays, xAxisRange, showGaussian, showLaplace]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-gray-600">Loading financial data...</div>
      </div>
    );
  }

  if (error || !currentData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-red-600">{error || 'No data available'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Asset selector */}
        {showBTC && showSAP && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value as 'BTC' | 'SAP')}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="SAP">S&P 500 (SAP)</option>
            </select>
          </div>
        )}

        {/* Days slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days: {selectedDays}
          </label>
          <input
            type="range"
            min="1"
            max={maxDays}
            value={selectedDays}
            onChange={(e) => setSelectedDays(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* X-axis range slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            X-axis range: ±{xAxisRange}σ
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={xAxisRange}
            onChange={(e) => setXAxisRange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Distribution toggles */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Show distributions</label>
          <div className="space-y-1">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showGaussian}
                onChange={(e) => setShowGaussian(e.target.checked)}
                className="mr-2"
              />
              <span className="text-red-600">Gaussian</span>
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showLaplace}
                onChange={(e) => setShowLaplace(e.target.checked)}
                className="mr-2"
              />
              <span className="text-green-600">Laplace</span>
            </label>
          </div>
        </div>
      </div>

      {/* Plot */}
      {plotData && (
        <div className="bg-white rounded-lg p-4">
          <svg width="100%" viewBox="0 0 800 400" className="max-w-4xl mx-auto">
            {/* Background */}
            <rect width="800" height="400" fill="#f9fafb" stroke="#e5e7eb" />
            
            {/* Histogram */}
            {plotData.histogramData.map((bar, i) => {
              const xRange = plotData.xValues[plotData.xValues.length - 1] - plotData.xValues[0];
              const xScale = 700 / xRange;
              const x = 50 + (bar.x - plotData.xValues[0]) * xScale;
              const barWidth = Math.max(2, (plotData.histogramData[1]?.x - plotData.histogramData[0]?.x || 0.01) * xScale);
              const maxY = Math.max(...plotData.histogramData.map(d => d.y), 0.01);
              const yScale = 300 / maxY;
              const height = Math.max(1, bar.y * yScale);
              
              return (
                <rect
                  key={i}
                  x={x - barWidth / 2}
                  y={350 - height}
                  width={barWidth}
                  height={height}
                  fill="#94a3b8"
                  opacity="0.7"
                />
              );
            })}
            
            {/* Calculate common scales for curves */}
            {(() => {
              const xRange = plotData.xValues[plotData.xValues.length - 1] - plotData.xValues[0];
              const xScale = 700 / xRange;
              const allPDFValues = [
                ...(plotData.gaussianPDF || []),
                ...(plotData.laplacePDF || []),
                ...plotData.histogramData.map(d => d.y)
              ].filter(v => isFinite(v));
              const maxY = Math.max(...allPDFValues, 0.01);
              const yScale = 300 / maxY;
              
              return (
                <>
                  {/* Gaussian curve */}
                  {plotData.gaussianPDF && showGaussian && (
                    <path
                      d={`M ${plotData.xValues.map((x, i) => {
                        const xPos = 50 + (x - plotData.xValues[0]) * xScale;
                        const yPos = 350 - plotData.gaussianPDF![i] * yScale;
                        return `${xPos},${Math.max(50, Math.min(350, yPos))}`;
                      }).join(' L ')}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Laplace curve */}
                  {plotData.laplacePDF && showLaplace && (
                    <path
                      d={`M ${plotData.xValues.map((x, i) => {
                        const xPos = 50 + (x - plotData.xValues[0]) * xScale;
                        const yPos = 350 - plotData.laplacePDF![i] * yScale;
                        return `${xPos},${Math.max(50, Math.min(350, yPos))}`;
                      }).join(' L ')}`}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                    />
                  )}
                  
                </>
              );
            })()}
            
            {/* Axes */}
            <line x1="50" y1="350" x2="750" y2="350" stroke="#374151" strokeWidth="2" />
            <line x1="50" y1="50" x2="50" y2="350" stroke="#374151" strokeWidth="2" />
            
            {/* Title */}
            <text x="400" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">
              {currentData.asset} Daily Returns ({selectedDays} days)
            </text>
            
            {/* Legend */}
            <g transform="translate(600, 80)">
              {showGaussian && (
                <g>
                  <line x1="0" y1="0" x2="20" y2="0" stroke="#ef4444" strokeWidth="2" />
                  <text x="25" y="5" fontSize="12" fill="#374151">Gaussian</text>
                </g>
              )}
              {showLaplace && (
                <g transform="translate(0, 20)">
                  <line x1="0" y1="0" x2="20" y2="0" stroke="#22c55e" strokeWidth="2" />
                  <text x="25" y="5" fontSize="12" fill="#374151">Laplace</text>
                </g>
              )}
              <g transform="translate(0, 40)">
                <rect x="0" y="-5" width="20" height="10" fill="#94a3b8" opacity="0.7" />
                <text x="25" y="5" fontSize="12" fill="#374151">Empirical</text>
              </g>
            </g>
          </svg>
          
          {/* KL Divergences */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {showGaussian && (
              <div className="text-center">
                <div className="font-semibold text-red-600">Gaussian</div>
                <div>KL = {plotData.distributions.gaussian.kl_divergence.toFixed(6)}</div>
              </div>
            )}
            {showLaplace && (
              <div className="text-center">
                <div className="font-semibold text-green-600">Laplace</div>
                <div>KL = {plotData.distributions.laplace.kl_divergence.toFixed(6)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}