'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { PolynomialRegression } from 'ml-regression-polynomial';

interface Point { x: number; y: number; }

interface ModelResult {
  degree: number;
  mse: number;
  logMSE: number;         // n * log(MSE)   (constants dropped)
  K: number;              // total params including sigma^2
  aic: number;            // AIC without correction (for reference)
  aicc: number;           // AIC with small-sample correction
  bic: number;            // BIC
  aicBasePenalty: number; // 2K
  aiccExtra: number;      // 2K(K+1)/(n-K-1)  (NaN/Inf if n <= K+1)
  bicPenalty: number;     // K * log(n)
  model: any;
  coefficients: number[];
}

const PolynomialRegressionWidget: React.FC = () => {
  // Default points forming a noisy cubic pattern
  const defaultPoints: Point[] = [
    { x: 0.5, y: 2.8 }, { x: 0.71, y: 2.4 }, { x: 0.92, y: 3.1 }, { x: 1.13, y: 3.5 },
    { x: 1.34, y: 3.0 }, { x: 1.55, y: 3.8 }, { x: 1.76, y: 3.4 }, { x: 1.97, y: 4.1 },
    { x: 2.18, y: 3.9 }, { x: 2.39, y: 3.2 }, { x: 2.61, y: 3.7 }, { x: 2.82, y: 3.1 },
    { x: 3.03, y: 2.8 }, { x: 3.24, y: 2.2 }, { x: 3.45, y: 2.5 }, { x: 3.66, y: 1.8 },
    { x: 3.87, y: 1.3 }, { x: 4.08, y: 1.7 }, { x: 4.29, y: 1.1 }, { x: 4.5, y: 1.5 },
  ];

  const [points, setPoints] = useState<Point[]>(defaultPoints);
  const [isCreatingData, setIsCreatingData] = useState(false);
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hoveredDegree, setHoveredDegree] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  // SVG dimensions for click area
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };

  // Calculate MSE on the whole dataset
  const calculateMSE = useCallback((pts: Point[], model: any): number => {
    let sse = 0;
    for (const p of pts) {
      const pred = model.predict(p.x);
      sse += Math.pow(p.y - pred, 2);
    }
    return sse / pts.length;
  }, []);

  // Handle click to add points
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!isCreatingData) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - margin.left) / (rect.width - margin.left - margin.right) * 5;
    const y = (1 - (e.clientY - rect.top - margin.top) / (rect.height - margin.top - margin.bottom)) * 5;
    if (x >= 0 && x <= 5 && y >= 0 && y <= 5) {
      setPoints(prev => [...prev, { x, y }]);
    }
  }, [isCreatingData]);

  // Reset
  const handleReset = () => {
    setPoints([]);
    setIsCreatingData(true);
    setModelResults([]);
    setError('');
    setHoveredDegree(null);
  };

  // Fit all polynomial models
  const handleRun = async () => {
    if (points.length < 3) {
      setError('Please add at least 3 points to fit a polynomial');
      return;
    }
    setIsRunning(true);
    setIsCreatingData(false);
    setError('');

    const n = points.length;
    const x = points.map(p => p.x);
    const y = points.map(p => p.y);
    const results: ModelResult[] = [];

    try {
      // Fit degrees 1..min(10, n-2). AICc will become undefined (∞) when n <= K+1.
      const maxDegree = Math.min(10, n - 2);
      for (let degree = 1; degree <= maxDegree; degree++) {
        const model = new PolynomialRegression(x, y, degree);
        const rawMSE = calculateMSE(points, model);
        const mse = Math.max(rawMSE, 1e-12); // guard against log(0)
        const logMSE = n * Math.log(mse);

        // Parameter counting:
        // mean parameters = degree + 1 (including intercept); +1 for sigma^2
        const K = (degree + 1) + 1;

        // Penalties (constants of likelihood omitted—they cancel across models)
        const aicBasePenalty = 2 * K;
        const aic = logMSE + aicBasePenalty;

        const denom = n - K - 1;
        const aiccExtra = denom > 0 ? (2 * K * (K + 1)) / denom : Number.POSITIVE_INFINITY;
        const aicc = isFinite(aiccExtra) ? aic + aiccExtra : Number.POSITIVE_INFINITY;

        const bicPenalty = K * Math.log(n);
        const bic = logMSE + bicPenalty;

        results.push({
          degree, mse, logMSE, K, aic, aicc, bic,
          aicBasePenalty, aiccExtra, bicPenalty,
          model, coefficients: model.coefficients
        });

        // gentle yield for UI
        if (degree % 3 === 0) await new Promise(r => setTimeout(r, 10));
      }
      setModelResults(results);
    } catch (err) {
      console.error('Error fitting models:', err);
      setError('Error fitting models. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  // Generate smooth curve for plotting
  const generateCurve = useCallback((model: any, numPoints: number = 100): Point[] => {
    const curve: Point[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const x = i / numPoints * 5;
      const y = model.predict(x);
      curve.push({ x, y });
    }
    return curve;
  }, []);

  // Curve for the hovered degree
  const modelCurve = useMemo(() => {
    if (hoveredDegree === null) return [];
    const r = modelResults.find(m => m.degree === hoveredDegree);
    return r ? generateCurve(r.model) : [];
  }, [hoveredDegree, modelResults, generateCurve]);

  // Best models (AICc & BIC)
  const bestAICc = useMemo(() => {
    const finite = modelResults.filter(r => isFinite(r.aicc));
    if (finite.length === 0) return null;
    return finite.reduce((best, r) => (r.aicc < best.aicc ? r : best), finite[0]);
  }, [modelResults]);

  const bestBIC = useMemo(() => {
    if (modelResults.length === 0) return null;
    return modelResults.reduce((best, r) => (r.bic < best.bic ? r : best), modelResults[0]);
  }, [modelResults]);

  // Chart data
  const chartData = useMemo(() => modelResults.map(r => ({
    degree: r.degree,
    logMSE: r.logMSE,
    AICc: isFinite(r.aicc) ? r.aicc : null,
    BIC: r.bic
  })), [modelResults]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold mb-4">Polynomial Regression — AICc & BIC Model Selection</h3>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap items-center">
        <button onClick={handleReset}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
          RESET
        </button>
        <button onClick={handleRun}
                disabled={points.length < 3 || isRunning}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400">
          {isRunning ? 'Running...' : 'Run'}
        </button>
        {isCreatingData && <div className="widget-explanation">Click on the plot to add data points</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Scatter plot with optional fitted curve */}
      <div className="border rounded p-4">
        <h4 className="text-lg font-semibold mb-3">
          Data Points {points.length > 0 && `(${points.length} points)`}
        </h4>
        <svg
          width={width}
          height={height}
          className="w-full cursor-crosshair"
          style={{ maxWidth: `${width}px` }}
          onClick={handleCanvasClick}
        >
          {/* Grid */}
          {[0, 1, 2, 3, 4, 5].map(val => (
            <g key={val}>
              <line
                x1={margin.left + (val / 5) * (width - margin.left - margin.right)}
                y1={margin.top}
                x2={margin.left + (val / 5) * (width - margin.left - margin.right)}
                y2={height - margin.bottom}
                stroke="#e5e7eb"
                strokeDasharray="2,2"
              />
              <line
                x1={margin.left}
                y1={height - margin.bottom - (val / 5) * (height - margin.top - margin.bottom)}
                x2={width - margin.right}
                y2={height - margin.bottom - (val / 5) * (height - margin.top - margin.bottom)}
                stroke="#e5e7eb"
                strokeDasharray="2,2"
              />
            </g>
          ))}

          {/* Axes */}
          <line x1={margin.left} y1={height - margin.bottom}
                x2={width - margin.right} y2={height - margin.bottom}
                stroke="#374151" strokeWidth="2" />
          <line x1={margin.left} y1={margin.top}
                x2={margin.left} y2={height - margin.bottom}
                stroke="#374151" strokeWidth="2" />

          {/* Tick labels */}
          {[0, 1, 2, 3, 4, 5].map(val => (
            <g key={val}>
              <text
                x={margin.left + (val / 5) * (width - margin.left - margin.right)}
                y={height - margin.bottom + 20}
                textAnchor="middle" fontSize="12" fill="#374151">{val}</text>
              <text
                x={margin.left - 10}
                y={height - margin.bottom - (val / 5) * (height - margin.top - margin.bottom) + 5}
                textAnchor="end" fontSize="12" fill="#374151">{val}</text>
            </g>
          ))}

          {/* Axis titles */}
          <text x={margin.left + (width - margin.left - margin.right) / 2}
                y={height - 5} textAnchor="middle" fontSize="14"
                fill="#374151" fontWeight="bold">x</text>
          <text x={15}
                y={margin.top + (height - margin.top - margin.bottom) / 2}
                textAnchor="middle" fontSize="14" fill="#374151" fontWeight="bold"
                transform={`rotate(-90, 15, ${margin.top + (height - margin.top - margin.bottom) / 2})`}>
            y
          </text>

          {/* Hovered model curve */}
          {hoveredDegree !== null && modelCurve.length > 0 && (
            <polyline
              points={modelCurve.map(p =>
                `${margin.left + (p.x / 5) * (width - margin.left - margin.right)},` +
                `${height - margin.bottom - (Math.min(5, Math.max(0, p.y)) / 5) * (height - margin.top - margin.bottom)}`
              ).join(' ')}
              fill="none" stroke="#ff7300" strokeWidth="3" opacity="0.8"
            />
          )}

          {/* Data points */}
          {points.map((point, i) => (
            <circle key={i}
                    cx={margin.left + (point.x / 5) * (width - margin.left - margin.right)}
                    cy={height - margin.bottom - (point.y / 5) * (height - margin.top - margin.bottom)}
                    r="5" fill="#8884d8" stroke="#6b63c7" strokeWidth="2" />
          ))}

          {/* Legend for curve */}
          {hoveredDegree !== null && (
            <g>
              <rect x={width - 150} y={margin.top + 10} width={15} height={15} fill="#8884d8" />
              <text x={width - 130} y={margin.top + 22} fontSize="12" fill="#374151">Data Points</text>
              <rect x={width - 150} y={margin.top + 30} width={15} height={15} fill="#ff7300" />
              <text x={width - 130} y={margin.top + 42} fontSize="12" fill="#374151">
                Polynomial (degree {hoveredDegree})
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Model selection results */}
      {modelResults.length > 0 && (
        <>
          <div>
            <h4 className="text-lg font-semibold mb-3">Model Comparison</h4>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeLabel != null) setHoveredDegree(e.activeLabel);
                }}
                onMouseLeave={() => setHoveredDegree(null)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="degree"
                  label={{ value: 'Polynomial Degree', position: 'insideBottom', offset: -10 }}
                  ticks={chartData.map(r => r.degree)}
                />
                <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(v: number) => (v == null ? '-' : v.toFixed(2))} />
                <Legend />
                <Line type="monotone" dataKey="logMSE" stroke="#8884d8" strokeWidth={2}
                      name="n × log(MSE)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="AICc" stroke="#ff7300" strokeWidth={3}
                      name="AICc" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="BIC" stroke="#10b981" strokeWidth={3}
                      name="BIC" dot={{ r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-3 text-sm flex gap-6">
              {bestAICc && (
                <div>Best by <strong>AICc</strong>: degree <strong>{bestAICc.degree}</strong></div>
              )}
              {bestBIC && (
                <div>Best by <strong>BIC</strong>: degree <strong>{bestBIC.degree}</strong></div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
};

export default PolynomialRegressionWidget;