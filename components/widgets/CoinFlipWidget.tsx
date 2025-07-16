"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import KatexMath from "@/components/content/KatexMath";
import { getAssetPath } from "@/lib/utils";

// ====================================================================
// CROSS-ENTROPY WIDGET - SIMPLIFIED VERSION
// ====================================================================
//
// EDUCATIONAL CONCEPT:
// - Shows how "surprise" varies when reality (p) differs from our model (q)
// - Visualizes cross-entropy: the average surprise when using model q to 
//   predict events with true distribution p
// - Demonstrates information theory concepts in an intuitive, dynamic way
//
// FUNCTIONALITY:
// - Top canvas: coins move left, trigger bottom canvas when crossing red line
// - Bottom canvas: triggered coins appear at center line at surprise height
// - Both canvases scroll at same user-controlled speed
// ====================================================================

interface Coin {
  id: number;
  isHeads: boolean;
  x: number;
}

interface BottomCoin {
  id: number;
  isHeads: boolean;
  x: number;
  y: number;
  surprise: number; // Store the surprise value when created
}

interface Props {
  initialP?: number;
  initialQ?: number;
  change_p?: boolean;
  change_q?: boolean;
  default_p?: number;
  default_q?: number;
  maxSurprise?: number;
  bottomSpeedMultiplier?: number;
  entropy?: boolean;
}

export default function CrossEntropyWidget({
  initialP,
  initialQ,
  default_p = 0.5,
  default_q = 0.5,
  change_p = true,
  change_q = true,
  maxSurprise = 7,
  bottomSpeedMultiplier = 2,
  entropy = false,
}: Props) {
  const [p, setP] = useState(initialP ?? default_p);
  const [q, setQ] = useState(initialQ ?? default_q);
  
  // In entropy mode, q always equals p
  const effectiveQ = entropy ? p : q;
  const [coins, setCoins] = useState<Coin[]>([]);
  const [bottomCoins, setBottomCoins] = useState<BottomCoin[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [nextCoinId, setNextCoinId] = useState(0);
  const [speed, setSpeed] = useState(100); // pixels per second (2/3 of max 150)
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const triggeredCoinsRef = useRef<Set<number>>(new Set());
  
  // ====================================================================
  // CONSTANTS SECTION
  // ====================================================================
  
  // ===== WIDGET CONSTANTS =====
  const CANVAS_WIDTH = 200;                // Width of top coin animation canvas
  const CANVAS_HEIGHT = 100;               // Height of top coin animation canvas
  const GRAPH_HEIGHT = 340;                // Height of bottom graph area (extra space for 0-line coins)
  const GRAPH_WIDTH = 600;                 // Width of bottom graph area
  
  // All sizes relative to canvas dimensions
  const TOP_COIN_SIZE = CANVAS_HEIGHT * 0.7;     // 70% of canvas height
  const BOTTOM_COIN_SIZE = GRAPH_HEIGHT * 0.12;  // 12% of graph height
  const COIN_SPACING = CANVAS_WIDTH * 0.5;       // 50% of canvas width spacing
  const TRIGGER_POSITION = CANVAS_WIDTH * 0.5;   // Center of canvas
  const GRAPH_PADDING_BOTTOM = GRAPH_HEIGHT * 0.1; // 10% padding at bottom for 0-line visibility
  const USABLE_GRAPH_HEIGHT = GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM;
  const COIN_VERTICAL_OFFSET = BOTTOM_COIN_SIZE * 0.8; // Magic offset to align coins with SVG lines
  const TOP_COIN_VERTICAL_OFFSET = TOP_COIN_SIZE * 0.4; // Positive offset to push coins down
  
  // ====================================================================
  // SIMPLIFIED LOGIC
  // ====================================================================
  // 
  // 1. COINS MOVE LEFT: Coins start off-screen right and move left at user speed
  // 2. TRIGGER DETECTION: When a coin reaches TRIGGER_POSITION, place it in bottom canvas
  // 3. BOTTOM PLACEMENT: Place coin at center X, height based on surprise value
  // 4. SCROLLING: Both top and bottom coins scroll left at same user speed
  // ====================================================================
  
  // ====================================================================
  // DERIVED VALUES AND SPECIAL CASES
  // ====================================================================
  
  // Calculate cross-entropy (average surprise) - the theoretical average
  const crossEntropy = p * Math.log2(1/effectiveQ) + (1-p) * Math.log2(1/(1-effectiveQ));
  
  // Handle extreme probability values that would cause infinite surprise
  const isQExtreme = effectiveQ === 0 || effectiveQ === 1;
  const showInfiniteMessage = isQExtreme && !(p === 0 && effectiveQ === 0);
  
  // ====================================================================
  // INITIALIZATION: SETUP INITIAL COINS
  // ====================================================================
  
  // Create initial coins when component mounts or when probabilities (p or q) change
  useEffect(() => {
    const initialCoins: Coin[] = [];
    
    // Create initial coins with consistent spacing
    const startX = CANVAS_WIDTH + COIN_SPACING;
    for (let i = 0; i < 4; i++) {
      initialCoins.push({
        id: i,
        isHeads: Math.random() < p,
        x: startX + i * COIN_SPACING,
      });
    }
    
    setCoins(initialCoins);
    setNextCoinId(4);
    setBottomCoins([]);
    triggeredCoinsRef.current.clear();
  }, [p, effectiveQ]);

  // Generate new coins as needed
  const generateNewCoin = useCallback((rightmostX: number) => {
    const isHeads = Math.random() < p;
    const newCoin: Coin = {
      id: nextCoinId,
      isHeads,
      x: rightmostX + COIN_SPACING,
    };
    
    setCoins(prev => [...prev, newCoin]);
    setNextCoinId(prev => prev + 1);
  }, [p, nextCoinId]);

  // Calculate surprise value for a coin
  const calculateSurprise = useCallback((isHeads: boolean) => {
    if (isHeads) {
      return effectiveQ === 0 ? maxSurprise : Math.log2(1/effectiveQ);
    } else {
      return effectiveQ === 1 ? maxSurprise : Math.log2(1/(1-effectiveQ));
    }
  }, [effectiveQ, maxSurprise]);

  const animate = useCallback((timestamp: number) => {
    if (!isRunning) return;

    const deltaTime = timestamp - lastUpdateRef.current;
    if (deltaTime > 16) { // Throttle to ~60fps
      const pixelsPerMs = speed / 1000;
      const deltaSeconds = deltaTime / 1000;
      
      // Update top canvas coins
      setCoins(prev => {
        const updated = prev.map(coin => ({
          ...coin,
          x: coin.x - pixelsPerMs * deltaTime
        })).filter(coin => coin.x > -TOP_COIN_SIZE);
        
        // Check for trigger crossings
        updated.forEach(coin => {
          if (coin.x <= TRIGGER_POSITION && !triggeredCoinsRef.current.has(coin.id)) {
            triggeredCoinsRef.current.add(coin.id);
            
            // Calculate surprise and place coin in bottom canvas
            const surprise = calculateSurprise(coin.isHeads);
            
            // Only show if within max height
            if (surprise <= maxSurprise) {
              const centerX = GRAPH_WIDTH / 2;
              // Calculate Y position with bottom padding
              const screenY = GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (surprise / maxSurprise) * USABLE_GRAPH_HEIGHT;
              
              const bottomCoin: BottomCoin = {
                id: coin.id,
                isHeads: coin.isHeads,
                x: centerX,
                y: screenY,
                surprise: surprise // Store the surprise value at creation time
              };
              
              setBottomCoins(prev => [...prev, bottomCoin]);
            }
          }
        });
        
        return updated;
      });
      
      // Update bottom canvas coins (scroll left at different speed)
      const bottomPixelsPerMs = (speed / bottomSpeedMultiplier) / 1000;
      setBottomCoins(prev => prev
        .map(coin => ({
          ...coin,
          x: coin.x - bottomPixelsPerMs * deltaTime
        }))
        .filter(coin => coin.x > -BOTTOM_COIN_SIZE) // Remove off-screen coins
      );
      
      lastUpdateRef.current = timestamp;
    }

    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isRunning, speed, calculateSurprise, maxSurprise, bottomSpeedMultiplier]);

  // Check if we need to generate a new coin
  useEffect(() => {
    if (!isRunning) return;
    
    const rightmostCoin = Math.max(...coins.map(c => c.x), -Infinity);
    if (rightmostCoin < CANVAS_WIDTH) {
      generateNewCoin(rightmostCoin);
    }
  }, [coins, isRunning, generateNewCoin]);

  useEffect(() => {
    if (isRunning) {
      lastUpdateRef.current = performance.now();
      const startAnimation = () => {
        animationRef.current = requestAnimationFrame(animate);
      };
      startAnimation();
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, animate]);

  // Handle visibility change (alt-tab) to prevent state corruption
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        // Page became hidden - reset timestamp to prevent time jumps
        lastUpdateRef.current = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  const startAnimation = () => {
    setBottomCoins([]);
    triggeredCoinsRef.current.clear();
    setIsRunning(true);
  };

  const stopAnimation = () => {
    setIsRunning(false);
  };

  const resetAnimation = () => {
    setIsRunning(false);
    setCoins([]);
    setBottomCoins([]);
    triggeredCoinsRef.current.clear();
    setNextCoinId(0);
    
    // Re-initialize coins
    const initialCoins: Coin[] = [];
    const startX = CANVAS_WIDTH + COIN_SPACING;
    for (let i = 0; i < 4; i++) {
      initialCoins.push({
        id: i,
        isHeads: Math.random() < p,
        x: startX + i * COIN_SPACING,
      });
    }
    setCoins(initialCoins);
    setNextCoinId(4);
  };

  return (
    <div className="crossentropy-widget bg-white border border-gray-200 rounded-lg p-6 my-6">
      <h3 className="text-lg font-semibold mb-4">{entropy ? "Entropy Widget" : "Cross-Entropy Widget"}</h3>

      {/* Parameter Controls */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            p(heads): {p.toFixed(2)} <span className="text-gray-500">(true probability)</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            disabled={!change_p}
            className={`w-full ${!change_p ? 'opacity-50' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            q(heads): {effectiveQ.toFixed(2)} <span className="text-gray-500">(model probability)</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effectiveQ}
            onChange={(e) => setQ(parseFloat(e.target.value))}
            disabled={!change_q || entropy}
            className={`w-full ${!change_q || entropy ? 'opacity-50' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coin movement speed
          </label>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Animation Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={startAnimation}
          disabled={isRunning}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stopAnimation}
          disabled={!isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Stop
        </button>
        <button
          onClick={resetAnimation}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Coin Animation Canvas */}
      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="text-sm text-gray-600">
            Coin flips generated by <KatexMath math="p" />
          </div>
          <div
            ref={canvasRef}
            className="relative overflow-hidden bg-white rounded border-2 border-gray-300"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            }}
          >
          {/* Trigger position indicator */}
          <div
            className="absolute bg-red-300 opacity-50"
            style={{
              left: TRIGGER_POSITION,
              top: 0,
              width: 2,
              height: CANVAS_HEIGHT,
            }}
          />
          
          {coins.map(coin => (
            <div
              key={coin.id}
              className="absolute transition-none"
              style={{
                left: coin.x,
                top: CANVAS_HEIGHT / 2 - TOP_COIN_SIZE / 2 - TOP_COIN_VERTICAL_OFFSET,
                width: TOP_COIN_SIZE,
                height: TOP_COIN_SIZE,
              }}
            >
              {coin.isHeads ? (
                <img 
                  src={getAssetPath("/images/coin_heads_small.png")} 
                  alt="Heads" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <img 
                  src={getAssetPath("/images/coin_tail_small.png")} 
                  alt="Tails" 
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Bottom Graph */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="bg-white rounded border-2 border-gray-300 relative overflow-hidden w-full" 
             style={{ height: GRAPH_HEIGHT }}>
          
          <svg width="100%" height={GRAPH_HEIGHT} className="absolute inset-0" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Y-axis labels and lines */}
            {Array.from({length: Math.ceil(maxSurprise) + 1}, (_, i) => i).map(val => {
              const y = GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (val / maxSurprise) * USABLE_GRAPH_HEIGHT;
              return (
                <g key={val}>
                  <line x1={0} y1={y} x2={GRAPH_WIDTH} y2={y} stroke="#e0e0e0" strokeWidth="1"/>
                  <text x={5} y={y - 5} fontSize="12" fill="#666">{val}</text>
                </g>
              );
            })}
            
            {/* Cross-entropy constant line or infinite message */}
            {showInfiniteMessage ? (
              <text 
                x={GRAPH_WIDTH / 2} 
                y={30} 
                fontSize="14" 
                fill="#ff6b6b"
                textAnchor="middle"
                fontWeight="bold"
              >
                {effectiveQ === 0 ? `Infinite surprise on heads ⇒ infinite ${entropy ? "entropy" : "cross-entropy"}` : `Infinite surprise on tails ⇒ infinite ${entropy ? "entropy" : "cross-entropy"}`}
              </text>
            ) : (
              <>
                {/* Cross-entropy line */}
                <line 
                  x1={0} 
                  y1={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (crossEntropy / maxSurprise) * USABLE_GRAPH_HEIGHT} 
                  x2={GRAPH_WIDTH} 
                  y2={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (crossEntropy / maxSurprise) * USABLE_GRAPH_HEIGHT}
                  stroke="#ff6b6b" 
                  strokeWidth="2" 
                  strokeDasharray="5,5"
                />
                <text 
                  x={GRAPH_WIDTH - 120} 
                  y={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (crossEntropy / maxSurprise) * USABLE_GRAPH_HEIGHT - 5} 
                  fontSize="12" 
                  fill="#ff6b6b"
                >
                  {entropy ? "Entropy" : "Cross-entropy"}: {crossEntropy.toFixed(2)}
                </text>
                
                {/* Heads surprisal line */}
                {(() => {
                  const headsSurprise = calculateSurprise(true);
                  if (headsSurprise <= maxSurprise) {
                    return (
                      <>
                        <line 
                          x1={0} 
                          y1={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (headsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT} 
                          x2={GRAPH_WIDTH} 
                          y2={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (headsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT}
                          stroke="#4CAF50" 
                          strokeWidth="1" 
                          strokeDasharray="3,3"
                        />
                        <text 
                          x={GRAPH_WIDTH - 120} 
                          y={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (headsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT - 5} 
                          fontSize="12" 
                          fill="#4CAF50"
                        >
                          Heads: {headsSurprise.toFixed(2)}
                        </text>
                      </>
                    );
                  }
                  return null;
                })()}
                
                {/* Tails surprisal line */}
                {(() => {
                  const tailsSurprise = calculateSurprise(false);
                  if (tailsSurprise <= maxSurprise) {
                    return (
                      <>
                        <line 
                          x1={0} 
                          y1={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (tailsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT} 
                          x2={GRAPH_WIDTH} 
                          y2={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (tailsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT}
                          stroke="#2196F3" 
                          strokeWidth="1" 
                          strokeDasharray="3,3"
                        />
                        <text 
                          x={GRAPH_WIDTH - 120} 
                          y={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - (tailsSurprise / maxSurprise) * USABLE_GRAPH_HEIGHT - 5} 
                          fontSize="12" 
                          fill="#2196F3"
                        >
                          Tails: {tailsSurprise.toFixed(2)}
                        </text>
                      </>
                    );
                  }
                  return null;
                })()}
              </>
            )}
            
            {/* Center vertical line */}
            <line 
              x1={GRAPH_WIDTH / 2} 
              y1={0} 
              x2={GRAPH_WIDTH / 2} 
              y2={GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM}
              stroke="#ccc" 
              strokeWidth="1" 
              strokeDasharray="2,2"
            />
          </svg>
          
          {/* Bottom canvas coins */}
          {bottomCoins.map(coin => {
            return (
              <div
                key={`bottom-${coin.id}`}
                className="absolute"
                style={{
                  left: `${(coin.x / GRAPH_WIDTH) * 100}%`,
                  top: coin.y - (BOTTOM_COIN_SIZE / 2) - COIN_VERTICAL_OFFSET,
                  width: BOTTOM_COIN_SIZE,
                  height: BOTTOM_COIN_SIZE,
                  transform: 'translateX(-50%)',
                }}
              >
                <img 
                  src={getAssetPath(coin.isHeads ? "/images/coin_heads_small.png" : "/images/coin_tail_small.png")}
                  alt={coin.isHeads ? "Heads" : "Tails"}
                  className="w-full h-full object-contain"
                />
              </div>
            );
          })}
        </div>
        
        {/* Explanation text */}
        <div className="widget-explanation">
          {entropy 
            ? (
              <>
                Heads/Tails lines show the corresponding surprise according to <KatexMath math="p" />. Entropy is the average surprise.<br/>
                <KatexMath math="H(p) = p(\text{heads}) \log \frac{1}{p(\text{heads})} + p(\text{tails}) \log \frac{1}{p(\text{tails})}" />
              </>
            )
            : (
              <>
                Heads/Tails lines show the corresponding surprise according to <KatexMath math="q" />. Cross-entropy is the average surprise.<br/>
                <KatexMath math="H(p,q) = p(\text{heads}) \log \frac{1}{q(\text{heads})} + p(\text{tails}) \log \frac{1}{q(\text{tails})}" />
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}