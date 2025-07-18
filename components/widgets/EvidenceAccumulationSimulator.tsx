"use client";
import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { InlineMath, BlockMath } from "react-katex";
import { CHART_CONFIG, BUTTON_STYLES, INPUT_STYLES } from "./SimulatorConfig";
import ZoomButton from "./ZoomButton";

interface EvidenceAccumulationSimulatorProps {
  only_kl_mode?: boolean;
}

interface SimulationDataPoint {
  flip: number;
  evidence: number;
  klExpected: number;
  logP: number;
  logQ: number;
  entropyP: number;
  crossentropyPQ: number;
}

const EvidenceAccumulationSimulator: React.FC<EvidenceAccumulationSimulatorProps> = ({ only_kl_mode = false }) => {
  // Parameters for the simulation
  const [trueHeadsProb, setTrueHeadsProb] = useState(0.25);
  const [modelHeadsProb, setModelHeadsProb] = useState(0.5);
  const [numFlips, setNumFlips] = useState(CHART_CONFIG.controls.defaultNumFlips);
  const [currentFlip, setCurrentFlip] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationDataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(CHART_CONFIG.controls.defaultSpeed);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mode, setMode] = useState<'kl' | 'crossentropy'>('kl');

  // Force mode to 'kl' when only_kl_mode is true
  useEffect(() => {
    if (only_kl_mode && mode !== 'kl') {
      setMode('kl');
    }
  }, [only_kl_mode, mode]);

  // Calculate KL divergence between true and model distributions
  const calculateKL = (): number => {
    const p: [number, number] = [trueHeadsProb, 1 - trueHeadsProb];
    const q: [number, number] = [modelHeadsProb, 1 - modelHeadsProb];

    // Avoid division by zero or log of zero
    if (q[0] === 0 || q[1] === 0) {
      return Infinity;
    }

    const klHeads = p[0] * Math.log2(p[0] / q[0]);
    const klTails = p[1] * Math.log2(p[1] / q[1]);

    return klHeads + klTails;
  };

  const klDivergence: number = calculateKL();
  
  // Calculate Y-axis domain based on expected evidence range
  const yAxisDomain = useMemo(() => {
    return [-2, 'dataMax'] as [number, string];
  }, []);

  // Memoize entropy calculation
  const entropy = useMemo(() => {
    const p = trueHeadsProb;
    const entropyHeads = p > 0 ? p * Math.log2(1/p) : 0;
    const entropyTails = (1-p) > 0 ? (1-p) * Math.log2(1/(1-p)) : 0;
    return entropyHeads + entropyTails;
  }, [trueHeadsProb]);

  // Memoize crossentropy calculation
  const crossentropy = useMemo(() => {
    const p = trueHeadsProb;
    const q = modelHeadsProb;
    const crossentropyHeads = p > 0 && q > 0 ? p * Math.log2(1/q) : 0;
    const crossentropyTails = (1-p) > 0 && (1-q) > 0 ? (1-p) * Math.log2(1/(1-q)) : 0;
    return crossentropyHeads + crossentropyTails;
  }, [trueHeadsProb, modelHeadsProb]);

  // Create theoretical line data
  const theoreticalData = useMemo(() => {
    const data = [];
    for (let i = 0; i <= numFlips; i += Math.max(1, Math.floor(numFlips / 50))) {
      data.push({
        flip: i,
        evidence: 0,
        klExpected: i * klDivergence,
        logP: 0,
        logQ: 0,
        entropyP: i * entropy,
        crossentropyPQ: i * crossentropy,
      });
    }
    return data;
  }, [numFlips, klDivergence, entropy, crossentropy]);

  // Reset the simulation
  const resetSimulation = (): void => {
    setCurrentFlip(0);
    const initialData: SimulationDataPoint = {
      flip: 0,
      evidence: 0,
      klExpected: 0,
      logP: 0,
      logQ: 0,
      entropyP: 0,
      crossentropyPQ: 0,
    };
    
    setSimulationData([initialData]);
    setIsRunning(false);
  };

  // Start/pause the simulation
  const toggleSimulation = () => {
    if (currentFlip >= numFlips) {
      resetSimulation();
    }
    setIsRunning(!isRunning);
  };

  // Effect to run the simulation
  useEffect(() => {
    if (!isRunning || currentFlip >= numFlips) return;

    const timer = setTimeout(() => {
      // Simulate a coin flip based on the true probability
      const isHeads = Math.random() < trueHeadsProb;

      // Calculate evidence from this flip (log likelihood ratio)
      const evidenceFromFlip = isHeads
        ? Math.log2(trueHeadsProb / modelHeadsProb)
        : Math.log2((1 - trueHeadsProb) / (1 - modelHeadsProb));

      // Calculate surprisal from this flip
      const logPFromFlip = isHeads ? Math.log2(1/trueHeadsProb) : Math.log2(1/(1-trueHeadsProb));
      const logQFromFlip = isHeads ? Math.log2(1/modelHeadsProb) : Math.log2(1/(1-modelHeadsProb));

      // Update the data with the new evidence
      setSimulationData((prevData) => {
        const lastData = prevData[prevData.length - 1];
        const nextFlip = currentFlip + 1;

        const newDataPoint: SimulationDataPoint = {
          flip: nextFlip,
          evidence: lastData.evidence + evidenceFromFlip,
          klExpected: nextFlip * klDivergence,
          logP: lastData.logP + logPFromFlip,
          logQ: lastData.logQ + logQFromFlip,
          entropyP: nextFlip * entropy,
          crossentropyPQ: nextFlip * crossentropy,
        };

        return [...prevData, newDataPoint];
      });

      setCurrentFlip((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isRunning, currentFlip, trueHeadsProb, modelHeadsProb, speed, numFlips, klDivergence, entropy, crossentropy, mode]);

  // Initialize data on first render or when parameters change
  useEffect(() => {
    const wasRunning = isRunning;
    resetSimulation();
    // Auto-restart if it was running before parameter change
    if (wasRunning) {
      setIsRunning(true);
    }
  }, [trueHeadsProb, modelHeadsProb, mode, numFlips, klDivergence, entropy, crossentropy]);

  const formatProbability = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Combine simulation data with theoretical lines
  const chartData = useMemo(() => {
    // If simulation hasn't started, show only theoretical lines
    if (currentFlip === 0 && !isRunning) {
      return theoreticalData;
    }
    // Otherwise, show only the actual simulation data (which already includes theoretical values)
    return simulationData;
  }, [simulationData, theoreticalData, currentFlip, isRunning]);

  return (
    <div className="mb-6 p-2 sm:p-4 bg-gray-50 rounded-lg">
      <h4 className="text-center">Evidence Accumulation Simulator</h4>

      <div className="">
        {/*<p className="">
          This simulator demonstrates how evidence accumulates when comparing two competing hypotheses about a coin. The
          blue line shows the actual accumulated evidence (in bits) favoring the true model, while the dashed red line
          shows the expected accumulation based on KL divergence.
        </p>*/}

        <div className="">
          {/*<div className="font-semibold mb-2">Model Parameters</div>*/}
          <div className="space-y-4">
            {/* Mode toggle - only show if not restricted to KL mode */}
            {!only_kl_mode && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                  <button
                    onClick={() => {
                      setMode('kl');
                      if (isRunning) {
                        setIsRunning(false);
                        resetSimulation();
                      }
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      mode === 'kl' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    KL Mode
                  </button>
                  <button
                    onClick={() => {
                      setMode('crossentropy');
                      if (isRunning) {
                        setIsRunning(false);
                        resetSimulation();
                      }
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      mode === 'crossentropy' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Crossentropy Mode
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  True Heads Probability: {formatProbability(trueHeadsProb)}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={trueHeadsProb}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setTrueHeadsProb(parseFloat(e.target.value));
                    if (isRunning) {
                      setIsRunning(false);
                      resetSimulation();
                    }
                  }}
                  className={`${INPUT_STYLES.base} ${INPUT_STYLES.rangeColors.trueP}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Heads Probability: {formatProbability(modelHeadsProb)}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={modelHeadsProb}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setModelHeadsProb(parseFloat(e.target.value));
                    if (isRunning) {
                      setIsRunning(false);
                      resetSimulation();
                    }
                  }}
                  className={`${INPUT_STYLES.base} ${INPUT_STYLES.rangeColors.modelQ}`}
                />
              </div>
            </div>
          </div>

          {/* <p className="font-medium mb-1">Current Distributions:</p> */}
          {/*          <div className="mb-2">
            <span className="font-medium">
              True distribution (<InlineMath math="p" />
              ):
            </span>{" "}
            [Heads: {trueHeadsProb.toFixed(2)}, Tails: {(1 - trueHeadsProb).toFixed(2)}]
          </div>
          <div className="mb-2">
            <span className="font-medium">
              Model distribution (<InlineMath math="q" />
              ):
            </span>{" "}
            [Heads: {modelHeadsProb.toFixed(2)}, Tails: {(1 - modelHeadsProb).toFixed(2)}]
          </div>*/}
          <div>
            {/* <span className="font-medium">KL Divergence:</span> */}
            <div className="">
              <BlockMath
                math={`\\begin{align*}
                  D(p, q) &= ${trueHeadsProb.toFixed(2)}\\log_2\\left(\\frac{${trueHeadsProb.toFixed(
                    2,
                  )}}{${modelHeadsProb.toFixed(2)}}\\right) + ${(1 - trueHeadsProb).toFixed(2)}\\log_2\\left(\\frac{${(
                    1 - trueHeadsProb
                  ).toFixed(2)}}{${(1 - modelHeadsProb).toFixed(2)}}\\right) \\\\
                  &= ${klDivergence.toFixed(4)}\\text{ bits per flip}
                \\end{align*}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div>
          {/*<div className="font-semibold mb-2">Simulation Controls</div>*/}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Flips: {numFlips}</label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={numFlips}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNumFlips(parseInt(e.target.value));
                    if (isRunning) {
                      setIsRunning(false);
                      resetSimulation();
                    }
                  }}
                  className={`${INPUT_STYLES.base} ${INPUT_STYLES.rangeColors.flips}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simulation Speed (faster ←→ slower)
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={speed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeed(parseInt(e.target.value))}
                  className={`${INPUT_STYLES.base} ${INPUT_STYLES.rangeColors.speed}`}
                />
              </div>
            </div>

            <div className="flex justify-start items-center">
              <button
                onClick={toggleSimulation}
                className={`${BUTTON_STYLES.base} ${
                  isRunning ? BUTTON_STYLES.primary.running : BUTTON_STYLES.primary.stopped
                }`}
              >
                {isRunning ? "Pause" : currentFlip >= numFlips ? "Reset & Start" : "Start"}
              </button>

              <button
                onClick={resetSimulation}
                className={`${BUTTON_STYLES.base} ${BUTTON_STYLES.secondary} ml-4`}
                disabled={!currentFlip}
              >
                Reset
              </button>

              {/*<div className="flex items-center ml-4">
                <input
                  type="checkbox"
                  id="showKL"
                  checked={showKLLine}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowKLLine(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showKL" className="ml-2 text-sm text-gray-700">
                  Show Expected (KL)
                </label>
              </div>*/}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-1 sm:p-4 rounded-lg mb-6">
        <div className={isZoomed ? 'fixed inset-0 z-50 bg-white p-8' : 'relative'}>
          <div className={`${isZoomed ? 'h-full' : 'h-64'} transition-all duration-300`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                {isZoomed && (
                  <>
                    <button
                      onClick={toggleSimulation}
                      className={`px-3 py-1 text-xs rounded font-medium ${
                        isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-500 hover:bg-blue-600"
                      } text-white`}
                    >
                      {isRunning ? "Pause" : currentFlip >= numFlips ? "Reset & Start" : "Start"}
                    </button>
                    <button
                      onClick={resetSimulation}
                      className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded"
                      disabled={!currentFlip}
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
              <ZoomButton 
                type="zoom-toggle"
                isZoomed={isZoomed}
                onClick={() => setIsZoomed(!isZoomed)}
                className="z-50"
              />
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={typeof window !== 'undefined' && window.innerWidth < 640 
                  ? { ...CHART_CONFIG.margins.mobile, left: 30 }
                  : { ...CHART_CONFIG.margins.desktop, left: 35 }
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="flip"
                  label={{ value: "Number of Coin Flips", position: "insideBottom", offset: -10 }}
                  domain={[0, isRunning || currentFlip > 0 ? 'dataMax' : numFlips]}
                  type="number"
                />
                <YAxis 
                  label={{ value: mode === 'kl' ? "Evidence (bits)" : "Surprisal (bits)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle' } }} 
                  tickFormatter={(value) => Math.round(value).toString()}
                  domain={yAxisDomain}
                />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(2)} bits`}
                />
                <Legend />
                
                {/* Main violet line - only in KL mode */}
                {mode === 'kl' && (isRunning || currentFlip > 0) && (
                  <Line
                    type="monotone"
                    dataKey="evidence"
                    name="Accumulated Evidence"
                    stroke={CHART_CONFIG.colors.evidence}
                    strokeWidth={2}
                    activeDot={{ r: 6, fill: CHART_CONFIG.colors.evidence }}
                    isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                  />
                )}
                
                {/* Red dashed line - KL expected rate (only in KL mode) */}
                {mode === 'kl' && (
                  <Line
                    type="monotone"
                    dataKey="klExpected"
                    name="Expected rate (KL divergence)"
                    stroke={CHART_CONFIG.colors.klExpected}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 6, fill: CHART_CONFIG.colors.klDivergenceFull }}
                    isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                  />
                )}
                
                {/* Lines for crossentropy mode */}
                {mode === 'crossentropy' && (
                  <>
                    {/* Actual accumulated surprisal lines */}
                    {(isRunning || currentFlip > 0) && (
                      <Line
                        type="monotone"
                        dataKey="logQ"
                        name="Accumulated Surprisal (Model Q)"
                        stroke={CHART_CONFIG.colors.modelQ}
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: CHART_CONFIG.colors.modelQ }}
                        isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                      />
                    )}
                    {(isRunning || currentFlip > 0) && (
                      <Line
                        type="monotone"
                        dataKey="logP"
                        name="Accumulated Surprisal (True P)"
                        stroke={CHART_CONFIG.colors.trueP}
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: CHART_CONFIG.colors.trueP }}
                        isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                      />
                    )}
                    {/* Theoretical rates (dashed lines) */}
                    <Line
                      type="monotone"
                      dataKey="crossentropyPQ"
                      name="Cross-entropy Rate"
                      stroke={CHART_CONFIG.colors.klExpected}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 6, fill: CHART_CONFIG.colors.crossentropyRateFull }}
                      isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                    />
                    <Line
                      type="monotone"
                      dataKey="entropyP"
                      name="Entropy Rate"
                      stroke={CHART_CONFIG.colors.entropy}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={{ r: 6, fill: CHART_CONFIG.colors.entropyFull }}
                      isAnimationActive={CHART_CONFIG.animation.isAnimationActive}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EvidenceAccumulationSimulator;
