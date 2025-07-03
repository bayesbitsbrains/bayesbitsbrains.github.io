"use client";

import React, { useState, useMemo } from "react";

type Props = {
  title?: string;
  logSpace?: boolean;
  highlightSurprisals?: boolean;
};

type CoinFlip = "H" | "T";

const BayesSequenceWidget: React.FC<Props> = ({
  title = "Bayes Sequence Explorer",
  logSpace = false,
  highlightSurprisals = false,
}) => {
  const [sequence, setSequence] = useState<CoinFlip[]>(["H", "T", "T", "H", "T"]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("HTTHT");

  // Fixed parameters for the coin example
  const priorFair = logSpace ? 1 : 2; // log₂(2) : 2
  const priorBiased = logSpace ? 0 : 1; // log₂(1) : 1
  const probHeadsFair = logSpace ? -1 : 0.5; // log₂(0.5) : 0.5
  const probHeadsBiased = logSpace ? -2 : 0.25; // log₂(0.25) : 0.25
  const probTailsFair = logSpace ? -1 : 0.5; // log₂(0.5) : 0.5
  const probTailsBiased = logSpace ? Math.log2(0.75) : 0.75; // log₂(0.75) : 0.75

  const steps = useMemo(() => {
    const results = [];
    let oddsFair = priorFair;
    let oddsBiased = priorBiased;

    // Step 0: Prior
    if (logSpace) {
      results.push({
        step: 0,
        flip: null,
        likelihoodFair: null,
        likelihoodBiased: null,
        logOddsFair: oddsFair,
        logOddsBiased: oddsBiased,
        oddsFair: Math.pow(2, oddsFair),
        oddsBiased: Math.pow(2, oddsBiased),
        probFair: (Math.pow(2, oddsFair) / (Math.pow(2, oddsFair) + Math.pow(2, oddsBiased))) * 100,
        probBiased: (Math.pow(2, oddsBiased) / (Math.pow(2, oddsFair) + Math.pow(2, oddsBiased))) * 100,
      });
    } else {
      results.push({
        step: 0,
        flip: null,
        likelihoodFair: null,
        likelihoodBiased: null,
        oddsFair,
        oddsBiased,
        probFair: (oddsFair / (oddsFair + oddsBiased)) * 100,
        probBiased: (oddsBiased / (oddsFair + oddsBiased)) * 100,
      });
    }

    // Each flip
    for (let i = 0; i < sequence.length; i++) {
      const flip = sequence[i];
      const likelihoodFair = flip === "H" ? probHeadsFair : probTailsFair;
      const likelihoodBiased = flip === "H" ? probHeadsBiased : probTailsBiased;

      if (logSpace) {
        // In log space, multiplication becomes addition
        oddsFair += likelihoodFair;
        oddsBiased += likelihoodBiased;

        const regularOddsFair = Math.pow(2, oddsFair);
        const regularOddsBiased = Math.pow(2, oddsBiased);

        results.push({
          step: i + 1,
          flip,
          likelihoodFair,
          likelihoodBiased,
          logOddsFair: oddsFair,
          logOddsBiased: oddsBiased,
          oddsFair: regularOddsFair,
          oddsBiased: regularOddsBiased,
          probFair: (regularOddsFair / (regularOddsFair + regularOddsBiased)) * 100,
          probBiased: (regularOddsBiased / (regularOddsFair + regularOddsBiased)) * 100,
        });
      } else {
        oddsFair *= likelihoodFair;
        oddsBiased *= likelihoodBiased;

        results.push({
          step: i + 1,
          flip,
          likelihoodFair,
          likelihoodBiased,
          oddsFair,
          oddsBiased,
          probFair: (oddsFair / (oddsFair + oddsBiased)) * 100,
          probBiased: (oddsBiased / (oddsFair + oddsBiased)) * 100,
        });
      }
    }

    return results;
  }, [sequence, logSpace, probHeadsFair, probHeadsBiased, probTailsFair, probTailsBiased, priorFair, priorBiased]);

  const handleEdit = () => {
    if (isEditing) {
      // Parse the edit text
      const newSequence = editText
        .toUpperCase()
        .split("")
        .filter((c) => c === "H" || c === "T") as CoinFlip[];
      if (newSequence.length > 0) {
        setSequence(newSequence);
        setCurrentStep(0);
      }
    } else {
      setEditText(sequence.join(""));
    }
    setIsEditing(!isEditing);
  };

  const handleCoinClick = (index: number) => {
    if (isEditing) {
      // Toggle between H and T while editing the sequence
      const newSequence = [...sequence];
      newSequence[index] = newSequence[index] === "H" ? "T" : "H";
      setSequence(newSequence);
      setEditText(newSequence.join(""));
    } else {
      // Navigate to the chosen flip step when not editing
      setCurrentStep(index + 1); // +1 because step 0 is the prior
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg space-y-4 max-w-4xl mx-auto">
      {title && <h3 className="text-lg font-semibold text-center text-gray-800">{title}</h3>}

      <div className="bg-white rounded-lg p-6 space-y-4">
        {/* Sequence controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <span className="text-sm font-medium text-gray-700">Coin sequence:</span>

          {isEditing ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded font-mono text-center"
              placeholder="HTTHT"
            />
          ) : (
            <div className="flex space-x-1">
              {sequence.map((flip, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 flex items-center justify-center rounded border-2 font-mono font-bold cursor-pointer ${
                    index < currentStep
                      ? logSpace
                        ? "bg-purple-100 border-purple-300 text-purple-700"
                        : "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                  }`}
                  onClick={() => handleCoinClick(index)}
                >
                  {flip}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            {isEditing ? "Save" : "Edit"}
          </button>

          {/* Next Step button now placed to the right of Edit */}
          <button
            onClick={() => setCurrentStep(Math.min(currentStep + 1, sequence.length))}
            disabled={currentStep >= sequence.length || isEditing}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next Step
          </button>
        </div>

        {/* Prior and flip rows */}
        <div className="bg-white rounded-lg p-4 relative">
          {/* Prior row */}
          <div
            className={`relative flex items-center py-3 px-4 rounded border ${
              logSpace ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="w-24 text-sm font-medium text-gray-700">{logSpace ? "Prior log-odds" : "Prior odds"}</div>
            <div className="flex-1 flex items-center">
              <div className="flex-1 text-right">
                <span className="font-mono text-sm font-bold">{priorFair}</span>
              </div>
              <div className="w-8 flex justify-center">
                <span className="text-gray-500 font-bold">:</span>
              </div>
              <div className="flex-1 text-left">
                <span className="font-mono text-sm font-bold">{priorBiased}</span>
              </div>
            </div>
          </div>

          {/* Flip rows */}
          {steps.slice(1, currentStep + 1).map((step, index) => (
            <div key={index} className="relative">
              <div className="flex items-center py-3 px-4 rounded bg-gray-50 mt-2">
                <div className="w-24 flex justify-center">
                  <span className="font-mono font-bold text-lg">{step.flip}</span>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 text-right">
                    <span
                      className={`font-mono text-sm ${highlightSurprisals && logSpace ? "text-green-600 font-bold" : ""}`}
                    >
                      {step.likelihoodFair?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-8 flex justify-center relative">
                    <span className="text-gray-500 font-bold">:</span>
                    {/* Overlapping operator positioned perfectly between boxes */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-7 z-10">
                      <div className="bg-white border-2 border-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                        <span className="text-blue-600 text-lg font-bold">{logSpace ? "+" : "×"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <span
                      className={`font-mono text-sm ${highlightSurprisals && logSpace ? "text-orange-600 font-bold" : ""}`}
                    >
                      {step.likelihoodBiased?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Posterior section */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            {/* Cumulative Surprisals - only show when highlightSurprisals is true */}
            {highlightSurprisals && logSpace && currentStep > 0 && (
              <div className="flex items-center py-3 px-4 rounded bg-yellow-50 mb-2">
                <div className="w-24 text-sm font-medium text-gray-700">Total surprisal</div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 text-right">
                    <span className="font-mono text-sm font-bold text-green-600">
                      {(-(steps[currentStep]?.logOddsFair ?? 0) + 1).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-8 flex justify-center">
                    <span className="text-gray-500 font-bold">:</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-mono text-sm font-bold text-orange-600">
                      {(-(steps[currentStep]?.logOddsBiased ?? 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {logSpace && (
              <div className="flex items-center py-3 px-4 rounded bg-green-50 mb-2">
                <div className="w-24 text-sm font-medium text-gray-700">Posterior log odds</div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 text-right">
                    <span className="font-mono text-sm font-bold text-purple-600">
                      {steps[currentStep]?.logOddsFair?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-8 flex justify-center">
                    <span className="text-gray-500 font-bold">:</span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-mono text-sm font-bold text-purple-600">
                      {steps[currentStep]?.logOddsBiased?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Posterior odds */}
            <div className="flex items-center py-3 px-4 rounded bg-green-50 mb-2">
              <div className="w-24 text-sm font-medium text-gray-700">Posterior odds</div>
              <div className="flex-1 flex items-center">
                <div className="flex-1 text-right">
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {steps[currentStep]?.oddsFair.toFixed(3)}
                  </span>
                </div>
                <div className="w-8 flex justify-center">
                  <span className="text-gray-500 font-bold">:</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {steps[currentStep]?.oddsBiased.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* Probabilities */}
            <div className="flex items-center py-3 px-4 rounded bg-green-50">
              <div className="w-24 text-sm font-medium text-gray-700">Probability</div>
              <div className="flex-1 flex items-center">
                <div className="flex-1 text-right">
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {steps[currentStep]?.probFair.toFixed(1)}%
                  </span>
                </div>
                <div className="w-8 flex justify-center">
                  <span className="text-gray-500 font-bold">:</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {steps[currentStep]?.probBiased.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BayesSequenceWidget;
