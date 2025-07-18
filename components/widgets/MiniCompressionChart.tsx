"use client";

import React, { useState } from "react";

interface MiniChartData {
  progressPercent: number;
  bitsPerChar: number;
}

interface MiniCompressionChartProps {
  data: MiniChartData[];
  modelName: string;
  experimentName: string;
  width?: number;
  height?: number;
}

export default function MiniCompressionChart({ 
  data, 
  modelName, 
  experimentName, 
  width, 
  height = 120 
}: MiniCompressionChartProps) {
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (data.length === 0) return null;

  // Use viewBox for responsive sizing
  const viewBoxWidth = 400;
  const margin = { top: 10, right: 15, bottom: 25, left: 35 };
  const innerWidth = viewBoxWidth - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxBits = Math.max(...data.map(d => d.bitsPerChar));
  const minBits = Math.min(...data.map(d => d.bitsPerChar));
  const avgBits = data.reduce((sum, d) => sum + d.bitsPerChar, 0) / data.length;

  // Create SVG path
  const createPath = () => {
    if (data.length === 0) return "";
    
    const xScale = innerWidth / 100; // 0-100%
    const yScale = innerHeight / (maxBits - minBits || 1);
    
    let path = `M ${data[0].progressPercent * xScale} ${innerHeight - ((data[0].bitsPerChar - minBits) * yScale)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = data[i].progressPercent * xScale;
      const y = innerHeight - ((data[i].bitsPerChar - minBits) * yScale);
      path += ` L ${x} ${y}`;
    }
    
    return path;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    
    // Convert from actual SVG coordinates to viewBox coordinates
    const scaleX = viewBoxWidth / rect.width;
    const scaleY = height / rect.height;
    
    const viewBoxX = svgX * scaleX;
    const viewBoxY = svgY * scaleY;
    
    // Convert to chart coordinates (relative to chart area)
    const x = viewBoxX - margin.left;
    const y = viewBoxY - margin.top;
    
    if (x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight) {
      setHoverPos({ x, y });
    } else {
      setHoverPos(null);
    }
  };

  const getValueAtPosition = (x: number, y: number) => {
    const progressPercent = (x / innerWidth) * 100;
    // Calculate the actual bits/char value at cursor position
    const bitsPerChar = minBits + ((innerHeight - y) / innerHeight) * (maxBits - minBits);
    
    return {
      progressPercent: Math.max(0, Math.min(100, progressPercent)),
      bitsPerChar: Math.max(minBits, Math.min(maxBits, bitsPerChar))
    };
  };

  const yTicks = [minBits, (minBits + maxBits) / 2, maxBits];

  return (
    <div className="mini-compression-chart">
      <div className="text-xs font-medium text-gray-700 mb-1">
        {modelName} - {experimentName}
      </div>
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${viewBoxWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-gray-50 border border-gray-200 rounded"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPos(null)}
      >
        {/* Chart background */}
        <rect 
          x={margin.left} 
          y={margin.top} 
          width={innerWidth} 
          height={innerHeight} 
          fill="white" 
          stroke="#e5e7eb"
        />
        
        {/* Y-axis ticks and labels */}
        {yTicks.map((tick, i) => {
          const y = margin.top + innerHeight - ((tick - minBits) / (maxBits - minBits || 1)) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="#f3f4f6"
                strokeDasharray="1,1"
              />
              <text
                x={margin.left - 5}
                y={y + 3}
                textAnchor="end"
                fontSize="8"
                fill="#6b7280"
              >
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis ticks */}
        {[0, 50, 100].map(percent => {
          const x = margin.left + (percent / 100) * innerWidth;
          return (
            <g key={percent}>
              <line
                x1={x}
                y1={margin.top + innerHeight}
                x2={x}
                y2={margin.top + innerHeight + 3}
                stroke="#6b7280"
              />
              <text
                x={x}
                y={margin.top + innerHeight + 15}
                textAnchor="middle"
                fontSize="8"
                fill="#6b7280"
              >
                {percent}%
              </text>
            </g>
          );
        })}
        
        {/* Data line */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <path
            d={createPath()}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
          />
        </g>
        
        {/* Hover crosshairs */}
        {hoverPos && (
          <g>
            {/* Vertical line */}
            <line
              x1={margin.left + hoverPos.x}
              y1={margin.top}
              x2={margin.left + hoverPos.x}
              y2={margin.top + innerHeight}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.7"
            />
            {/* Horizontal line */}
            <line
              x1={margin.left}
              y1={margin.top + hoverPos.y}
              x2={margin.left + innerWidth}
              y2={margin.top + hoverPos.y}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.7"
            />
          </g>
        )}
        
        {/* Axis labels */}
        <text
          x={viewBoxWidth / 2}
          y={height - 2}
          textAnchor="middle"
          fontSize="8"
          fill="#374151"
        >
          Progress (%)
        </text>
        <text
          x={8}
          y={height / 2}
          textAnchor="middle"
          fontSize="8"
          fill="#374151"
          transform={`rotate(-90, 8, ${height / 2})`}
        >
          Bits/char
        </text>
      </svg>
      
      {/* Hover tooltip */}
      {hoverPos && (
        <div className="text-xs text-gray-600 mt-1">
          {(() => {
            const value = getValueAtPosition(hoverPos.x, hoverPos.y);
            return `${value.progressPercent.toFixed(1)}% → ${value.bitsPerChar.toFixed(3)} bits/char`;
          })()}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-1">
        Avg: {avgBits.toFixed(3)} bits/char
      </div>
    </div>
  );
}