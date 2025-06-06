"use client";

import React, { useState, useMemo } from "react";

type Props = {
  title?: string;
  showBrierScore?: boolean;
};

const ExpertRatingWidget: React.FC<Props> = ({
  title = "Expert Rating Widget",
  showBrierScore = false
}) => {
  // Initial data: 3 experts + ground truth, 5 questions
  const [predictions, setPredictions] = useState<number[][]>([
    [0.99, 0.99, 0.5, 0.5, 0.99], // 🧑
    [0.5, 0.9, 0.6, 0.6, 0.6],    // 👵🏿
    [0.5, 0.5, 0.5, 0.5, 0.5],    // 👶
  ]);
  
  const [groundTruth, setGroundTruth] = useState<number[]>([1, 1, 0, 1, 0]);

  const experts = [
    { emoji: "🧑", name: "Expert 1" },
    { emoji: "👵🏿", name: "Expert 2" }, 
    { emoji: "👶", name: "Expert 3" }
  ];

  // Calculate log scores (cross-entropy)
  const logScores = useMemo(() => {
    return predictions.map(expertPreds => {
      let totalScore = 0;
      let hasInfiniteScore = false;
      
      for (let i = 0; i < expertPreds.length; i++) {
        const p = expertPreds[i];
        const outcome = groundTruth[i];
        
        // Check for infinite cases
        if ((outcome === 1 && p === 0) || (outcome === 0 && p === 1)) {
          hasInfiniteScore = true;
          break;
        }
        
        // Normal log score calculation
        if (p > 0 && p < 1) {
          totalScore += outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p);
        }
      }
      
      if (hasInfiniteScore) {
        return Infinity;
      }
      
      return -totalScore / expertPreds.length; // Negative log likelihood, averaged
    });
  }, [predictions, groundTruth]);

  // Calculate Brier scores
  const brierScores = useMemo(() => {
    return predictions.map(expertPreds => {
      let totalScore = 0;
      for (let i = 0; i < expertPreds.length; i++) {
        const p = expertPreds[i];
        const outcome = groundTruth[i];
        totalScore += Math.pow(p - outcome, 2);
      }
      return totalScore / expertPreds.length;
    });
  }, [predictions, groundTruth]);

  const updatePrediction = (expertIdx: number, questionIdx: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const clampedValue = Math.max(0, Math.min(1, numValue));
    const newPredictions = [...predictions];
    newPredictions[expertIdx] = [...newPredictions[expertIdx]];
    newPredictions[expertIdx][questionIdx] = clampedValue;
    setPredictions(newPredictions);
  };

  const updateGroundTruth = (questionIdx: number, value: string) => {
    const numValue = parseInt(value);
    if (numValue !== 0 && numValue !== 1) return;
    
    const newGroundTruth = [...groundTruth];
    newGroundTruth[questionIdx] = numValue;
    setGroundTruth(newGroundTruth);
  };

  const addQuestion = () => {
    const newPredictions = predictions.map(expertPreds => [...expertPreds, 0.5]);
    setPredictions(newPredictions);
    setGroundTruth([...groundTruth, 1]);
  };

  const removeLastQuestion = () => {
    if (numQuestions > 1) {
      const newPredictions = predictions.map(expertPreds => expertPreds.slice(0, -1));
      setPredictions(newPredictions);
      setGroundTruth(groundTruth.slice(0, -1));
    }
  };

  const numQuestions = groundTruth.length;

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4 max-w-6xl mx-auto">
      {title && (
        <h3 className="text-lg font-semibold text-center text-gray-800">
          {title}
        </h3>
      )}

      <div className="overflow-x-auto">
        <table className={`border-collapse bg-white rounded-lg shadow ${numQuestions >= 7 ? '' : 'w-full'}`} style={numQuestions >= 7 ? { width: 'auto', minWidth: '100%' } : {}}>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-center font-semibold w-20">
                Expert
              </th>
              {Array.from({ length: numQuestions }, (_, i) => (
                <th key={i} className="border border-gray-300 p-2 text-center font-semibold" style={{ minWidth: '80px' }}>
                  Q{i + 1}
                </th>
              ))}
              <th className="border-l-4 border-blue-500 border-t border-r border-b border-gray-300 p-2 text-center font-semibold text-blue-700">
                Log Score<br/>(Cross-entropy)
              </th>
              {showBrierScore && (
                <th className="border border-gray-300 p-2 text-center font-semibold text-green-700">
                  Brier Score
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {experts.map((expert, expertIdx) => (
              <tr key={expertIdx} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 text-center font-semibold w-20">
                  <div className="text-2xl">{expert.emoji}</div>
                  <div className="text-xs text-gray-600">{expert.name}</div>
                </td>
                {Array.from({ length: numQuestions }, (_, questionIdx) => (
                  <td key={questionIdx} className="border border-gray-300 p-0" style={{ minWidth: '80px' }}>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={predictions[expertIdx][questionIdx].toFixed(2)}
                      onChange={(e) => updatePrediction(expertIdx, questionIdx, e.target.value)}
                      className="w-full h-full p-2 text-center border-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                ))}
                <td className="border-l-4 border-blue-500 border-t border-r border-b border-gray-300 p-2 text-center font-mono font-bold text-blue-700">
                  {logScores[expertIdx] === Infinity ? "∞" : logScores[expertIdx].toFixed(3)}
                </td>
                {showBrierScore && (
                  <td className="border border-gray-300 p-2 text-center font-mono font-bold text-green-700">
                    {brierScores[expertIdx].toFixed(3)}
                  </td>
                )}
              </tr>
            ))}
            
            {/* Ground Truth Row */}
            <tr className="bg-yellow-50 border-t-2 border-yellow-400">
              <td className="border border-gray-300 p-2 text-center font-semibold w-20">
                <div className="text-sm font-bold text-gray-700">Ground Truth</div>
              </td>
              {Array.from({ length: numQuestions }, (_, questionIdx) => (
                <td key={questionIdx} className="border border-gray-300 p-0" style={{ minWidth: '80px' }}>
                  <select
                    value={groundTruth[questionIdx]}
                    onChange={(e) => updateGroundTruth(questionIdx, e.target.value)}
                    className="w-full h-full p-2 text-center border-none text-sm bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                  </select>
                </td>
              ))}
              <td className="border-l-4 border-blue-500 border-t border-r border-b border-gray-300 p-2 text-center text-gray-500">
                —
              </td>
              {showBrierScore && (
                <td className="border border-gray-300 p-2 text-center text-gray-500">
                  —
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-center space-x-3">
        <button
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Question
        </button>
        <button
          onClick={removeLastQuestion}
          disabled={numQuestions <= 1}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Remove Last Question
        </button>
      </div>
    </div>
  );
};

export default ExpertRatingWidget;