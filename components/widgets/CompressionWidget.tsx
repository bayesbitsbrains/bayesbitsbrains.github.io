"use client";

import React, { useState, useEffect } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import MiniCompressionChart from "./MiniCompressionChart";
import KatexMath from "@/components/content/KatexMath";
import { getAssetPath } from "@/lib/utils";

interface CompressionResult {
  algorithm: string;
  bits: number;
  ratio: string;
  generalDescription: string;
  specificDescription: string;
  compressionProgression?: Array<{progressPercent: number; bitsPerChar: number}>;
}

interface TextSample {
  name: string;
  description: string;
  text: string;
  filename: string;
  results: CompressionResult[];
}

export default function CompressionWidget() {
  const [textSamples, setTextSamples] = useState<TextSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<TextSample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFixedScale, setUseFixedScale] = useState(false);
  const [llmProgressionData, setLlmProgressionData] = useState<any>(null);
  const [userText, setUserText] = useState('');
  const [userResults, setUserResults] = useState<CompressionResult[] | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUserText, setShowUserText] = useState(false);
  const [gptLoadingMessage, setGptLoadingMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load text list configuration  
        const listUrl = getAssetPath('/compression_experiments/texts/list.json');
        const listResponse = await fetch(listUrl);
        if (!listResponse.ok) throw new Error(`Failed to load text list: ${listResponse.status}`);
        const textConfigs = await listResponse.json();

        // Load compression results
        const resultsUrl = getAssetPath('/compression_experiments/compression_results.json');
        const resultsResponse = await fetch(resultsUrl);
        if (!resultsResponse.ok) throw new Error(`Failed to load compression results: ${resultsResponse.status}`);
        const compressionResults = await resultsResponse.json();

        // Load each text file and combine with results
        const samples: TextSample[] = [];
        
        for (const config of textConfigs) {
          try {
            const textUrl = getAssetPath(`/compression_experiments/texts/${config.filename}`);
            const textResponse = await fetch(textUrl);
            if (!textResponse.ok) continue;
            
            const text = await textResponse.text();
            const key = config.filename.replace(/\.[^/.]+$/, ""); // Remove extension
            const result = compressionResults[key] || {};
            
            // Default values if not in results
            const textLength = text.trim().length;
            const naiveBits = textLength * 8;
            
            // Helper function to get file-specific descriptions
            const getSpecificDescription = (algorithm: string, filename: string, textLength: number) => {
              const baseKey = filename.replace(/\.[^/.]+$/, ""); // Remove extension
              
              const descriptions: { [key: string]: { [alg: string]: string } } = {
                "kl_intro_10kb": {
                  "Baseline": "",
                  "Best code": "Entropy of English letter frequencies is about 4 bits per letter. This text is a bit worse due to math characters",
                  "ZIP (zlib)": "ZIP can typically do a bit better than pure letter-encoding due to common words like 'the'",
                  "LLM (GPT-2)": "If you can speak English, its entropy is about 1 bit per letter.",
                  "LLM (Llama 4)": "If you can speak English and are very smart at math, you can do better than 1 bit per letter for this text."
                },
                "pi_digits_10kb": {
                  "Baseline": "",
                  "Best code": "All ten digits 0,1,...,9 have the same frequency in $\\pi$. The optimal code for letters thus uses $\\log 10 \\approx 3.3$ bits per character.",
                  "ZIP (zlib)": "ZIP kind of sucks here, it probably tries very hard to find some order in $\\pi$ that really isn't there; thus 20% overhead over naive encoding of digits.",
                  "LLM (GPT-2)": "GPT-2 clearly does not know $\\pi$ (except for the first few digits) so it's stuck with $\\log 10 \\approx 3.3$ bits per letter. In fact, it's a bit worse due to technicalities related to converting between tokens and characters.",
                  "LLM (Llama 4)": "Llama clearly knows the first 10k digits of pi pretty well! It memorized the first 1K digits incredibly well, then it starts stumbling more and more often, but still very impressive!"
                },
                "declaration_full": {
                  "Baseline": "",
                  "Best code": "Entropy of English letter frequencies is about 4 bits per letter.",
                  "ZIP (zlib)": "ZIP can typically do a bit better than pure letter-encoding due to common words like 'the'",
                  "LLM (GPT-2)": "GPT-2 clearly remembers that all men were created equal! Otherwise, it's about as good as any other English text.",
                  "LLM (Llama 4)": "Llama 4 knows the declaration by heart. It is probably not super sure about the order of signatories at the very end."
                },
                "human_mitochondrial_dna": {
                  "Baseline": "",
                  "Best code": "DNA has 4-letter alphabet with quite even base frequencies, leading to 2 bits per letter and 4x speedup over the naive encoding.",
                  "ZIP (zlib)": "As with pi, ZIP is trying to find some correlations between consecutive letters, but there does not seem to be that much going on; this leads to 20% overhead as with $\\pi$.",
                  "LLM (GPT-2)": "GPT-2 just sees random string over four letters. It's a bit worse than 2 bits per letter due to technicalities related to converting between tokens and characters.",
                  "LLM (Llama 4)": "I chose one of the most important parts of human DNA and Llama actually knows the first few hundreds of base pairs. Then it's again just (slightly worse than) 2 bits per letter."
                },
                "huffman_code_10kb": {
                  "Baseline": "",
                  "Best code": "Letter frequencies in code are similar to English texts, so we can get about 4 bits per character",
                  "ZIP (zlib)": "Code is easier to compress by zip than regular English text as it contains many very frequent words like print, if and so on.",
                  "LLM (GPT-2)": "As with ZIP, GPT-2 achieves a bit better performance than on regular English text.",
                  "LLM (Llama 4)": "Unlike GPT-2, Llama can code. The code snippet is a well-known algorithm and Llama clearly knows it. The second part of the example code is more ad-hoc as it contains some printing of results where there's more wiggle room about what may come next."
                },
                "repeated_phrase": {
                  "Baseline": "",
                  "Best code": "Although the text is repetitive, the entropy of letter frequencies is very similar to that of English. ",
                  "ZIP (zlib)": "ZIP is smart enough to compress repeating patterns so it's great for files like this one. ",
                  "LLM (GPT-2)": "GPT-2 is basically not surprised at all after the first sentence. Except for a weird bit in the middle that I don't understand. ",
                  "LLM (Llama 4)": "Llama just reads the first sentence and then chills. With some caveats, it can compress the whole file to <100 bits. "
                }

              };
              
              return descriptions[baseKey]?.[algorithm] || `Compression analysis for ${textLength} characters`;
            };
            
            const sample: TextSample = {
              name: config.name,
              description: config.description,
              text: text.trim(),
              filename: config.filename,
              results: [
                {
                  algorithm: "Baseline",
                  bits: result.naive_bits || naiveBits,
                  ratio: "1.00x",
                  generalDescription: "Just store each character as 8 bits in memory, using ASCII encoding. ",
                  specificDescription: getSpecificDescription("Baseline", config.filename, textLength)
                },
                {
                  algorithm: "Best code",
                  bits: result.letterwise_bits || naiveBits,
                  ratio: result.letterwise_ratio ? `${result.letterwise_ratio}x` : "1.00x",
                  generalDescription: "Use optimal codes based on individual character frequencies. We estimate its compression rate by computing the entropy of the frequency distribution. ",
                  specificDescription: getSpecificDescription("Best code", config.filename, textLength)
                },
                {
                  algorithm: "ZIP (zlib)",
                  bits: result.zip_bits || naiveBits,
                  ratio: result.zip_ratio ? `${result.zip_ratio}x` : "1.00x",
                  generalDescription: "Standard dictionary-based compression algorithm",
                  specificDescription: getSpecificDescription("ZIP (zlib)", config.filename, textLength)
                },
                {
                  algorithm: "LLM (GPT-2)",
                  bits: result.gpt2_bits || naiveBits,
                  ratio: result.gpt2_ratio ? `${result.gpt2_ratio}x` : "1.00x",
                  generalDescription: "Use language model for next token prediction. We estimate the compression rate by computing the cross-entropy of the net on the text. GPT-2 = Good old LLM",
                  specificDescription: getSpecificDescription("LLM (GPT-2)", config.filename, textLength)
                },
                {
                  algorithm: "LLM (Llama 4)",
                  bits: result.llama_bits || naiveBits,
                  ratio: result.llama_ratio ? `${result.llama_ratio}x` : "1.00x",
                  generalDescription: "Use language model for next token prediction. We estimate the compression rate by computing the cross-entropy of the net on the text. Llama 4 = not too far behind state-of-the-art as of 2025",
                  specificDescription: getSpecificDescription("LLM (Llama 4)", config.filename, textLength)
                }
              ]
            };

            samples.push(sample);
          } catch (err) {
            // Silently continue if text file fails to load
          }
        }

        setTextSamples(samples);
        
        // Load LLM progression data for tooltips
        try {
          const llmResponse = await fetch(getAssetPath('/compression_experiments/llm_compression_summary.json'));
          if (llmResponse.ok) {
            const llmData = await llmResponse.json();
            setLlmProgressionData(llmData);
          }
        } catch (llmErr) {
          console.warn('Failed to load LLM progression data:', llmErr);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load compression data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load compression data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatBits = (bits: number): string => {
    if (bits >= 8000) return `${(bits / 8000).toFixed(1)}KB`;
    return `${bits} bits`;
  };

  // Adaptive scale (original)
  const getAdaptiveBarWidth = (bits: number, minBits: number, maxBits: number): number => {
    // Scale so that the best compression (minBits) gets 25% width and worst gets 100%
    const logBits = Math.log10(bits);
    const logMin = Math.log10(minBits);
    const logMax = Math.log10(maxBits);
    
    // Map to 25-100% range
    const normalized = (logBits - logMin) / (logMax - logMin);
    return 25 + (normalized * 75);
  };

  // Fixed scale - global maximum across all samples
  const getGlobalMaxRatio = (): number => {
    let maxRatio = 1;
    textSamples.forEach(sample => {
      sample.results.forEach(result => {
        const ratio = parseFloat(result.ratio.replace('x', ''));
        if (ratio > maxRatio) maxRatio = ratio;
      });
    });
    return maxRatio;
  };

  const getFixedBarWidth = (ratio: number, globalMaxRatio: number): number => {
    // For fixed scale, bars should correspond to their marker positions
    // Better compression (higher ratio) should have shorter bars (positioned further right on axis)
    const maxWidth = 90; // 1x gets longest bar
    const minWidth = 10; // Best compression gets shortest bar
    
    // Find which "power slot" this ratio falls into for consistent positioning
    const powers = [];
    let power = 1;
    while (power <= globalMaxRatio) {
      powers.push(power);
      power *= 2;
    }
    
    // Find the position of this ratio in the power sequence
    let powerIndex = 0;
    for (let i = 0; i < powers.length - 1; i++) {
      if (ratio >= powers[i] && ratio < powers[i + 1]) {
        // Interpolate between power positions
        const t = (ratio - powers[i]) / (powers[i + 1] - powers[i]);
        powerIndex = i + t;
        break;
      }
    }
    if (ratio >= powers[powers.length - 1]) {
      powerIndex = powers.length - 1;
    }
    
    // Convert power index to bar width (inverse relationship)
    const normalizedPosition = powerIndex / (powers.length - 1); // 0 to 1
    const width = maxWidth - normalizedPosition * (maxWidth - minWidth);
    return Math.max(minWidth, Math.min(maxWidth, width));
  };

  const getBarWidth = (bits: number, minBits: number, maxBits: number, ratio?: number, globalMaxRatio?: number): number => {
    if (useFixedScale && ratio !== undefined && globalMaxRatio !== undefined) {
      return getFixedBarWidth(ratio, globalMaxRatio);
    } else {
      return getAdaptiveBarWidth(bits, minBits, maxBits);
    }
  };

  const getBarColor = (percent: number): string => {
    // Color based on position (0-100%)
    if (percent < 25) return "#22c55e"; // green
    if (percent < 50) return "#84cc16"; // lime
    if (percent < 75) return "#eab308"; // yellow
    if (percent < 90) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  // Adaptive scale markers (original)
  const getAdaptiveMarkers = (minBits: number, maxBits: number) => {
    const markers = [];
    
    // Calculate the range of compression ratios
    const maxRatio = maxBits / minBits;
    
    // Generate smart markers based on the range
    let candidateRatios = [];
    
    if (maxRatio <= 3) {
      candidateRatios = [1.2, 1.5, 1.8, 2.0, 2.5, 3.0];
    } else if (maxRatio <= 10) {
      candidateRatios = [1.5, 2, 3, 4, 5, 6, 8, 10];
    } else if (maxRatio <= 50) {
      candidateRatios = [2, 5, 10, 15, 20, 30, 40, 50];
    } else if (maxRatio <= 200) {
      candidateRatios = [5, 10, 20, 50, 100, 150, 200];
    } else {
      candidateRatios = [10, 25, 50, 100, 200, 300, 500];
    }
    
    // Filter to only include ratios that fit in our range
    for (const ratio of candidateRatios) {
      const targetBits = maxBits / ratio;
      if (targetBits >= minBits * 0.9 && targetBits <= maxBits) {
        const position = getAdaptiveBarWidth(targetBits, minBits, maxBits);
        
        // Format the ratio nicely
        let label;
        if (ratio < 10 && ratio % 1 !== 0) {
          label = `${ratio.toFixed(1)}x`;
        } else {
          label = `${Math.round(ratio)}x`;
        }
        
        markers.push({ ratio: label, position });
      }
    }
    
    // Ensure we have 3-6 markers by adjusting if needed
    if (markers.length > 6) {
      const filtered = [];
      for (let i = 0; i < markers.length; i += Math.ceil(markers.length / 5)) {
        filtered.push(markers[i]);
      }
      return filtered;
    }
    
    return markers;
  };

  // Fixed scale markers - powers of 2
  const getFixedMarkers = (globalMaxRatio: number): { ratio: string; position: number }[] => {
    const markers: { ratio: string; position: number }[] = [];
    
    // Generate equidistant powers of 2 positions
    // We want 1x, 2x, 4x, 8x, etc. to be equally spaced on the axis
    const powers = [];
    let power = 1;
    while (power <= globalMaxRatio) {
      powers.push(power);
      power *= 2;
    }
    
    // Position markers with equal spacing
    powers.forEach((power, index) => {
      // Equal spacing across the 10%-90% range
      const position = 90 - (index / (powers.length - 1)) * 80; // Start from 90% (worst) to 10% (best)
      markers.push({ 
        ratio: power === 1 ? "1x" : `${power}x`, 
        position 
      });
    });
    
    return markers;
  };

  const getCompressionRatioMarkers = (minBits: number, maxBits: number, globalMaxRatio?: number) => {
    if (useFixedScale && globalMaxRatio !== undefined) {
      return getFixedMarkers(globalMaxRatio);
    } else {
      return getAdaptiveMarkers(minBits, maxBits);
    }
  };

  // Helper component to render markdown text with LaTeX
  const RenderMarkdown = ({ text }: { text: string }) => {
    // Simple regex to find LaTeX expressions
    const parts = text.split(/(\$[^$]+\$)/g);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            // It's a LaTeX expression
            const math = part.slice(1, -1);
            return <KatexMath key={index} math={math} displayMode={false} />;
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  const getLLMChartData = (algorithm: string, filename: string) => {
    if (!llmProgressionData || !filename) return null;
    
    // Map algorithm names to model keys
    const algorithmToModel: { [key: string]: string } = {
      "LLM (GPT-2)": "gpt-2",
      "LLM (Llama 4)": "llama-4"
    };
    
    const modelKey = algorithmToModel[algorithm];
    if (!modelKey || !llmProgressionData[modelKey]) return null;
    
    // Find experiment by filename (remove extension)
    const fileKey = filename.replace(/\.[^/.]+$/, "");
    const experiment = llmProgressionData[modelKey][fileKey];
    
    if (!experiment || !experiment.dataPoints) return null;
    
    return {
      data: experiment.dataPoints,
      modelName: experiment.modelName,
      experimentName: experiment.name
    };
  };

  // Call Hugging Face GPT-2 compression API using queue system
  const callGPT2Compression = async (text: string): Promise<{ algorithm: string; bits: number; ratio: string; compressionProgression?: any[] } | null> => {
    try {
      console.log('Calling GPT-2 API with text:', text.substring(0, 50) + '...');
      
      // Show loading message based on text length
      const textLength = text.length;
      if (textLength > 5000) {
        setGptLoadingMessage('Running GPT-2 compression, this should take <1 min for <10KB files...');
      } else if (textLength > 1000) {
        setGptLoadingMessage('Running GPT-2 compression, this takes about a minute...');
      } else {
        setGptLoadingMessage('Running GPT-2 compression...');
      }
      
      const sessionHash = Math.random().toString(36).substring(2);
      
      const queueResponse = await fetch(
        'https://vaclavrozhon-probabilistic-lenses-widgets.hf.space/queue/join',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            data: [text],
            event_data: null,
            fn_index: 0,        // Compression Analysis tab (now first interface)
            session_hash: sessionHash
          })
        }
      );
      
      if (!queueResponse.ok) {
        throw new Error(`Queue join failed: ${queueResponse.status}`);
      }
      
      // Use EventSource to get results
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(
          `https://vaclavrozhon-probabilistic-lenses-widgets.hf.space/queue/data?session_hash=${sessionHash}`
        );
        
        const timeout = setTimeout(() => {
          eventSource.close();
          setGptLoadingMessage('');
          reject(new Error('GPT-2 processing timeout'));
        }, 120000);  // Increase timeout to 2 minutes for long texts
          
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.msg === 'process_completed') {
              clearTimeout(timeout);
              eventSource.close();
              setGptLoadingMessage('');
              
              console.log('Full API response:', JSON.stringify(data, null, 2));
              
              if (data.output && data.output.data) {
                const compressionData = data.output.data[0];
                console.log('Raw data from API:', compressionData);
                
                // Check if it's already an object or needs parsing
                let parsedData;
                if (typeof compressionData === 'string') {
                  try {
                    parsedData = JSON.parse(compressionData);
                  } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError, 'Raw:', compressionData);
                    resolve(null);
                    return;
                  }
                } else {
                  parsedData = compressionData;
                }
                
                if (parsedData.error) {
                  console.error('GPT-2 compression failed:', parsedData.error);
                  resolve(null);
                } else if (parsedData.algorithm && parsedData.bits && parsedData.ratio) {
                  resolve({
                    algorithm: parsedData.algorithm,
                    bits: parsedData.bits,
                    ratio: parsedData.ratio,
                    compressionProgression: parsedData.compression_progression || []
                  });
                } else {
                  console.error('Invalid data format:', parsedData);
                  resolve(null);
                }
              } else {
                console.log('data.output:', JSON.stringify(data.output, null, 2));
                console.error('No output data - full response:', JSON.stringify(data, null, 2));
                resolve(null);
              }
            }
          } catch (e) {
            // Continue listening
          }
        };
        
        eventSource.onerror = () => {
          clearTimeout(timeout);
          eventSource.close();
          setGptLoadingMessage('');
          resolve(null);
        };
      });
      
    } catch (error) {
      console.error('Failed to call GPT-2 API:', error);
      setGptLoadingMessage('');
      return null;
    }
  };

  // Browser-based compression using built-in APIs
  const compressWithBrowserAPIs = async (text: string) => {
    const results: CompressionResult[] = [];
    
    // Baseline
    results.push({
      algorithm: "Baseline",
      bits: text.length * 8,
      ratio: "1.00x",
      generalDescription: "Just store each character as 8 bits in memory, using ASCII encoding.",
      specificDescription: ""
    });
    
    // Add estimate for Best code (simple entropy calculation) - put BEFORE ZIP
    const charFreq: { [key: string]: number } = {};
    for (const char of text) {
      charFreq[char] = (charFreq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const textLength = text.length;
    for (const freq of Object.values(charFreq)) {
      const p = freq / textLength;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    
    const bestCodeBits = entropy * textLength;
    const bestCodeRatio = (textLength * 8) / bestCodeBits;
    
    results.push({
      algorithm: "Best code",
      bits: Math.round(bestCodeBits),
      ratio: `${bestCodeRatio.toFixed(2)}x`,
      generalDescription: "Use optimal codes based on individual character frequencies. We estimate its compression rate by computing the entropy of the frequency distribution.",
      specificDescription: "Theoretical optimum based on character frequencies in your text"
    });
    
    // Gzip compression using browser CompressionStream - put AFTER Best code
    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(text));
      writer.close();
      
      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) chunks.push(value);
      }
      
      const compressedSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const gzipBits = compressedSize * 8;
      const gzipRatio = (text.length * 8) / gzipBits;
      
      results.push({
        algorithm: "ZIP (gzip)",
        bits: gzipBits,
        ratio: `${gzipRatio.toFixed(2)}x`,
        generalDescription: "Standard dictionary-based compression algorithm",
        specificDescription: "Browser-native gzip compression"
      });
    } catch (gzipError) {
      console.error('Gzip compression failed:', gzipError);
    }
    
    return results;
  };

  const runUserTextCompression = async () => {
    const trimmedText = userText.trim();
    if (!trimmedText) {
      // Handle empty string case
      const results: CompressionResult[] = [
        {
          algorithm: "Baseline",
          bits: 0,
          ratio: "N/A",
          generalDescription: "Empty text requires 0 bits to store.",
          specificDescription: "No characters to compress."
        }
      ];
      setUserResults(results);
      return;
    }
    
    setIsCompressing(true);
    
    try {
      // Get initial compression results (gzip, best code, baseline)
      const initialResults = await compressWithBrowserAPIs(trimmedText);
      
      // Show first 3 results immediately
      setUserResults(initialResults);
      
      // Add GPT-2 when ready (this takes longer)
      const gpt2Result = await callGPT2Compression(trimmedText);
      if (gpt2Result) {
        const gpt2ResultFormatted: CompressionResult = {
          algorithm: gpt2Result.algorithm,
          bits: gpt2Result.bits,
          ratio: gpt2Result.ratio,
          generalDescription: "Use language model for next token prediction. We estimate the compression rate by computing the cross-entropy of the net on the text.",
          specificDescription: "Actual GPT-2 compression measurement on your text",
          compressionProgression: gpt2Result.compressionProgression
        };
        
        setUserResults(prev => [...(prev || []), gpt2ResultFormatted]);
      }
    } catch (error) {
      console.error('Compression failed:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  if (loading) {
    return (
      <div className="compression-widget bg-white border border-gray-200 rounded-lg p-6 my-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compression-widget bg-white border border-gray-200 rounded-lg p-6 my-6">
        <div className="text-center py-8">
          <div className="text-2xl mb-2">😔</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Sorry!</h3>
          <p className="text-gray-500">
            The compression data couldn&apos;t be loaded right now.
          </p>
        </div>
      </div>
    );
  }

  // Show sorry message if no text samples are available
  if (!loading && !error && textSamples.length === 0) {
    return (
      <div className="compression-widget bg-white border border-gray-200 rounded-lg p-6 my-6">
        <div className="text-center py-8">
          <div className="text-2xl mb-2">😔</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Sorry!</h3>
          <p className="text-gray-500">
            No compression experiments are available to display.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="compression-widget bg-white border border-gray-200 rounded-lg p-4 sm:p-6 my-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Text Compression Explorer</h3>
          <p className="text-gray-600 text-sm sm:text-base">
            Explore how different compression algorithms perform on various types of text. 
            Try to guess in advance!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Scale:</span>
          <button
            onClick={() => setUseFixedScale(!useFixedScale)}
            className={`px-3 py-2 text-sm border rounded transition-colors min-h-[44px] ${
              useFixedScale 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {useFixedScale ? 'Fixed Scale' : 'Adaptive Scale'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {textSamples.map((sample, index) => (
          <button
            key={index}
            onClick={() => {setSelectedSample(sample); setShowUserText(false);}}
            className={`p-4 text-left border rounded-lg transition-all min-h-[60px] ${
              selectedSample?.name === sample.name && !showUserText
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="font-medium text-sm sm:text-base">{sample.name}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">{sample.description}</div>
          </button>
        ))}
      </div>
      
      {/* Your Text button - centered and differently designed */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => {setShowUserText(true); setSelectedSample(null);}}
          className={`px-6 py-4 text-center border-2 border-dashed rounded-lg transition-all min-h-[60px] ${
            showUserText
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-gray-700"
          }`}
        >
          <div className="font-medium text-base">📝 Your Text</div>
          <div className="text-sm text-gray-600 mt-1">Compress your own text using GPT-2</div>
        </button>
      </div>

      {selectedSample && (
        <div className="mt-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Sample Text: {selectedSample.name}</h4>
            <div 
              className="text-xs sm:text-sm font-mono bg-white p-3 rounded border overflow-y-auto break-all" 
              style={{ height: '6rem', lineHeight: '1.2rem', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {selectedSample.text}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Total length: {selectedSample.text.length} characters
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-2">Compression Results:</h4>
            
            {(() => {
              const maxBits = Math.max(...selectedSample.results.map(r => r.bits));
              const minBits = Math.min(...selectedSample.results.map(r => r.bits));
              const globalMaxRatio = useFixedScale ? getGlobalMaxRatio() : undefined;
              const markers = getCompressionRatioMarkers(minBits, maxBits, globalMaxRatio);

              return (
                <>
                  {/* Color gradient axis */}
                  <div className="relative mb-6">
                    <div 
                      className="h-2 rounded-full relative"
                      style={{
                        background: useFixedScale 
                          ? 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #84cc16 60%, #22c55e 80%, #22c55e 100%)'
                          : 'linear-gradient(to right, #22c55e 0%, #22c55e 25%, #84cc16 50%, #eab308 75%, #f97316 90%, #ef4444 100%)'
                      }}
                    >
                      {/* Compression ratio markers */}
                      {markers.map((marker, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-2 w-px bg-gray-600"
                          style={{ left: `${marker.position}%` }}
                        >
                          <span className="absolute -top-5 text-xs text-gray-600 transform -translate-x-1/2">
                            {marker.ratio}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      {useFixedScale ? (
                        <>
                          <span>Worse compression</span>
                          <span>Better compression</span>
                        </>
                      ) : (
                        <>
                          <span>Better compression</span>
                          <span>Worse compression</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compression bars */}
                  <div className="space-y-3">
                    {selectedSample.results.map((result, index) => {
                      const ratio = parseFloat(result.ratio.replace('x', ''));
                      const width = getBarWidth(result.bits, minBits, maxBits, ratio, globalMaxRatio);
                      const color = getBarColor(width);
                      
                      return (
                        <HoverCard.Root key={index} openDelay={100} closeDelay={300}>
                          <HoverCard.Trigger asChild>
                            <div className="relative cursor-pointer">
                              <div 
                                className="relative h-12 rounded transition-all hover:opacity-90"
                                style={{ 
                                  width: `${width}%`,
                                  backgroundColor: color
                                }}
                              >
                                <div className="absolute inset-0 flex items-center px-3">
                                  <span className="text-white font-medium text-sm">
                                    {result.algorithm}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatBits(result.bits)} ({result.ratio})
                              </div>
                            </div>
                          </HoverCard.Trigger>
                          <HoverCard.Portal>
                            <HoverCard.Content 
                              className="z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 max-w-xl"
                              sideOffset={5}
                            >
                              <div className="text-sm">
                                <div className="font-medium mb-2 text-gray-900">{result.algorithm} Algorithm</div>
                                <div className="mb-2 text-gray-700">
                                  <strong>How it works:</strong> {result.generalDescription}
                                </div>
                                {result.specificDescription && (
                                  <div className="text-gray-700 mb-3">
                                    <strong>For this text:</strong> <RenderMarkdown text={result.specificDescription} />
                                  </div>
                                )}
                                
                                {/* Add mini compression chart for LLM algorithms */}
                                {result.algorithm.startsWith('LLM') && (() => {
                                  const chartData = getLLMChartData(result.algorithm, selectedSample?.filename || '');
                                  return chartData ? (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="text-xs font-medium text-gray-700 mb-2">
                                        Compression progression through text:
                                      </div>
                                      <div className="w-full">
                                        <MiniCompressionChart 
                                          data={chartData.data}
                                          modelName={chartData.modelName}
                                          experimentName={chartData.experimentName}
                                          height={160}
                                        />
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </HoverCard.Content>
                          </HoverCard.Portal>
                        </HoverCard.Root>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700">
              <strong>Hover over bars</strong> to see how each algorithm works. 
              Bar length shows compressed size on a logarithmic scale.
            </div>
          </div>
        </div>
      )}

      {/* User text interface */}
      {showUserText && (
        <div className="mt-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Your Text</h4>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Paste your text here to see how well different algorithms can compress it..."
              className="w-full h-32 p-3 border border-gray-200 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray-500">
                Length: {userText.length} characters
              </div>
              <button
                onClick={runUserTextCompression}
                disabled={!userText.trim() || isCompressing}
                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isCompressing ? 'Compressing...' : 'Run Compression'}
              </button>
            </div>
            {gptLoadingMessage && (
              <div className="mt-2 text-sm text-blue-600 italic">
                {gptLoadingMessage}
              </div>
            )}
          </div>

          {/* User compression results */}
          {userResults && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Compression Results:</h4>
              
              {(() => {
                const maxBits = Math.max(...userResults.map(r => r.bits));
                const minBits = Math.min(...userResults.map(r => r.bits));
                const globalMaxRatio = useFixedScale ? getGlobalMaxRatio() : undefined;
                const markers = getCompressionRatioMarkers(minBits, maxBits, globalMaxRatio);

                return (
                  <>
                    {/* Color gradient axis */}
                    <div className="relative mb-6">
                      <div 
                        className="h-2 rounded-full relative"
                        style={{
                          background: useFixedScale 
                            ? 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #84cc16 60%, #22c55e 80%, #22c55e 100%)'
                            : 'linear-gradient(to right, #22c55e 0%, #22c55e 25%, #84cc16 50%, #eab308 75%, #f97316 90%, #ef4444 100%)'
                        }}
                      >
                        {/* Compression ratio markers */}
                        {markers.map((marker, i) => (
                          <div
                            key={i}
                            className="absolute top-0 h-2 w-px bg-gray-600"
                            style={{ left: `${marker.position}%` }}
                          >
                            <span className="absolute -top-5 text-xs text-gray-600 transform -translate-x-1/2">
                              {marker.ratio}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        {useFixedScale ? (
                          <>
                            <span>Worse compression</span>
                            <span>Better compression</span>
                          </>
                        ) : (
                          <>
                            <span>Better compression</span>
                            <span>Worse compression</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Compression bars */}
                    <div className="space-y-3">
                      {userResults.map((result, index) => {
                        const ratio = parseFloat(result.ratio.replace('x', '')) || 1;
                        const width = getBarWidth(result.bits, minBits, maxBits, ratio, globalMaxRatio);
                        const color = getBarColor(width);
                        
                        return (
                          <HoverCard.Root key={index} openDelay={100} closeDelay={300}>
                            <HoverCard.Trigger asChild>
                              <div className="relative cursor-pointer">
                                <div 
                                  className="relative h-12 rounded transition-all hover:opacity-90"
                                  style={{ 
                                    width: `${width}%`,
                                    backgroundColor: color
                                  }}
                                >
                                  <div className="absolute inset-0 flex items-center px-3">
                                    <span className="text-white font-medium text-sm">
                                      {result.algorithm}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatBits(result.bits)} ({result.ratio})
                                </div>
                              </div>
                            </HoverCard.Trigger>
                            <HoverCard.Portal>
                              <HoverCard.Content 
                                className="z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 max-w-xl"
                                sideOffset={5}
                              >
                                <div className="text-sm">
                                  <div className="font-medium mb-2 text-gray-900">{result.algorithm} Algorithm</div>
                                  <div className="mb-2 text-gray-700">
                                    <strong>How it works:</strong> {result.generalDescription}
                                  </div>
                                  {result.specificDescription && !["Best code", "ZIP (gzip)"].includes(result.algorithm) && (
                                    <div className="text-gray-700 mb-3">
                                      <strong>For this text:</strong> <RenderMarkdown text={result.specificDescription} />
                                    </div>
                                  )}
                                  
                                  {/* Add mini compression chart for GPT-2 with progression data */}
                                  {result.algorithm.startsWith('LLM') && result.compressionProgression && result.compressionProgression.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="text-xs font-medium text-gray-700 mb-2">
                                        Compression progression through text:
                                      </div>
                                      <div className="w-full">
                                        <MiniCompressionChart 
                                          data={result.compressionProgression.filter(p => 
                                            p.progressPercent !== undefined && 
                                            p.bitsPerChar !== undefined && 
                                            !isNaN(p.progressPercent) && 
                                            !isNaN(p.bitsPerChar)
                                          )}
                                          modelName="GPT-2"
                                          experimentName="Your Text"
                                          height={160}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </HoverCard.Content>
                            </HoverCard.Portal>
                          </HoverCard.Root>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="widget-explanation">
              <strong>Enter your text above</strong> and click &quot;Run Compression&quot; to see how different algorithms perform. 
              GPT-2 processing may take 1-2 minutes for longer texts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}