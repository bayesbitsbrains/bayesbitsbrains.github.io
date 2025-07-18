"use client";

import React, { useState, useEffect } from "react";
import KatexMath from "@/components/content/KatexMath";
import { getAssetPath } from "@/lib/utils";

interface LetterFrequency {
  [letter: string]: number;
}

export default function KLCalculatorWidget() {
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [result, setResult] = useState<{
    kl12: number;
    kl21: number;
    entropy1: number;
    entropy2: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(true);
  const [showDistributions, setShowDistributions] = useState(false);

  // Load default texts
  useEffect(() => {
    const loadDefaultTexts = async () => {
      try {
        const [anthemsEnResponse, anthemsResponse] = await Promise.all([
          fetch(getAssetPath("/compression_experiments/texts/anthems-en.txt")),
          fetch(getAssetPath("/compression_experiments/texts/anthems.txt")),
        ]);

        if (anthemsEnResponse.ok && anthemsResponse.ok) {
          const anthemsEnText = await anthemsEnResponse.text();
          const anthemsText = await anthemsResponse.text();

          setText1(anthemsEnText.trim());
          setText2(anthemsText.trim());
        }
      } catch (error) {
        console.error("Failed to load default texts:", error);
        // Set fallback texts
        setText1(
          "O say can you see, by the dawn's early light, What so proudly we hailed at the twilight's last gleaming...",
        );
        setText2("Allons, enfants de la Patrie, Le jour de gloire est arrive...");
      } finally {
        setLoadingTexts(false);
      }
    };

    loadDefaultTexts();
  }, []);

  const calculateLetterFrequencies = (text: string): LetterFrequency => {
    const frequencies: LetterFrequency = {};
    const normalizedText = text.toLowerCase().replace(/[^a-z]/g, "");

    if (normalizedText.length === 0) return {};

    for (const char of normalizedText) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    // Normalize to probabilities
    const total = normalizedText.length;
    for (const char in frequencies) {
      frequencies[char] = frequencies[char] / total;
    }

    return frequencies;
  };

  const calculateKLDivergence = (p: LetterFrequency, q: LetterFrequency): number => {
    let kl = 0;
    const allLetters = new Set([...Object.keys(p), ...Object.keys(q)]);

    for (const letter of allLetters) {
      const pProb = p[letter] || 0;
      const qProb = q[letter] || 0; // No smoothing - allow true infinity

      if (pProb > 0) {
        if (qProb === 0) {
          return Infinity; // KL divergence is infinite when q(x) = 0 but p(x) > 0
        }
        kl += pProb * Math.log2(pProb / qProb);
      }
    }

    return kl;
  };

  const calculateEntropy = (p: LetterFrequency): number => {
    let entropy = 0;
    for (const letter in p) {
      const prob = p[letter];
      if (prob > 0) {
        entropy += prob * Math.log2(1 / prob);
      }
    }
    return entropy;
  };

  const findInfiniteReason = (p: LetterFrequency, q: LetterFrequency, pName: string, qName: string): string | null => {
    const missingLetters = [];
    for (const letter in p) {
      if (p[letter] > 0 && (!q[letter] || q[letter] === 0)) {
        missingLetters.push(letter);
      }
    }
    if (missingLetters.length > 0) {
      const letterList = missingLetters.map((l) => `'${l}'`).join(", ");
      return `because ${pName} contains ${letterList} but ${qName} misses ${missingLetters.length === 1 ? "it" : "them"} entirely`;
    }
    return null;
  };

  const handleCalculate = () => {
    if (!text1.trim() || !text2.trim()) return;

    setLoading(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const freq1 = calculateLetterFrequencies(text1);
      const freq2 = calculateLetterFrequencies(text2);

      if (Object.keys(freq1).length === 0 || Object.keys(freq2).length === 0) {
        setResult(null);
        setLoading(false);
        return;
      }

      const kl12 = calculateKLDivergence(freq1, freq2);
      const kl21 = calculateKLDivergence(freq2, freq1);
      const entropy1 = calculateEntropy(freq1);
      const entropy2 = calculateEntropy(freq2);

      setResult({ kl12, kl21, entropy1, entropy2 });
      setLoading(false);
    }, 100);
  };

  if (loadingTexts) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-600">Loading default texts...</div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-6 bg-gray-50 rounded-lg space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-center text-gray-800">KL & Entropy Calculator</h3>

      <div className="text-sm text-gray-600 text-center">
        Computes KL and entropy for the letter frequency distributions (case insensitive, English letters only)
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Text 1 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Text 1 (distribution p<sub>1</sub>)</label>
          <textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded-md resize-none text-sm font-mono"
            placeholder="Enter first text..."
          />
          <div className="text-xs text-gray-500">
            Characters: {text1.length} | Letters: {text1.toLowerCase().replace(/[^a-z]/g, "").length}
          </div>
        </div>

        {/* Text 2 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Text 2 (distribution p<sub>2</sub>)</label>
          <textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded-md resize-none text-sm font-mono"
            placeholder="Enter second text..."
          />
          <div className="text-xs text-gray-500">
            Characters: {text2.length} | Letters: {text2.toLowerCase().replace(/[^a-z]/g, "").length}
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="text-center">
        <button
          onClick={handleCalculate}
          disabled={loading || !text1.trim() || !text2.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Computing..." : "Compute KL & entropies"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg p-2 sm:p-4 space-y-4">
          <h4 className="text-lg font-semibold text-gray-800">Results</h4>

          <div className="space-y-4">
            {/* KL Divergences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-2 sm:p-3 rounded-lg border" style={{backgroundColor: '#f3f1ff', borderColor: '#e4daff'}}>
                <div className="text-sm font-medium mb-1" style={{color: '#7c3aed'}}>
                  <KatexMath math="D(p_1, p_2)" />
                </div>
                <div className="text-lg font-bold" style={{color: '#5b21b6'}}>
                  {isFinite(result.kl12) ? `${result.kl12.toFixed(4)} bits` : "infinite"}
                </div>
                <div className="text-xs" style={{color: '#7c3aed'}}>
                  KL divergence from Text 1 to Text 2
                  {!isFinite(result.kl12) &&
                    (() => {
                      const freq1 = calculateLetterFrequencies(text1);
                      const freq2 = calculateLetterFrequencies(text2);
                      const reason = findInfiniteReason(freq1, freq2, "p₁", "p₂");
                      return reason ? <div className="mt-1 italic">{reason}</div> : null;
                    })()}
                </div>
              </div>

              <div className="p-2 sm:p-3 rounded-lg border" style={{backgroundColor: '#f3f1ff', borderColor: '#e4daff'}}>
                <div className="text-sm font-medium mb-1" style={{color: '#7c3aed'}}>
                  <KatexMath math="D(p_2, p_1)" />
                </div>
                <div className="text-lg font-bold" style={{color: '#5b21b6'}}>
                  {isFinite(result.kl21) ? `${result.kl21.toFixed(4)} bits` : "infinite"}
                </div>
                <div className="text-xs" style={{color: '#7c3aed'}}>
                  KL divergence from Text 2 to Text 1
                  {!isFinite(result.kl21) &&
                    (() => {
                      const freq1 = calculateLetterFrequencies(text1);
                      const freq2 = calculateLetterFrequencies(text2);
                      const reason = findInfiniteReason(freq2, freq1, "p₂", "p₁");
                      return reason ? <div className="mt-1 italic">{reason}</div> : null;
                    })()}
                </div>
              </div>
            </div>

            {/* Entropies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-2 sm:p-3 rounded-lg border" style={{backgroundColor: '#f0f9ff', borderColor: '#e0f2fe'}}>
                <div className="text-sm font-medium mb-1" style={{color: '#0369a1'}}>
                  <KatexMath math="H(p_1)" />
                </div>
                <div className="text-lg font-bold" style={{color: '#1e40af'}}>{result.entropy1.toFixed(4)} bits</div>
                <div className="text-xs" style={{color: '#0369a1'}}>Entropy of Text 1</div>
              </div>

              <div className="p-2 sm:p-3 rounded-lg border" style={{backgroundColor: '#f0f9ff', borderColor: '#e0f2fe'}}>
                <div className="text-sm font-medium mb-1" style={{color: '#0369a1'}}>
                  <KatexMath math="H(p_2)" />
                </div>
                <div className="text-lg font-bold" style={{color: '#1e40af'}}>{result.entropy2.toFixed(4)} bits</div>
                <div className="text-xs" style={{color: '#0369a1'}}>Entropy of Text 2</div>
              </div>
            </div>
          </div>

          {/* Debug: Show Letter Frequency Distributions */}
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={() => setShowDistributions(!showDistributions)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              📊 Letter Frequency Distributions
            </button>

            {showDistributions && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
                  <div>
                    <div className="font-medium text-gray-700 mb-2">Text 1 Distribution (p<sub>1</sub>)</div>
                    <div className="bg-white p-1 sm:p-2 rounded border max-h-32 overflow-y-auto">
                      <div className="font-mono space-y-1">
                        {(() => {
                          const freq1 = calculateLetterFrequencies(text1);
                          return Object.entries(freq1)
                            .sort(([, a], [, b]) => b - a)
                            .map(([letter, prob]) => (
                              <div key={letter} className="flex justify-between">
                                <span>{letter}:</span>
                                <span>{prob.toFixed(4)}</span>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-700 mb-2">Text 2 Distribution (p<sub>2</sub>)</div>
                    <div className="bg-white p-1 sm:p-2 rounded border max-h-32 overflow-y-auto">
                      <div className="font-mono space-y-1">
                        {(() => {
                          const freq2 = calculateLetterFrequencies(text2);
                          return Object.entries(freq2)
                            .sort(([, a], [, b]) => b - a)
                            .map(([letter, prob]) => (
                              <div key={letter} className="flex justify-between">
                                <span>{letter}:</span>
                                <span>{prob.toFixed(4)}</span>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Explanation */}
          <div className="p-2 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="text-base font-semibold text-gray-800 mb-3">Understanding the Results</h5>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                First, we can see that the mixed file has larger entropy. This makes sense! Every language uses
                different letters with different frequencies. For example, <KatexMath math="\mathsf{z}" /> is quite uncommon in English,
                but pretty common in German. If we pool different languages together, the distribution of frequencies is
                becoming &lsquo;smoother&rsquo;, more uniform. Hence, larger entropy. Admittedly, it&rsquo;s only
                slightly larger, since increasing the probability of <KatexMath math="\mathsf{z}" /> from 0.0003 to 0.02 is not really
                increasing the entropy that much.
              </p>
              <p>
                For similar reasons, KL between <KatexMath math="p_1" /> and <KatexMath math="p_2" /> is smaller than vice versa. Remember, KL is all about
                probability <em>ratios</em>, not differences. Since <KatexMath math="p_1" />(<KatexMath math="\mathsf{e}" />) = 0.12 and <KatexMath math="p_2" />(<KatexMath math="\mathsf{e}" />) = 0.11, <KatexMath math="p_2" /> is a good
                model of <KatexMath math="p_1" />. However, since <KatexMath math="p_2" />(<KatexMath math="\mathsf{z}" />) = 0.02 and <KatexMath math="p_1" />(<KatexMath math="\mathsf{z}" />)=0.0003, <KatexMath math="p_1" /> is a crappy model of <KatexMath math="p_2" />.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
