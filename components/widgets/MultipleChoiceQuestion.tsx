"use client";

import React, { useState, ReactNode } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  question?: string | ReactNode;
  options: (string | ReactNode)[];
  correctIndices: number[]; // Now supports multiple correct answers
  explanation: string | ReactNode;
  feedbackType?: "correct-incorrect" | "all-show"; // Different feedback modes
};

const MultipleChoiceQuestion: React.FC<Props> = ({
  question,
  options,
  correctIndices,
  explanation,
  feedbackType = "correct-incorrect",
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleOptionClick = (index: number) => {
    if (showResults) return; // Prevent re-clicking after results are shown

    setSelectedIndex(index);
    setShowResults(true);
  };

  return (
    <div className="my-6 p-2 sm:p-4 bg-gray-50 rounded-lg border">
      {question && <div className="mb-4 text-lg font-medium text-gray-800">{question}</div>}

      <div className="space-y-3">
        {options.map((option, index) => {
          let buttonClass = "w-full p-2 sm:p-3 text-left rounded-lg border border-gray-300 transition-all duration-200 ";

          if (!showResults) {
            // Before selection - simple gray buttons
            buttonClass += "bg-gray-100 hover:bg-gray-200 cursor-pointer ";
          } else {
            // After selection - show results with simple green/red
            const isCorrect = correctIndices.includes(index);
            const wasSelected = index === selectedIndex;

            if (isCorrect) {
              // Any correct answer gets green
              buttonClass += "bg-green-200 text-green-900 ";
            } else if (wasSelected) {
              // Selected wrong answer gets red
              buttonClass += "bg-red-200 text-red-900 ";
            } else {
              // Everything else stays gray
              buttonClass += "bg-gray-100 text-gray-600 ";
            }
            buttonClass += "cursor-default ";
          }

          return (
            <button key={index} onClick={() => handleOptionClick(index)} className={buttonClass} disabled={showResults}>
              <div className="flex items-center">
                <span className="font-semibold mr-3">{index + 1}.</span>
                <span>{option}</span>
                {showResults &&
                  (() => {
                    const isCorrect = correctIndices.includes(index);
                    const wasSelected = index === selectedIndex;

                    if (isCorrect) {
                      return <span className="ml-auto font-bold">✓</span>;
                    } else if (wasSelected) {
                      return <span className="ml-auto font-bold">✗</span>;
                    }
                    return null;
                  })()}
              </div>
            </button>
          );
        })}
      </div>

      {showResults && (
        <div className="mt-4 space-y-3">
          <div className="p-2 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">Explanation:</div>
            <div className="text-blue-700">
              {typeof explanation === "string" ? <ReactMarkdown>{explanation}</ReactMarkdown> : explanation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleChoiceQuestion;
