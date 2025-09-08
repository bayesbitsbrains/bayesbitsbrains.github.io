'use client';

import React, { useState, useMemo, useCallback } from 'react';

type Mode = 'cartesian-fourier' | 'polar-fourier';

interface Preset {
  name: string;
  description: string;
  mode: Mode;
  // Mayer 2010: x_F, y_F coefficients
  xParams?: number[]; // [B1x, B2x, A3x, A5x]
  yParams?: number[]; // [A1y, B1y, B2y, B3y]
  // Jin & Yuan 2024: polar coefficients
  polarParams?: number[]; // [a1, a3, a7, a8, c]
}

const MAYER_DEFAULT_X = [50, 18, 12, -14];     // B1x, B2x, A3x, A5x
const MAYER_DEFAULT_Y = [-60, -30, 8, -10];    // A1y, B1y, B2y, B3y
const JINYUAN_DEFAULT = [47.84, -51.12, -20.43, 31.58, 120]; // a1, a3, a7, a8, c

const PRESETS: Preset[] = [
  {
    name: 'Mayer 2010 (side view)',
    description: 'Four complex params → truncated Cartesian Fourier',
    mode: 'cartesian-fourier',
    xParams: [...MAYER_DEFAULT_X],
    yParams: [...MAYER_DEFAULT_Y],
  },
  {
    name: 'Jin & Yuan 2024 (front view)',
    description: 'Four non-zero polar Fourier params r(θ)=Σ a_k cos(kθ)+c',
    mode: 'polar-fourier',
    polarParams: [...JINYUAN_DEFAULT],
  },
];

const ParametricCurveWidget: React.FC = () => {
  const [currentPreset, setCurrentPreset] = useState(0);
  const [xParams, setXParams] = useState<number[]>(PRESETS[0].xParams ?? []);
  const [yParams, setYParams] = useState<number[]>(PRESETS[0].yParams ?? []);
  const [polarParams, setPolarParams] = useState<number[]>(
    PRESETS[1].polarParams ?? [...JINYUAN_DEFAULT]
  );

  const loadPreset = (idx: number) => {
    setCurrentPreset(idx);
    const p = PRESETS[idx];
    if (p.mode === 'cartesian-fourier') {
      setXParams([...(p.xParams ?? MAYER_DEFAULT_X)]);
      setYParams([...(p.yParams ?? MAYER_DEFAULT_Y)]);
    } else {
      setPolarParams([...(p.polarParams ?? JINYUAN_DEFAULT)]);
    }
  };

  const resetAll = () => loadPreset(currentPreset);

  // ---- Evaluators ----
  // Mayer 2010 (Cartesian Fourier):
  const evalXF = useCallback((t: number, p: number[]) =>
    p[0]*Math.sin(t) + p[1]*Math.sin(2*t) + p[2]*Math.cos(3*t) + p[3]*Math.cos(5*t)
  , []);
  const evalYF = useCallback((t: number, q: number[]) =>
    q[0]*Math.cos(t) + q[1]*Math.sin(t) + q[2]*Math.sin(2*t) + q[3]*Math.sin(3*t)
  , []);

  // Jin & Yuan 2024 (Polar Fourier):
  const evalR = useCallback((theta: number, a: number[]) => {
    // a = [a1, a3, a7, a8, c]
    return a[0]*Math.cos(theta) + a[1]*Math.cos(3*theta) + a[2]*Math.cos(7*theta) + a[3]*Math.cos(8*theta) + a[4];
  }, []);

  // SVG dims
  const width = 600, height = 400;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // ---- Build curve ----
  const curvePoints = useMemo(() => {
    const N = 1000;
    const pts: { x: number; y: number }[] = [];
    const preset = PRESETS[currentPreset];

    if (preset.mode === 'cartesian-fourier') {
      // Display orientation (as in common demos): (X,Y)=(y_F, -x_F)
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * 2 * Math.PI;
        const xF = evalXF(t, xParams);
        const yF = evalYF(t, yParams);
        pts.push({ x: yF, y: -xF });
      }
    } else {
      // Polar: r(θ) then to Cartesian, rotated 90° so elephant faces up
      for (let i = 0; i <= N; i++) {
        const theta = (i / N) * 2 * Math.PI;
        const r = evalR(theta, polarParams);
        // Rotate 90 degrees: (x,y) = (-sin(θ), cos(θ)) instead of (cos(θ), sin(θ))
        pts.push({ x: -r * Math.sin(theta), y: r * Math.cos(theta) });
      }
    }
    return pts;
  }, [currentPreset, xParams, yParams, polarParams, evalXF, evalYF, evalR]);

  // Bounds & scaler
  const bounds = useMemo(() => {
    if (curvePoints.length === 0) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
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

  const toSVG = useCallback((x: number, y: number) => {
    const svgX = margin.left + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * innerWidth;
    const svgY = margin.top + ((bounds.maxY - y) / (bounds.maxY - bounds.minY)) * innerHeight;
    return { x: svgX, y: svgY };
  }, [bounds, innerWidth, innerHeight]);

  // ---- UI handlers ----
  const updateXParam = (i: number, v: number) => { const a=[...xParams]; a[i]=v; setXParams(a); };
  const updateYParam = (i: number, v: number) => { const a=[...yParams]; a[i]=v; setYParams(a); };
  const updatePolarParam = (i: number, v: number) => { const a=[...polarParams]; a[i]=v; setPolarParams(a); };

  const preset = PRESETS[currentPreset];

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header & controls */}
      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Parametric Elephant Explorer</h3>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => loadPreset(idx)}
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm ${currentPreset===idx ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              title={p.description}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={resetAll}
            className="px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm bg-gray-200 hover:bg-gray-300"
            title="Restore preset defaults"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Plot */}
      <div className="border rounded p-2 sm:p-4 overflow-hidden">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto border" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />
          <line x1={margin.left} y1={height/2} x2={width - margin.right} y2={height/2} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={width/2} y1={margin.top} x2={width/2} y2={height - margin.bottom} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" />

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

      {/* Parameter controls - responsive layout fixes */}
      {preset.mode === 'cartesian-fourier' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-3">Mayer 2010 — x<sub>F</sub>(t) Coefficients</h4>
            <div className="space-y-3">
              {xParams.map((param, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="text-sm font-mono min-w-0 sm:w-28">{['sin(t)','sin(2t)','cos(3t)','cos(5t)'][idx]}:</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="range" min={-100} max={100} step={0.1} value={param} 
                           onChange={(e)=>updateXParam(idx, parseFloat(e.target.value))} 
                           className="flex-1 min-w-0" />
                    <input type="number" step={0.1} value={param.toFixed(2)} 
                           onChange={(e)=>updateXParam(idx, parseFloat(e.target.value)||0)} 
                           className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-3">Mayer 2010 — y<sub>F</sub>(t) Coefficients</h4>
            <div className="space-y-3">
              {yParams.map((param, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="text-sm font-mono min-w-0 sm:w-28">{['cos(t)','sin(t)','sin(2t)','sin(3t)'][idx]}:</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="range" min={-100} max={100} step={0.1} value={param} 
                           onChange={(e)=>updateYParam(idx, parseFloat(e.target.value))} 
                           className="flex-1 min-w-0" />
                    <input type="number" step={0.1} value={param.toFixed(2)} 
                           onChange={(e)=>updateYParam(idx, parseFloat(e.target.value)||0)} 
                           className="w-16 sm:w-20 px-1 sm:px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-3">Jin & Yuan 2024 — r(θ) Coefficients</h4>
            <div className="space-y-3">
              {polarParams.map((param, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="text-sm font-mono min-w-0 sm:w-32">
                    {['a₁·cos(θ)','a₃·cos(3θ)','a₇·cos(7θ)','a₈·cos(8θ)','c (offset)'][idx]}:
                  </label>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="range" min={idx === 4 ? 0 : -120} max={idx === 4 ? 200 : 120} step={0.1} value={param}
                      onChange={(e)=>updatePolarParam(idx, parseFloat(e.target.value))} 
                      className="flex-1 min-w-0" />
                    <input type="number" step={0.1} value={param.toFixed(2)}
                      onChange={(e)=>updatePolarParam(idx, parseFloat(e.target.value)||0)} 
                      className="w-16 sm:w-24 px-1 sm:px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Paper uses four non-zero parameters a₁, a₃, a₇, a₈ and a constant c (they set c to the mean radius r̄ of sampled points).
            </p>
          </div>
        </div>
      )}

      {/* Equation readout */}
      <div className="p-3 sm:p-4 bg-gray-50 rounded">
        <h4 className="text-md font-semibold mb-2">Current Equations</h4>
        {preset.mode === 'cartesian-fourier' ? (
          <div className="font-mono text-xs sm:text-sm space-y-1 overflow-x-auto">
            <div>
              x_F(t) = {xParams[0].toFixed(2)}·sin(t)
              {` ${xParams[1]>=0?'+':''} ${xParams[1].toFixed(2)}·sin(2t)` }
              {` ${xParams[2]>=0?'+':''} ${xParams[2].toFixed(2)}·cos(3t)` }
              {` ${xParams[3]>=0?'+':''} ${xParams[3].toFixed(2)}·cos(5t)` }
            </div>
            <div>
              y_F(t) = {yParams[0].toFixed(2)}·cos(t)
              {` ${yParams[1]>=0?'+':''} ${yParams[1].toFixed(2)}·sin(t)` }
              {` ${yParams[2]>=0?'+':''} ${yParams[2].toFixed(2)}·sin(2t)` }
              {` ${yParams[3]>=0?'+':''} ${yParams[3].toFixed(2)}·sin(3t)` }
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Displayed as (x,y) = (y_F, −x_F). Based on Mayer–Khairy–Howard (2010).
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs sm:text-sm space-y-1 overflow-x-auto">
            <div>
              r(θ) = {polarParams[0].toFixed(2)}·cos(θ)
              {` ${polarParams[1]>=0?'+':''} ${polarParams[1].toFixed(2)}·cos(3θ)` }
              {` ${polarParams[2]>=0?'+':''} ${polarParams[2].toFixed(2)}·cos(7θ)` }
              {` ${polarParams[3]>=0?'+':''} ${polarParams[3].toFixed(2)}·cos(8θ)` }
              {` ${polarParams[4]>=0?'+':''} ${polarParams[4].toFixed(2)}`}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Then x = r·cos(θ), y = r·sin(θ). From Jin & Yuan (2024), Eq. (1).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParametricCurveWidget;