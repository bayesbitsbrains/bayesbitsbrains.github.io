'use client';

import React, { useState, useMemo, useCallback } from 'react';

interface CurvePreset {
  name: string;
  description: string;
  // Order matters: see xTerms / yTerms just below
  xParams: number[]; // [B1x, B2x, A3x, A5x]
  yParams: number[]; // [A1y, B1y, B2y, B3y]
  xTerms: string[];  // ['sin(t)', 'sin(2t)', 'cos(3t)', 'cos(5t)']
  yTerms: string[];  // ['cos(t)', 'sin(t)', 'sin(2t)', 'sin(3t)']
  hasWiggle?: boolean;
}

const ELEPHANT_DEFAULT = {
  // Paper's Table 1 coefficients (see notes below)
  xParams: [50, 18, 12, -14],   // B1x, B2x, A3x, A5x
  yParams: [-60, -30, 8, -10],  // A1y, B1y, B2y, B3y
  wiggle: 40                    // Re(p5) in the paper
};

const ParametricCurveWidget: React.FC = () => {
  const presets: CurvePreset[] = [
    {
      name: "Elephant",
      description:
        "Mayer–Khairy–Howard (2010) elephant; 5th parameter controls trunk wiggle",
      xParams: [...ELEPHANT_DEFAULT.xParams],
      yParams: [...ELEPHANT_DEFAULT.yParams],
      xTerms: ['sin(t)', 'sin(2t)', 'cos(3t)', 'cos(5t)'],
      yTerms: ['cos(t)', 'sin(t)', 'sin(2t)', 'sin(3t)'],
      hasWiggle: true
    },
    // -----------------------------------------------------------
    // The following presets are intentionally commented out:
    // {
    //   name: "Heart", ...
    // },
    // {
    //   name: "Lissajous", ...
    // }
    // -----------------------------------------------------------
  ];

  // State
  const [currentPreset, setCurrentPreset] = useState(0);
  const [xParams, setXParams] = useState<number[]>([...presets[0].xParams]);
  const [yParams, setYParams] = useState<number[]>([...presets[0].yParams]);
  const [wiggleParam, setWiggleParam] = useState<number>(ELEPHANT_DEFAULT.wiggle);

  // Reset to paper defaults
  const resetAll = () => {
    const p = presets[currentPreset];
    setXParams([...p.xParams]);
    setYParams([...p.yParams]);
    setWiggleParam(ELEPHANT_DEFAULT.wiggle);
  };

  // Load preset (only Elephant is visible now, but this keeps API intact)
  const loadPreset = (presetIndex: number) => {
    const preset = presets[presetIndex];
    setCurrentPreset(presetIndex);
    setXParams([...preset.xParams]);
    setYParams([...preset.yParams]);
    setWiggleParam(ELEPHANT_DEFAULT.wiggle);
  };

  // === Fourier evaluators for the paper's basis ===
  // x_F(t) = B1x*sin t + B2x*sin 2t + A3x*cos 3t + A5x*cos 5t
  const evalXF = useCallback((t: number, p: number[]) => {
    return p[0]*Math.sin(t) + p[1]*Math.sin(2*t) + p[2]*Math.cos(3*t) + p[3]*Math.cos(5*t);
  }, []);
  // y_F(t) = A1y*cos t + B1y*sin t + B2y*sin 2t + B3y*sin 3t
  const evalYF = useCallback((t: number, q: number[]) => {
    return q[0]*Math.cos(t) + q[1]*Math.sin(t) + q[2]*Math.sin(2*t) + q[3]*Math.sin(3*t);
  }, []);

  // SVG dims
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Generate curve points, including the (static) trunk wiggle
  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const N = 1000;
    const hasWiggle = presets[currentPreset].hasWiggle;

    // trunk segment in parameter space (matches common demos)
    const tStart = 0.9 * Math.PI;
    const tEnd   = 1.4 * Math.PI;

    // Base point at trunk attachment (display space)
    const xF0 = evalXF(tStart, xParams);
    const yF0 = evalYF(tStart, yParams);
    // Display orientation used by standard plots: (x,y) = (y_F, -x_F)
    const x0 = yF0;
    const y0 = -xF0;

    // Legacy scale and fixed "phase" (use phase=1 to show max-amplitude snapshot)
    const scale = 1000;
    const phase = 1;

    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 * Math.PI;

      const xF = evalXF(t, xParams);
      const yF = evalYF(t, yParams);

      // rotate/flip to match the paper's usual presentation
      let x = yF;
      let y = -xF;

      // apply wiggle only on trunk segment
      if (hasWiggle && wiggleParam > 0 && t >= tStart && t <= tEnd) {
        const dx = Math.sin((x - x0) * Math.PI / scale) * phase * wiggleParam;
        x += dx; // sideways wag
      }

      pts.push({ x, y });
    }
    return pts;
  }, [xParams, yParams, currentPreset, wiggleParam, evalXF, evalYF]);

  // Bounds for scaling
  const bounds = useMemo(() => {
    if (curvePoints.length === 0) {
      return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    }
    const xs = curvePoints.map(p => p.x);
    const ys = curvePoints.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 0.1;
    return {
      minX: minX - (maxX - minX) * pad,
      maxX: maxX + (maxX - minX) * pad,
      minY: minY - (maxY - minY) * pad,
      maxY: maxY + (maxY - minY) * pad
    };
  }, [curvePoints]);

  // Data -> SVG coords
  const toSVG = useCallback((x: number, y: number) => {
    const svgX = margin.left + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * innerWidth;
    const svgY = margin.top + ((bounds.maxY - y) / (bounds.maxY - bounds.minY)) * innerHeight;
    return { x: svgX, y: svgY };
  }, [bounds, innerWidth, innerHeight]);

  // Update individual params
  const updateXParam = (i: number, v: number) => {
    const a = [...xParams]; a[i] = v; setXParams(a);
  };
  const updateYParam = (i: number, v: number) => {
    const a = [...yParams]; a[i] = v; setYParams(a);
  };

  const preset = presets[currentPreset];

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">Parametric Curve Explorer</h3>
        <div className="flex gap-2">
          {/* Only Elephant is active now */}
          <button
            onClick={() => loadPreset(0)}
            className={`px-3 py-2 rounded text-sm bg-blue-600 text-white`}
            title={preset.description}
          >
            Elephant
          </button>
          <button
            onClick={resetAll}
            className="px-3 py-2 rounded text-sm bg-gray-200 hover:bg-gray-300"
            title="Restore coefficients and wiggle to paper defaults"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Plot */}
      <div className="border rounded p-2 sm:p-4 overflow-hidden">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto border"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Axes */}
          <line x1={margin.left} y1={height / 2} x2={width - margin.right} y2={height / 2}
                stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={width / 2} y1={margin.top} x2={width / 2} y2={height - margin.bottom}
                stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" />

          {/* Curve */}
          {curvePoints.length > 0 && (
            <path
              d={curvePoints.map((p, i) => {
                const s = toSVG(p.x, p.y);
                return `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Wiggle control */}
      {preset.hasWiggle && (
        <div className="p-3 sm:p-4 bg-blue-50 rounded">
          <h4 className="text-lg font-semibold mb-3">🐘 Trunk Wiggle</h4>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium min-w-0 sm:w-32">Wiggle intensity:</label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={wiggleParam}
                onChange={(e) => setWiggleParam(parseFloat(e.target.value))}
                className="flex-1 min-w-0"
              />
              <input
                type="number"
                value={Number.isFinite(wiggleParam) ? wiggleParam : 0}
                onChange={(e) => setWiggleParam(parseFloat(e.target.value) || 0)}
                className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-sm"
                step="1"
                min="0"
                max="80"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Coefficients and wiggle parameter from Mayer, Khairy & Howard (2010){' '}
            <a href="https://publications.mpi-cbg.de/Mayer_2010_4314.pdf" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:text-blue-800 underline">paper</a>.
          </p>
        </div>
      )}

      {/* Parameter controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* X parameters */}
        <div>
          <h4 className="text-lg font-semibold mb-3">x<sub>F</sub>(t) Parameters</h4>
          <div className="space-y-3">
            {xParams.map((param, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label className="text-sm font-mono min-w-0 sm:w-28">{preset.xTerms[idx]}:</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="0.1"
                    value={param}
                    onChange={(e) => updateXParam(idx, parseFloat(e.target.value))}
                    className="flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    value={param.toFixed(2)}
                    onChange={(e) => updateXParam(idx, parseFloat(e.target.value) || 0)}
                    className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-sm"
                    step="0.1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Y parameters */}
        <div>
          <h4 className="text-lg font-semibold mb-3">y<sub>F</sub>(t) Parameters</h4>
          <div className="space-y-3">
            {yParams.map((param, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label className="text-sm font-mono min-w-0 sm:w-28">{preset.yTerms[idx]}:</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="0.1"
                    value={param}
                    onChange={(e) => updateYParam(idx, parseFloat(e.target.value))}
                    className="flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    value={param.toFixed(2)}
                    onChange={(e) => updateYParam(idx, parseFloat(e.target.value) || 0)}
                    className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-sm"
                    step="0.1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equations display */}
      <div className="p-3 sm:p-4 bg-gray-50 rounded">
        <h4 className="text-md font-semibold mb-2">Current Equations (Fourier model)</h4>
        <div className="font-mono text-xs sm:text-sm space-y-1 overflow-x-auto">
          <div>
            x_F(t) =
            {' '}{xParams[0].toFixed(2)}·sin(t)
            {' '}{xParams[1] >= 0 ? '+ ' : ''}{xParams[1].toFixed(2)}·sin(2t)
            {' '}{xParams[2] >= 0 ? '+ ' : ''}{xParams[2].toFixed(2)}·cos(3t)
            {' '}{xParams[3] >= 0 ? '+ ' : ''}{xParams[3].toFixed(2)}·cos(5t)
          </div>
          <div>
            y_F(t) =
            {' '}{yParams[0].toFixed(2)}·cos(t)
            {' '}{yParams[1] >= 0 ? '+ ' : ''}{yParams[1].toFixed(2)}·sin(t)
            {' '}{yParams[2] >= 0 ? '+ ' : ''}{yParams[2].toFixed(2)}·sin(2t)
            {' '}{yParams[3] >= 0 ? '+ ' : ''}{yParams[3].toFixed(2)}·sin(3t)
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Displayed curve uses (x,y) = (y_F, -x_F).{preset.hasWiggle ? `  Trunk wiggle intensity: ${wiggleParam}.` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametricCurveWidget;