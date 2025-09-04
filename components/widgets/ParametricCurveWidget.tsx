'use client';

import React, { useState, useMemo, useCallback } from 'react';

interface CurvePreset {
  name: string;
  description: string;
  xParams: number[];
  yParams: number[];
  xTerms: string[];
  yTerms: string[];
  evaluateX: (t: number, params: number[]) => number;
  evaluateY: (t: number, params: number[]) => number;
}

const ParametricCurveWidget: React.FC = () => {
  // Current preset index
  const [currentPreset, setCurrentPreset] = useState(0);
  
  const presets: CurvePreset[] = [
    {
      name: "Elephant",
      description: "Von Neumann's famous elephant that can be made to wiggle its trunk",
      xParams: [-60, 30, -8, 10],
      yParams: [50, 18, -12, 14],
      xTerms: ['cos(t)', 'sin(t)', 'sin(2t)', 'sin(3t)'],
      yTerms: ['sin(t)', 'sin(2t)', 'cos(3t)', 'cos(5t)'],
      evaluateX: (t, p) => p[0] * Math.cos(t) + p[1] * Math.sin(t) + p[2] * Math.sin(2*t) + p[3] * Math.sin(3*t),
      evaluateY: (t, p) => p[0] * Math.sin(t) + p[1] * Math.sin(2*t) + p[2] * Math.cos(3*t) + p[3] * Math.cos(5*t)
    },
    {
      name: "Heart",
      description: "Heart-shaped curve: 12sin(t) - 4sin(3t), 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)",
      xParams: [12, -4, 0, 0],
      yParams: [13, -5, -2, -1],
      xTerms: ['sin(t)', 'sin(3t)', '—', '—'],
      yTerms: ['cos(t)', 'cos(2t)', 'cos(3t)', 'cos(4t)'],
      evaluateX: (t, p) => p[0] * Math.sin(t) + p[1] * Math.sin(3*t),
      evaluateY: (t, p) => p[0] * Math.cos(t) + p[1] * Math.cos(2*t) + p[2] * Math.cos(3*t) + p[3] * Math.cos(4*t)
    },
    {
      name: "Lissajous",
      description: "Classic figure-eight shape: A·sin(at), B·sin(bt)",
      xParams: [1, 3, 0, 0],
      yParams: [1, 2, 0, 0],
      xTerms: ['sin(3t)', 'sin(t)', '—', '—'],
      yTerms: ['sin(2t)', 'cos(2t)', '—', '—'],
      evaluateX: (t, p) => p[0] * Math.sin(3 * t) + p[1] * Math.sin(t),
      evaluateY: (t, p) => p[0] * Math.sin(2 * t) + p[1] * Math.cos(2 * t)
    }
  ];

  // Current parameters
  const [xParams, setXParams] = useState<number[]>(presets[0].xParams);
  const [yParams, setYParams] = useState<number[]>(presets[0].yParams);

  // SVG dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Generate curve points
  const curvePoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const numPoints = 1000;
    const preset = presets[currentPreset];
    
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      
      const x = preset.evaluateX(t, xParams);
      const y = preset.evaluateY(t, yParams);
      
      points.push({ x, y });
    }
    
    return points;
  }, [xParams, yParams, currentPreset]);

  // Calculate bounds for scaling
  const bounds = useMemo(() => {
    if (curvePoints.length === 0) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    
    const xs = curvePoints.map(p => p.x);
    const ys = curvePoints.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Add some padding
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const padding = 0.1;
    
    return {
      minX: minX - xRange * padding,
      maxX: maxX + xRange * padding,
      minY: minY - yRange * padding,
      maxY: maxY + yRange * padding
    };
  }, [curvePoints]);

  // Convert curve coordinates to SVG coordinates
  const toSVG = useCallback((x: number, y: number) => {
    const svgX = margin.left + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * innerWidth;
    const svgY = margin.top + ((bounds.maxY - y) / (bounds.maxY - bounds.minY)) * innerHeight;
    return { x: svgX, y: svgY };
  }, [bounds, innerWidth, innerHeight]);

  // Load preset
  const loadPreset = (presetIndex: number) => {
    const preset = presets[presetIndex];
    setCurrentPreset(presetIndex);
    setXParams([...preset.xParams]);
    setYParams([...preset.yParams]);
  };

  // Update parameter
  const updateXParam = (index: number, value: number) => {
    const newParams = [...xParams];
    newParams[index] = value;
    setXParams(newParams);
  };

  const updateYParam = (index: number, value: number) => {
    const newParams = [...yParams];
    newParams[index] = value;
    setYParams(newParams);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 space-y-4 sm:space-y-6">
      <h3 className="text-xl font-semibold mb-4">Parametric Curve Explorer</h3>
      
      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => loadPreset(idx)}
            className={`px-3 py-2 rounded transition-colors text-sm ${
              currentPreset === idx 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Curve visualization */}
      <div className="border rounded p-2 sm:p-4 overflow-hidden">
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto border" 
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />
          
          {/* Axes */}
          <line
            x1={margin.left}
            y1={height / 2}
            x2={width - margin.right}
            y2={height / 2}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <line
            x1={width / 2}
            y1={margin.top}
            x2={width / 2}
            y2={height - margin.bottom}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          
          {/* Curve */}
          {curvePoints.length > 0 && (
            <path
              d={curvePoints.map((point, i) => {
                const svgPoint = toSVG(point.x, point.y);
                return `${i === 0 ? 'M' : 'L'} ${svgPoint.x} ${svgPoint.y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Parameter controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* X parameters */}
        <div>
          <h4 className="text-lg font-semibold mb-3">X(t) Parameters</h4>
          <div className="space-y-3">
            {xParams.map((param, idx) => {
              const term = presets[currentPreset].xTerms[idx];
              if (term === '—' || term === '0') return null;
              
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="text-sm font-mono min-w-0 sm:w-20">{term}:</label>
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
              );
            })}
          </div>
        </div>

        {/* Y parameters */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Y(t) Parameters</h4>
          <div className="space-y-3">
            {yParams.map((param, idx) => {
              const term = presets[currentPreset].yTerms[idx];
              if (term === '—' || term === '0') return null;
              
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <label className="text-sm font-mono min-w-0 sm:w-20">{term}:</label>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Equations display */}
      <div className="p-3 sm:p-4 bg-gray-50 rounded">
        <h4 className="text-md font-semibold mb-2">Current Equations</h4>
        <div className="font-mono text-xs sm:text-sm space-y-1 overflow-x-auto">
          <div>
            x(t) = {xParams.map((param, idx) => {
              const term = presets[currentPreset].xTerms[idx];
              if (term === '—' || term === '0') return '';
              const sign = param >= 0 && idx > 0 ? ' + ' : ' ';
              return `${sign}${param.toFixed(2)}${term}`;
            }).filter(s => s).join('')}
          </div>
          <div>
            y(t) = {yParams.map((param, idx) => {
              const term = presets[currentPreset].yTerms[idx];
              if (term === '—' || term === '0') return '';
              const sign = param >= 0 && idx > 0 ? ' + ' : ' ';
              return `${sign}${param.toFixed(2)}${term}`;
            }).filter(s => s).join('')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametricCurveWidget;