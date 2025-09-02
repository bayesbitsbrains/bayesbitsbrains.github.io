"use client";

import React, { useState, useMemo, useCallback } from "react";
import KatexMath from "@/components/content/KatexMath";

type Lambda = {
  id: string;
  name: string;
  mathDisplay: string;
  value: number;
  type: 'polynomial' | 'log' | 'indicator' | 'sin';
  power?: number;
};

type Props = {
  title?: string;
};

const DistributionConstraintBuilder: React.FC<Props> = ({
  title = "Maximum Entropy Distribution Builder"
}) => {
  const [lambdas, setLambdas] = useState<Lambda[]>([
    { id: "lambda1", name: "λ₁", mathDisplay: "\\lambda_1", value: 20, type: 'polynomial', power: 1 },
    { id: "lambda2", name: "λ₂", mathDisplay: "\\lambda_2", value: -20, type: 'polynomial', power: 2 },
    { id: "lambda3", name: "λ₃", mathDisplay: "\\lambda_3", value: 0, type: 'polynomial', power: 3 },
    { id: "lambdalog", name: "λ_log", mathDisplay: "\\lambda_{\\log}", value: 0, type: 'log' },
    { id: "lambdaind", name: "λ_ind", mathDisplay: "\\lambda_{\\mathbb{1}_{x>2/3}}", value: 0, type: 'indicator' },
    { id: "lambdasin", name: "λ_sin", mathDisplay: "\\lambda_{\\sin}", value: 0, type: 'sin' },
  ]);

  // Numerical integration helper
  const integrate = useCallback((f: (x: number) => number, start = 0.001, end = 0.999, steps = 1000) => {
    const dx = (end - start) / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) {
      const x1 = start + i * dx;
      const x2 = start + (i + 1) * dx;
      sum += (f(x1) + f(x2)) * dx / 2; // Trapezoidal rule
    }
    return sum;
  }, []);

  // Calculate the distribution and expectations
  const results = useMemo(() => {
    // p(x) ∝ exp(λ₁x + λ₂x² + ... + λ_log*log(x))
    const unnormalizedPdf = (x: number) => {
      let exponent = 0;
      lambdas.forEach(lambda => {
        if (lambda.type === 'polynomial' && lambda.power !== undefined) {
          exponent += lambda.value * Math.pow(x, lambda.power);
        } else if (lambda.type === 'log' && x > 0) {
          exponent += lambda.value * Math.log(x);
        } else if (lambda.type === 'indicator') {
          exponent += lambda.value * (x > 2/3 ? 1 : 0);
        } else if (lambda.type === 'sin') {
          exponent += lambda.value * Math.sin(20 * x);
        }
      });
      // Clip to prevent numerical overflow
      exponent = Math.max(-50, Math.min(50, exponent));
      return Math.exp(exponent);
    };

    // Calculate normalization constant
    const Z = integrate(unnormalizedPdf);
    
    // Lambda_0 is implicitly -log(Z) for normalization
    const lambda0 = -Math.log(Z);
    
    // Normalized PDF
    const pdf = (x: number) => unnormalizedPdf(x) / Z;

    // Generate points for visualization
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      if (x > 0 && x < 1) {
        points.push({ x, y: pdf(x) });
      }
    }

    // Calculate expectations
    const expectations: { label: string; value: number }[] = [];
    
    // E[X], E[X²], E[X³]
    for (let power = 1; power <= 3; power++) {
      const expectation = integrate(x => pdf(x) * Math.pow(x, power));
      expectations.push({ label: `E[X^${power}]`, value: expectation });
    }
    
    // E[log X]
    const expectationLogX = integrate(x => pdf(x) * Math.log(x));
    expectations.push({ label: `E[\\log X]`, value: expectationLogX });
    
    // E[1_{X>2/3}]
    const expectationIndicator = integrate(x => pdf(x) * (x > 2/3 ? 1 : 0));
    expectations.push({ label: `E[\\mathbb{1}_{X>2/3}]`, value: expectationIndicator });
    
    // E[sin(20X)]
    const expectationSin = integrate(x => pdf(x) * Math.sin(20 * x));
    expectations.push({ label: `E[\\sin(20X)]`, value: expectationSin });

    return { points, expectations, lambda0 };
  }, [lambdas, integrate]);

  const updateLambda = (id: string, value: number) => {
    setLambdas(prev => prev.map(l => 
      l.id === id ? { ...l, value } : l
    ));
  };

  const resetLambdas = () => {
    setLambdas([
      { id: "lambda1", name: "λ₁", mathDisplay: "\\lambda_1", value: 20, type: 'polynomial', power: 1 },
      { id: "lambda2", name: "λ₂", mathDisplay: "\\lambda_2", value: -20, type: 'polynomial', power: 2 },
      { id: "lambda3", name: "λ₃", mathDisplay: "\\lambda_3", value: 0, type: 'polynomial', power: 3 },
      { id: "lambdalog", name: "λ_log", mathDisplay: "\\lambda_{\\log}", value: 0, type: 'log' },
      { id: "lambdaind", name: "λ_ind", mathDisplay: "\\lambda_{\\mathbb{1}_{x>2/3}}", value: 0, type: 'indicator' },
      { id: "lambdasin", name: "λ_sin", mathDisplay: "\\lambda_{\\sin}", value: 0, type: 'sin' },
    ]);
  };

  // Find the maximum y-value for scaling
  const maxY = Math.max(...results.points.map(p => p.y), 0.1);

  // Format numbers for display in formula
  const formatNumber = (num: number) => {
    if (num === 0) return '';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}`;
  };

  // Build the formula string with actual values
  const formulaTerms = lambdas
    .map((l, idx) => {
      if (l.value === 0) return null;
      const absValue = Math.abs(l.value).toFixed(2);
      const sign = l.value >= 0 ? (idx === 0 || lambdas.slice(0, idx).every(prev => prev.value === 0) ? '' : '+') : '-';
      
      if (l.type === 'polynomial' && l.power !== undefined) {
        if (l.power === 1) {
          return `${sign}${absValue} x`;
        }
        return `${sign}${absValue} x^${l.power}`;
      } else if (l.type === 'log') {
        return `${sign}${absValue} \\log x`;
      } else if (l.type === 'indicator') {
        return `${sign}${absValue} \\cdot \\boldsymbol{\\mathbb{1}}_{x>2/3}`;
      } else if (l.type === 'sin') {
        return `${sign}${absValue} \\sin(20x)`;
      }
      return null;
    })
    .filter(Boolean);
  
  const formulaString = formulaTerms.join(' ');

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4 max-w-6xl mx-auto">
      {title && (
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">
            {title}
          </h3>
          <button
            onClick={resetLambdas}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Formula Display */}
      <div className="bg-blue-50 rounded-lg p-3 text-center">
        <div className="text-lg">
          <KatexMath math={`p(x) \\propto \\exp\\left(${formulaString || '0'}\\right)`} />
        </div>
      </div>

      {/* Lambda inputs */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {lambdas.map((lambda) => (
            <div key={lambda.id} className="flex items-center space-x-2 p-2 bg-white rounded-lg border">
              <div className="w-16">
                <KatexMath math={lambda.mathDisplay} />
              </div>
              <span className="text-gray-600 text-lg">=</span>
              <input
                type="number"
                step="0.5"
                value={lambda.value}
                onChange={(e) => updateLambda(lambda.id, parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-sm text-gray-500 w-40">
                <KatexMath math={
                  lambda.type === 'polynomial' && lambda.power ? `\\text{for } x^${lambda.power}` : 
                  lambda.type === 'log' ? '\\text{for } \\log x' :
                  lambda.type === 'indicator' ? '\\text{for } \\mathbb{1}_{x>2/3}' :
                  '\\text{for } \\sin(20x)'
                } />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Visualization */}
      <div className="space-y-2">
        {/* Distribution Plot */}
        <div className="bg-white p-4 rounded-lg border">
          <svg width="100%" height="280" viewBox="0 0 800 280" className="border">
            {/* Grid lines */}
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(x => (
              <g key={x}>
                <line x1={x * 740 + 40} y1={20} x2={x * 740 + 40} y2={240} 
                      stroke="#e5e7eb" strokeWidth="1" strokeDasharray={x % 0.2 === 0 ? "0" : "2,2"} />
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].includes(x) && (
                  <text x={x * 740 + 40} y={255} textAnchor="middle" className="text-sm fill-gray-600">
                    {x.toFixed(1)}
                  </text>
                )}
              </g>
            ))}
            
            
            {/* Distribution curve */}
            {results.points && (
              <>
                {/* Fill under curve */}
                <path
                  d={`M 40 240 ${results.points.map(p => 
                    `L ${p.x * 740 + 40} ${240 - (p.y / maxY) * 200}`
                  ).join(' ')} L 780 240 Z`}
                  fill="#3b82f6"
                  fillOpacity="0.2"
                />
                {/* Curve line */}
                <path
                  d={`M ${results.points.map(p => 
                    `${p.x * 740 + 40} ${240 - (p.y / maxY) * 200}`
                  ).join(' L ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
              </>
            )}
            
            {/* Axes */}
            <line x1="40" y1="240" x2="780" y2="240" stroke="#374151" strokeWidth="2" />
            <line x1="40" y1="20" x2="40" y2="240" stroke="#374151" strokeWidth="2" />
            
            {/* Labels */}
            <text x="400" y="273" textAnchor="middle" className="text-base fill-gray-700">x</text>
            <text x="20" y="15" textAnchor="middle" className="text-base fill-gray-700">p(x)</text>
          </svg>
        </div>
      </div>

      {/* Expectations Display */}
      <div className="bg-white rounded-lg p-3">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Computed Expectations</h4>
        
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {results.expectations.map((exp, idx) => (
            <div key={idx} className="bg-gray-50 p-2 rounded-lg">
              <div className="text-sm text-gray-600">
                <KatexMath math={exp.label} />
              </div>
              <div className="text-lg font-mono font-semibold text-gray-800">
                {exp.value.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DistributionConstraintBuilder;