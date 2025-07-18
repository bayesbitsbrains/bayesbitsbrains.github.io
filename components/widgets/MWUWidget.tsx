"use client";

import React, { useState, useEffect, useRef } from "react";

type Algorithm = 'mwu' | 'followLeader' | 'sampleProportional';

type Expert = {
  emoji: string;
  name: string;
  color: string;
};

type AlgorithmState = {
  gains: number[];
  weights: number[];
  totalGain: number;
};

type Props = {
  title?: string;
};

const MWUWidget: React.FC<Props> = ({
  title = "Multiplicative Weights Update in Action"
}) => {
  const experts: Expert[] = [
    { emoji: "🧑", name: "Expert 1", color: "#3b82f6" },
    { emoji: "👵🏿", name: "Expert 2", color: "#ef4444" },
    { emoji: "👶", name: "Expert 3", color: "#10b981" }
  ];

  const algorithms = [
    { id: 'mwu' as Algorithm, name: 'Multiplicative Weights', emoji: '⚖️', color: '#8b5cf6' },
    { id: 'followLeader' as Algorithm, name: 'Follow the Leader', emoji: '👑', color: '#f59e0b' },
    { id: 'sampleProportional' as Algorithm, name: 'Sample Proportionally', emoji: '🎲', color: '#06b6d4' }
  ];

  const scenarios = [
    {
      id: 1,
      name: "Steady Performers",
      description: "Experts consistently perform with probabilities 3/4, 1/2, 1/4",
      probabilities: [3/4, 1/2, 1/4]
    },
    {
      id: 2, 
      name: "Regime Change",
      description: "First 100 steps: 2/3, 1/3, 0. Last 100 steps: 0, 1, 1/3"
    },
    {
      id: 3,
      name: "Adversarial Alternating",
      description: "Alternating wins, but the expert Follow the Leader picks always loses"
    }
  ];

  const [selectedAlgorithms, setSelectedAlgorithms] = useState<Set<Algorithm>>(new Set(['mwu']));
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<number | null>(null);
  const [algorithmStates, setAlgorithmStates] = useState<Map<Algorithm, AlgorithmState>>(new Map());
  const [history, setHistory] = useState<Map<Algorithm, number[]>>(new Map());
  const [expertGains, setExpertGains] = useState<number[][]>([]);
  const [expertTotalGains, setExpertTotalGains] = useState<number[]>([0, 0, 0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [algorithmStateHistory, setAlgorithmStateHistory] = useState<Map<Algorithm, AlgorithmState[]>>(new Map());
  
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize algorithm states
  const initializeAlgorithms = () => {
    const states = new Map<Algorithm, AlgorithmState>();
    const hist = new Map<Algorithm, number[]>();
    const stateHist = new Map<Algorithm, AlgorithmState[]>();
    
    selectedAlgorithms.forEach(alg => {
      const initialState = {
        gains: [0, 0, 0],
        weights: [1/3, 1/3, 1/3],
        totalGain: 0
      };
      states.set(alg, initialState);
      hist.set(alg, [0]);
      stateHist.set(alg, [initialState]);
    });
    
    setAlgorithmStates(states);
    setHistory(hist);
    setAlgorithmStateHistory(stateHist);
    setExpertGains([]);
    setExpertTotalGains([0, 0, 0]);
  };

  // Get expert gains for a scenario and step
  const getExpertGains = (scenario: number, step: number): number[] => {
    switch (scenario) {
      case 1:
        // Steady performers: sample from probabilities
        return experts.map((_, i) => Math.random() < scenarios[0].probabilities![i] ? 1 : 0);
      
      case 2:
        // Regime change
        const probs = step < 100 ? [2/3, 1/3, 0] : [0, 1, 1/3];
        return experts.map((_, i) => Math.random() < probs[i] ? 1 : 0);
      
      case 3:
        // Adversarial scenario: Always make the expert that Follow-the-Leader would pick lose
        // FTL picks based on cumulative gains so far, but we need to simulate what it would pick
        
        // Calculate what FTL would pick based on current expert total gains
        const currentTotalGains = expertTotalGains.slice(); // Use the running totals
        const maxCurrentGain = Math.max(...currentTotalGains);
        let ftlChoice = currentTotalGains.indexOf(maxCurrentGain);
        
        // Tie-breaking: prefer lower index (same as FTL implementation)
        for (let i = 0; i < currentTotalGains.length; i++) {
          if (currentTotalGains[i] === maxCurrentGain) {
            ftlChoice = i;
            break;
          }
        }
        
        // Make the OTHER expert win (adversarial)
        if (ftlChoice === 0) {
          return [0, 1, 0]; // Expert 1 wins
        } else if (ftlChoice === 1) {
          return [1, 0, 0]; // Expert 0 wins
        } else {
          // If FTL somehow picks expert 2, make expert 0 win
          return [1, 0, 0];
        }
      
      default:
        return [0, 0, 0];
    }
  };

  // Update algorithm states based on expert gains
  const updateAlgorithms = (expertGains: number[]) => {
    const newStates = new Map<Algorithm, AlgorithmState>();
    const newHistory = new Map<Algorithm, number[]>();
    const newStateHistory = new Map<Algorithm, AlgorithmState[]>();

    selectedAlgorithms.forEach(alg => {
      const currentState = algorithmStates.get(alg)!;
      const currentHist = history.get(alg) || [0];
      const currentStateHist = algorithmStateHistory.get(alg) || [];
      
      let newWeights = [...currentState.weights];
      let algorithmGain = 0;

      switch (alg) {
        case 'mwu':
          // MWU: update weights multiplicatively
          newWeights = currentState.weights.map((w, i) => 
            w * Math.exp(0.1 * expertGains[i]) // learning rate = 0.1
          );
          // Normalize weights
          const sum = newWeights.reduce((a, b) => a + b, 0);
          newWeights = newWeights.map(w => w / sum);
          
          // Sample from current weights to get gain
          const rand = Math.random();
          let cumSum = 0;
          for (let i = 0; i < newWeights.length; i++) {
            cumSum += currentState.weights[i]; // Use weights from before update
            if (rand < cumSum) {
              algorithmGain = expertGains[i];
              break;
            }
          }
          break;

        case 'followLeader':
          // Follow the leader: choose expert with highest total gains so far
          // Breaks ties by preferring lower indices
          // Note: We use currentState.gains (before adding current expertGains)
          const totalGainsBeforeStep = currentState.gains;
          const maxGainBeforeStep = Math.max(...totalGainsBeforeStep);
          let bestExpert = totalGainsBeforeStep.indexOf(maxGainBeforeStep);
          
          // If there's a tie, prefer the lowest index
          for (let i = 0; i < totalGainsBeforeStep.length; i++) {
            if (totalGainsBeforeStep[i] === maxGainBeforeStep) {
              bestExpert = i;
              break;
            }
          }
          
          algorithmGain = expertGains[bestExpert];
          newWeights = [0, 0, 0];
          newWeights[bestExpert] = 1;
          break;

        case 'sampleProportional':
          // Sample proportionally to historical performance
          const totalGainsForSampling = currentState.gains.map(g => Math.max(g, 0.1)); // Avoid zero
          const totalSum = totalGainsForSampling.reduce((a, b) => a + b, 0);
          const probabilities = totalGainsForSampling.map(g => g / totalSum);
          
          const sampleRand = Math.random();
          let sampleCumSum = 0;
          for (let i = 0; i < probabilities.length; i++) {
            sampleCumSum += probabilities[i];
            if (sampleRand < sampleCumSum) {
              algorithmGain = expertGains[i];
              break;
            }
          }
          newWeights = probabilities;
          break;
      }

      const newState: AlgorithmState = {
        gains: currentState.gains.map((g, i) => g + expertGains[i]),
        weights: newWeights,
        totalGain: currentState.totalGain + algorithmGain
      };

      newStates.set(alg, newState);
      newHistory.set(alg, [...currentHist, newState.totalGain]);
      newStateHistory.set(alg, [...currentStateHist, newState]);
    });

    setAlgorithmStates(newStates);
    setHistory(newHistory);
    setAlgorithmStateHistory(newStateHistory);
  };

  // Run simulation step
  const runStep = () => {
    if (currentStep >= 200 || !currentScenario) {
      setIsRunning(false);
      if (currentStep >= 200) {
        setIsReplaying(true);
        setReplayStep(200);
      }
      return;
    }

    const gains = getExpertGains(currentScenario, currentStep);
    setExpertGains(prev => [...prev, gains]);
    updateAlgorithms(gains);
    setCurrentStep(prev => prev + 1);
    // Update expert total gains for scenario 3
    if (currentScenario === 3) {
      setExpertTotalGains(prev => prev.map((total, i) => total + gains[i]));
    }
  };

  // Start scenario
  const startScenario = (scenarioId: number) => {
    if (selectedAlgorithms.size === 0) return;
    
    setCurrentScenario(scenarioId);
    setCurrentStep(0);
    setIsRunning(true);
    setIsReplaying(false);
    setReplayStep(null);
    initializeAlgorithms();
  };

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      stepIntervalRef.current = setInterval(runStep, 50); // 50ms per step
    } else {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    }

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, [isRunning, currentStep, currentScenario, algorithmStates]);

  const toggleAlgorithm = (alg: Algorithm) => {
    setSelectedAlgorithms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alg)) {
        if (newSet.size > 1) { // Keep at least one selected
          newSet.delete(alg);
        }
      } else {
        newSet.add(alg);
      }
      return newSet;
    });
  };

  // Get the current display step (either replay or current)
  const displayStep = isReplaying && replayStep !== null ? replayStep : currentStep;
  
  // Get the displayed algorithm states based on replay step
  const getDisplayedAlgorithmStates = (): Map<Algorithm, AlgorithmState> => {
    if (isReplaying && replayStep !== null) {
      const replayStates = new Map<Algorithm, AlgorithmState>();
      selectedAlgorithms.forEach(alg => {
        const stateHist = algorithmStateHistory.get(alg);
        if (stateHist && replayStep < stateHist.length) {
          replayStates.set(alg, stateHist[replayStep]);
        }
      });
      return replayStates;
    }
    return algorithmStates;
  };
  
  const displayedAlgorithmStates = getDisplayedAlgorithmStates();
  
  const maxGain = Math.max(
    ...Array.from(history.values()).flat(),
    ...experts.map((_, i) => expertGains.reduce((sum, gains) => sum + gains[i], 0))
  );
  
  // Render chart content (shared between normal and fullscreen views)
  const renderChartContent = () => (
    <>
      {/* Grid lines */}
      {[0, 50, 100, 150, 200].map(x => (
        <line key={x} x1={x * 3.8 + 40} y1={20} x2={x * 3.8 + 40} y2={280} 
              stroke="#e5e7eb" strokeWidth="1" />
      ))}
      
      {/* Algorithm lines */}
      {Array.from(history.entries()).map(([alg, gains], algIdx) => {
        const algInfo = algorithms.find(a => a.id === alg)!;
        const displayedGains = gains.slice(0, displayStep + 1);
        return (
          <g key={alg}>
            <path
              d={displayedGains.map((gain, i) => 
                `${i === 0 ? 'M' : 'L'} ${i * 3.8 + 40} ${280 - (gain / Math.max(maxGain, 1)) * 240}`
              ).join(' ')}
              fill="none"
              stroke={algInfo.color}
              strokeWidth="3"
            />
            {/* Current position dot */}
            {displayedGains.length > 0 && (
              <circle
                cx={(displayedGains.length - 1) * 3.8 + 40}
                cy={280 - (displayedGains[displayedGains.length - 1] / Math.max(maxGain, 1)) * 240}
                r="4"
                fill={algInfo.color}
              />
            )}
            {/* Algorithm emoji at the end */}
            {displayedGains.length > 0 && (
              <text
                x={(displayedGains.length - 1) * 3.8 + 40 + 10}
                y={280 - (displayedGains[displayedGains.length - 1] / Math.max(maxGain, 1)) * 240 + 5 - (algIdx * 6)}
                fontSize="16"
                textAnchor="start"
              >
                {algInfo.emoji}
              </text>
            )}
          </g>
        );
      })}

      {/* Expert lines */}
      {experts.map((expert, expertIdx) => {
        const expertCumulativeGains = [];
        let cumSum = 0;
        expertCumulativeGains.push(cumSum);
        
        const maxSteps = Math.min(displayStep, expertGains.length);
        for (let i = 0; i < maxSteps; i++) {
          cumSum += expertGains[i][expertIdx] || 0;
          expertCumulativeGains.push(cumSum);
        }

        return (
          <g key={expertIdx}>
            <path
              d={expertCumulativeGains.map((gain, i) => 
                `${i === 0 ? 'M' : 'L'} ${i * 3.8 + 40} ${280 - (gain / Math.max(maxGain, 1)) * 240}`
              ).join(' ')}
              fill="none"
              stroke={expert.color}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {/* Expert emoji at the end */}
            {expertCumulativeGains.length > 0 && (
              <text
                x={(expertCumulativeGains.length - 1) * 3.8 + 40 - 10}
                y={280 - (expertCumulativeGains[expertCumulativeGains.length - 1] / Math.max(maxGain, 1)) * 240 + 5 + (expertIdx * 6)}
                fontSize="16"
                textAnchor="start"
              >
                {expert.emoji}
              </text>
            )}
          </g>
        );
      })}

      {/* Axes */}
      <line x1="40" y1="280" x2="810" y2="280" stroke="#374151" strokeWidth="2" />
      <line x1="40" y1="20" x2="40" y2="280" stroke="#374151" strokeWidth="2" />
      
      {/* Labels */}
      <text x="420" y="295" textAnchor="middle" className="text-sm fill-gray-700">Steps</text>
      <text x="25" y="15" textAnchor="middle" className="text-sm fill-gray-700">Gain</text>
    </>
  );

  return (
    <>
      {/* Fullscreen overlay */}
      {isZoomed && currentScenario && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-2xl font-semibold text-gray-800">
                Cumulative Gains (Step {displayStep}/200)
              </h4>
              <button
                onClick={() => setIsZoomed(false)}
                className="text-3xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <svg 
              width="100%" 
              height="600" 
              viewBox="0 0 850 300" 
              preserveAspectRatio="xMidYMid meet" 
              className="border"
            >
              {renderChartContent()}
            </svg>

            {/* Legend */}
            <div className="mt-6 text-lg">
              <div className="flex flex-wrap gap-6 mb-3">
                <div className="font-semibold">Algorithms:</div>
                {Array.from(selectedAlgorithms).map(alg => {
                  const algInfo = algorithms.find(a => a.id === alg)!;
                  return (
                    <div key={alg} className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-1.5" 
                        style={{ backgroundColor: algInfo.color }}
                      />
                      <span>{algInfo.emoji} {algInfo.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="font-semibold">Experts:</div>
                {experts.map((expert, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-1.5 border-dashed border-2" 
                      style={{ borderColor: expert.color }}
                    />
                    <span>{expert.emoji} {expert.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Replay Slider in Fullscreen */}
            {!isRunning && currentStep >= 200 && isReplaying && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-700">Replay:</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={replayStep || 200}
                    onChange={(e) => setReplayStep(parseInt(e.target.value))}
                    className="flex-1 h-2"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((replayStep || 200) / 200) * 100}%, #e5e7eb ${((replayStep || 200) / 200) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-lg font-mono text-gray-600 w-20 text-right">
                    {replayStep || 200}/200
                  </span>
                </div>
              </div>
            )}
            
            {/* Current Algorithm States in Fullscreen */}
            {currentScenario && displayedAlgorithmStates.size > 0 && (
              <div className="mt-6 bg-white rounded-lg p-4">
                <h4 className="text-xl font-semibold text-gray-800 mb-4">Current Algorithm States</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {Array.from(displayedAlgorithmStates.entries()).map(([alg, state]) => {
                    const algInfo = algorithms.find(a => a.id === alg)!;
                    return (
                      <div key={alg} className="border rounded-lg p-4">
                        <div className="text-lg font-semibold" style={{ color: algInfo.color }}>
                          {algInfo.emoji} {algInfo.name}
                        </div>
                        <div className="text-base text-gray-600 mt-2">
                          Total Gain: <span className="font-mono">{state.totalGain.toFixed(1)}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Weights: {state.weights.map(w => w.toFixed(2)).join(', ')}
                          {alg === 'followLeader' && state.weights.filter(w => w === 1).length === 1 && (
                            <span className="text-gray-400"> (ties→first)</span>
                          )}
                          {alg === 'mwu' && (
                            <span className="text-gray-400"> (ε=0.1)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-2 sm:p-6 bg-gray-50 rounded-lg space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        {title && (
          <h3 className="text-xl font-semibold text-center text-gray-800">
            {title}
          </h3>
        )}

      {/* Algorithm Selection */}
      <div className="bg-white rounded-lg p-2 sm:p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Select Algorithms</h4>
        <div className="flex flex-wrap gap-3">
          {algorithms.map(alg => (
            <label key={alg.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedAlgorithms.has(alg.id)}
                onChange={() => toggleAlgorithm(alg.id)}
                className="rounded"
              />
              <span style={{ color: alg.color, fontWeight: 'bold' }}>
                {alg.emoji} {alg.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Scenario Buttons */}
      <div className="bg-white rounded-lg p-2 sm:p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Choose Scenario</h4>
        <div className="grid md:grid-cols-3 gap-3">
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => startScenario(scenario.id)}
              disabled={isRunning || selectedAlgorithms.size === 0}
              className={`p-3 rounded-lg border text-left transition-colors ${
                currentScenario === scenario.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              } ${(isRunning || selectedAlgorithms.size === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="font-semibold">Scenario {scenario.id}</div>
              <div className="text-sm text-gray-600">{scenario.name}</div>
              <div className="text-xs text-gray-500 mt-1">{scenario.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {currentScenario && (
        <div className="bg-white rounded-lg p-2 sm:p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              Cumulative Gains (Step {displayStep}/200)
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Scenario {currentScenario}: {scenarios[currentScenario - 1].name}
              </div>
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {isZoomed ? '🗗 Exit Fullscreen' : '🔍 Zoom'}
              </button>
            </div>
          </div>
          
          <div 
            className={`relative overflow-hidden ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            <svg 
              width="100%" 
              height={isZoomed ? "600" : "300"} 
              viewBox="0 0 850 300" 
              preserveAspectRatio="xMidYMid meet" 
              className="border transition-all duration-300"
            >
              {renderChartContent()}
            </svg>
          </div>

          {/* Legend */}
          <div className={`mt-4 ${isZoomed ? 'text-lg' : ''}`}>
            <div className="flex flex-wrap gap-4 mb-2">
              <div className="text-sm text-gray-600">
                <strong>Algorithms:</strong>
              </div>
              {Array.from(selectedAlgorithms).map(alg => {
                const algInfo = algorithms.find(a => a.id === alg)!;
                return (
                  <div key={alg} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-1" 
                      style={{ backgroundColor: algInfo.color }}
                    />
                    <span className="text-sm">{algInfo.emoji} {algInfo.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="text-sm text-gray-600">
                <strong>Experts:</strong>
              </div>
              {experts.map((expert, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-1 border-dashed border-2" 
                    style={{ borderColor: expert.color }}
                  />
                  <span className="text-sm">{expert.emoji} {expert.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Replay Slider */}
          {!isRunning && currentStep >= 200 && isReplaying && (
            <div className="mt-6 bg-gray-50 rounded-lg p-2 sm:p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">Replay:</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={replayStep || 200}
                  onChange={(e) => setReplayStep(parseInt(e.target.value))}
                  className="flex-1"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((replayStep || 200) / 200) * 100}%, #e5e7eb ${((replayStep || 200) / 200) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <span className="text-sm font-mono text-gray-600 w-16 text-right">
                  {replayStep || 200}/200
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Status */}
      {currentScenario && displayedAlgorithmStates.size > 0 && (
        <div className="bg-white rounded-lg p-2 sm:p-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Current Algorithm States</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from(displayedAlgorithmStates.entries()).map(([alg, state]) => {
              const algInfo = algorithms.find(a => a.id === alg)!;
              return (
                <div key={alg} className="border rounded-lg p-1 sm:p-3">
                  <div className="font-semibold" style={{ color: algInfo.color }}>
                    {algInfo.emoji} {algInfo.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Total Gain: <span className="font-mono">{state.totalGain.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Weights: {state.weights.map(w => w.toFixed(2)).join(', ')}
                    {alg === 'followLeader' && state.weights.filter(w => w === 1).length === 1 && (
                      <span className="text-gray-400"> (ties→first)</span>
                    )}
                    {alg === 'mwu' && (
                      <span className="text-gray-400"> (ε=0.1)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default MWUWidget;