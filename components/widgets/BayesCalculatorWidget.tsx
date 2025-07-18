"use client";

import React, { useState, useMemo } from "react";

// Define the labels for each hypothesis in both modes
const LABELS_2 = ["Fair", "Biased"];
const LABELS_3 = ["Fair", "Biased heads", "Biased tails"];

// Default prior odds and likelihood of heads for each mode
const DEFAULTS_2 = {
  priors: [2, 1],
  likelihoods: [0.5, 0.25],
};
const DEFAULTS_3 = {
  priors: [3, 2, 1],
  likelihoods: [0.5, 0.75, 0.25],
};

const BayesCalculatorWidget: React.FC<{ title?: string }> = ({ title = "Bayes Calculator" }) => {
  const [mode, setMode] = useState<2 | 3>(2);
  const [priors, setPriors] = useState<number[]>([...DEFAULTS_2.priors]);
  const [likelihoods, setLikelihoods] = useState<number[]>([...DEFAULTS_2.likelihoods]);

  // Helper to switch between 2- and 3-hypothesis modes
  const toggleMode = () => {
    if (mode === 2) {
      setMode(3);
      setPriors([...DEFAULTS_3.priors]);
      setLikelihoods([...DEFAULTS_3.likelihoods]);
    } else {
      setMode(2);
      setPriors([...DEFAULTS_2.priors]);
      setLikelihoods([...DEFAULTS_2.likelihoods]);
    }
  };

  // New helper: directly set desired mode and reset defaults
  const setModeWithDefaults = (m: 2 | 3) => {
    if (m === 2) {
      setMode(2);
      setPriors([...DEFAULTS_2.priors]);
      setLikelihoods([...DEFAULTS_2.likelihoods]);
    } else {
      setMode(3);
      setPriors([...DEFAULTS_3.priors]);
      setLikelihoods([...DEFAULTS_3.likelihoods]);
    }
  };

  // Update a single prior value
  const updatePrior = (idx: number, value: number) => {
    const next = [...priors];
    next[idx] = value;
    setPriors(next);
  };

  // Update a single likelihood value
  const updateLikelihood = (idx: number, value: number) => {
    const next = [...likelihoods];
    next[idx] = value;
    setLikelihoods(next);
  };

  const calculations = useMemo(() => {
    const posterior = priors.map((p, i) => p * likelihoods[i]);
    const total = posterior.reduce((acc, x) => acc + x, 0);
    const probabilities = posterior.map((p) => (total > 0 ? (p / total) * 100 : 0));
    return { posterior, probabilities };
  }, [priors, likelihoods]);

  const labels = mode === 2 ? LABELS_2 : LABELS_3;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 rounded-lg space-y-4 max-w-3xl mx-auto">
      {title && <h3 className="text-lg font-semibold text-center text-gray-800">{title}</h3>}

      <div className="bg-white rounded-lg p-4 sm:p-6 space-y-4 relative">
        {/* Prior odds input */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <span className="w-full sm:w-40 font-medium text-sm text-gray-700 sm:text-right">Prior odds:</span>
          <div className="w-full overflow-x-auto">
            <div className="flex flex-col py-2 px-3 rounded bg-blue-50">
            {/* Labels row */}
            <div className="flex items-center justify-center space-x-2 mb-1">
              {priors.map((val, idx) => (
                <div key={`label-${idx}`} className="w-20 text-center">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{labels[idx]}</span>
                </div>
              ))}
            </div>
            {/* Input fields row with colons */}
            <div className="flex items-center justify-center space-x-2">
              {priors.map((val, idx) => (
                <React.Fragment key={`prior-${idx}`}>
                  {idx !== 0 && <span className="text-gray-500 text-lg">:</span>}
                  <div className="relative">
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => updatePrior(idx, parseFloat(e.target.value) || 0)}
                      className="font-mono text-sm font-bold w-20 text-center border border-gray-300 rounded px-2 py-1"
                      step="0.1"
                      min="0"
                    />
                  </div>
                </React.Fragment>
              ))}
            </div>
            </div>
          </div>
        </div>

        {/* Likelihood input */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <span className="w-full sm:w-40 font-medium text-sm text-gray-700 sm:text-right">Likelihood of heads:</span>
          <div className="w-full overflow-visible relative">
            <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded bg-orange-50 overflow-visible relative">
            {likelihoods.map((val, idx) => (
              <React.Fragment key={`like-${idx}`}>
                {idx !== 0 && <span className="text-gray-500 text-lg">:</span>}
                <div className="flex flex-col items-center relative">
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => updateLikelihood(idx, parseFloat(e.target.value) || 0)}
                    className="font-mono text-sm font-bold w-20 text-center border border-gray-300 rounded px-2 py-1"
                    step="0.01"
                    min="0"
                    max="1"
                  />
                  {/* Multiplication symbol positioned between prior and likelihood rows - hidden on mobile */}
                  <div className="hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-8 z-50 pointer-events-none">
                    <div className="bg-white border-2 border-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-lg font-bold">×</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            </div>
          </div>
        </div>

        {/* Horizontal line */}
        <div className="border-t border-gray-300 sm:ml-40"></div>

        {/* Posterior results */}
        <div className="mt-4 space-y-3">
          {/* Posterior odds */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <span className="w-full sm:w-40 font-medium text-sm text-gray-700 sm:text-right">Posterior odds:</span>
            <div className="w-full overflow-x-auto">
              <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded bg-green-50">
              {calculations.posterior.map((val, idx) => (
                <React.Fragment key={`post-${idx}`}>
                  {idx !== 0 && <span className="text-gray-500 text-lg">:</span>}
                  <span className="font-mono text-sm font-bold text-blue-600 w-20 text-center">{val.toFixed(2)}</span>
                </React.Fragment>
              ))}
              </div>
            </div>
          </div>

          {/* Posterior probabilities */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <span className="w-full sm:w-40 font-medium text-sm text-gray-700 sm:text-right">Posterior probability:</span>
            <div className="w-full overflow-x-auto">
              <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded bg-green-50">
              {calculations.probabilities.map((val, idx) => (
                <React.Fragment key={`prob-${idx}`}>
                  {idx !== 0 && idx !== calculations.probabilities.length - 1 && <span className="text-gray-500 text-lg">:</span>}
                  <span className="font-mono text-sm font-bold text-blue-600 w-20 text-center">{val.toFixed(1)}%</span>
                </React.Fragment>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode selector styled like the Max Entropy widget */}
      <div className="flex justify-center mt-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
          <button
            onClick={() => setModeWithDefaults(2)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 2 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            2 hypotheses
          </button>
          <button
            onClick={() => setModeWithDefaults(3)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 3 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            3 hypotheses
          </button>
        </div>
      </div>
    </div>
  );
};

export default BayesCalculatorWidget;
