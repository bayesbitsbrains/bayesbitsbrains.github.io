"use client";

import React, { useState, useEffect } from 'react';

interface Snapshot {
  id: number;
  first_sentence: string;
  second_sentence: string;
  cut_position: number;
  context: string;
  target_letter: string;
  remaining: string;
}

interface GameState {
  snapshot: Snapshot | null;
  userGuesses: string[];
  attempts: number;
  completed: boolean;
  score: number;
}

interface LLMScore {
  model: string;
  avg_cross_entropy: number;
  avg_optimistic: number;
  median_cross_entropy: number;
  median_optimistic: number;
}

interface LLMDetailedScore {
  snapshot_id: number;
  guesses: string[];
  optimistic_bits: number;
  target_position?: number;
  top_10_probs?: Record<string, number>;
}

const LetterPredictionWidget: React.FC = () => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [llmScores, setLlmScores] = useState<Record<string, LLMScore>>({});
  const [llmDetailedScores, setLlmDetailedScores] = useState<Record<string, LLMDetailedScore[]>>({});
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [usedSnapshotIds, setUsedSnapshotIds] = useState<Set<number>>(new Set());

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load snapshots - use appropriate path for dev/prod
        const basePath = process.env.NODE_ENV === 'production' ? '/problens-web' : '';
        const snapshotResponse = await fetch(`${basePath}/data/prediction_snapshots.json`);
        const snapshotData = await snapshotResponse.json();
        setSnapshots(snapshotData.snapshots);

        // Load LLM intelligence test scores
        try {
          const llmResponse = await fetch(`${basePath}/data/intelligence_test/letter_eval_results.json`);
          const llmData = await llmResponse.json();
          
          // Convert the data structure to match our interface
          const convertedScores: Record<string, LLMScore> = {};
          Object.entries(llmData.models).forEach(([modelKey, modelData]: [string, any]) => {
            convertedScores[modelKey] = {
              model: modelData.model,
              avg_cross_entropy: 0, // Not used in new data
              avg_optimistic: modelData.mean_bits,
              median_cross_entropy: 0, // Not used in new data
              median_optimistic: modelData.median_bits
            };
          });
          
          setLlmScores(convertedScores);
          
          // Load detailed scores for per-snapshot comparisons
          const detailedScores: Record<string, LLMDetailedScore[]> = {};
          for (const modelKey of Object.keys(convertedScores)) {
            try {
              const detailResponse = await fetch(`${basePath}/data/intelligence_test/details_${modelKey.replace('/', '_')}.json`);
              const detailData = await detailResponse.json();
              detailedScores[modelKey] = detailData;
            } catch (e) {
              console.error(`Error loading detailed scores for ${modelKey}:`, e);
            }
          }
          setLlmDetailedScores(detailedScores);
          
          console.log('Loaded LLM scores:', convertedScores);
          console.log('Loaded detailed scores:', detailedScores);
        } catch (e) {
          console.error('Error loading LLM scores:', e);
          // Fallback data based on your actual results
          setLlmScores({
            'gpt2': {
              model: 'gpt2',
              avg_cross_entropy: 0,
              avg_optimistic: 0.466, // From your data
              median_cross_entropy: 0,
              median_optimistic: 0.0
            },
            'meta-llama/Llama-4-Scout-17B-16E': {
              model: 'meta-llama/Llama-4-Scout-17B-16E',
              avg_cross_entropy: 0,
              avg_optimistic: 0.343, // From your data
              median_cross_entropy: 0,
              median_optimistic: 0.0
            }
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const isGPT2FirstTry = (snapshotId: number): boolean => {
    const gpt2Data = llmDetailedScores['gpt2'];
    if (!gpt2Data) return false;
    
    const scoreData = gpt2Data.find(score => score.snapshot_id === snapshotId);
    if (!scoreData) return false;
    
    // First try means target_position is 1 (1-based indexing)
    return scoreData.target_position === 1;
  };

  const startNewGame = () => {
    if (snapshots.length === 0) return;
    
    // Hotfix: Exclude snapshots with IDs 506, 422, 476, 280, 487, 838, 835, 720, 546, 827, 789, 308, 153, 163, 399, 590, 875, 856, 79, 218, 201
    const excludedIds = [506, 422, 476, 280, 487, 838, 835, 720, 546, 827, 789, 308, 153, 163, 399, 590, 875, 856, 79, 218, 201];
    const validSnapshots = snapshots.filter(s => 
      !excludedIds.includes(s.id) && !usedSnapshotIds.has(s.id)
    );
    
    // If we've used all valid snapshots, reset the used set
    if (validSnapshots.length === 0) {
      setUsedSnapshotIds(new Set());
      // Try again with reset set
      const freshValidSnapshots = snapshots.filter(s => !excludedIds.includes(s.id));
      if (freshValidSnapshots.length === 0) return;
      
      const selectedSnapshot = selectWeightedSnapshot(freshValidSnapshots);
      setUsedSnapshotIds(new Set([selectedSnapshot.id]));
      
      const newGame: GameState = {
        snapshot: selectedSnapshot,
        userGuesses: [],
        attempts: 0,
        completed: false,
        score: 0
      };

      setGameStates([...gameStates, newGame]);
      setCurrentInput('');
      return;
    }
    
    // Select weighted snapshot from valid ones
    const selectedSnapshot = selectWeightedSnapshot(validSnapshots);
    
    // Add to used set
    setUsedSnapshotIds(prev => new Set([...prev, selectedSnapshot.id]));
    
    const newGame: GameState = {
      snapshot: selectedSnapshot,
      userGuesses: [],
      attempts: 0,
      completed: false,
      score: 0
    };

    setGameStates([...gameStates, newGame]);
    setCurrentInput('');
  };

  const selectWeightedSnapshot = (snapshots: Snapshot[]): Snapshot => {
    // Separate easy (GPT2 first try) and hard snapshots
    const easySnapshots = snapshots.filter(s => isGPT2FirstTry(s.id));
    const hardSnapshots = snapshots.filter(s => !isGPT2FirstTry(s.id));
    
    // With 50% probability, sample from easy snapshots, otherwise from hard ones
    // This reduces the frequency of easy snapshots since they're naturally more common
    const useEasy = Math.random() < 0.5;
    
    if (useEasy && easySnapshots.length > 0) {
      return easySnapshots[Math.floor(Math.random() * easySnapshots.length)];
    } else if (hardSnapshots.length > 0) {
      return hardSnapshots[Math.floor(Math.random() * hardSnapshots.length)];
    } else {
      // Fallback to any available snapshot
      return snapshots[Math.floor(Math.random() * snapshots.length)];
    }
  };

  const saveGameResult = (game: GameState, gaveUp: boolean = false) => {
    if (!game.snapshot) return;
    
    const result = {
      timestamp: new Date().toISOString(),
      snapshot_id: game.snapshot.id,
      target_letter: game.snapshot.target_letter,
      user_guesses: game.userGuesses,
      attempts: game.attempts,
      score: game.score,
      gave_up: gaveUp,
      first_sentence: game.snapshot.first_sentence,
      context: game.snapshot.context
    };
    
    // Save to localStorage
    try {
      const existingData = localStorage.getItem('letter-prediction-results');
      const results = existingData ? JSON.parse(existingData) : [];
      results.push(result);
      localStorage.setItem('letter-prediction-results', JSON.stringify(results));
      
      console.log('Game result saved:', result);
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  };

  const makeGuess = (gameIndex: number, letter: string) => {
    const game = gameStates[gameIndex];
    if (!game.snapshot || game.completed) return;

    const normalizedLetter = letter.toLowerCase();
    const normalizedTarget = game.snapshot.target_letter.toLowerCase();
    
    const newAttempts = game.attempts + 1;
    const newGuesses = [...game.userGuesses, normalizedLetter];
    
    if (normalizedLetter === normalizedTarget) {
      // Correct guess!
      const score = Math.log2(newAttempts);
      const updatedGame = {
        ...game,
        userGuesses: newGuesses,
        attempts: newAttempts,
        completed: true,
        score: score
      };
      
      const newGameStates = [...gameStates];
      newGameStates[gameIndex] = updatedGame;
      setGameStates(newGameStates);
      
      // Save the completed game
      saveGameResult(updatedGame, false);
    } else {
      // Wrong guess
      const updatedGame = {
        ...game,
        userGuesses: newGuesses,
        attempts: newAttempts
      };
      
      const newGameStates = [...gameStates];
      newGameStates[gameIndex] = updatedGame;
      setGameStates(newGameStates);
    }
    
    setCurrentInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, gameIndex: number) => {
    if (e.key === 'Enter' && currentInput.length === 1) {
      makeGuess(gameIndex, currentInput);
    }
  };

  const calculateUserAverage = () => {
    const completedGames = gameStates.filter(g => g.completed);
    if (completedGames.length === 0) return 0;
    return completedGames.reduce((sum, g) => sum + g.score, 0) / completedGames.length;
  };

  const calculateLLMAverage = (modelKey: string) => {
    const completedGames = gameStates.filter(g => g.completed);
    if (completedGames.length === 0) return llmScores[modelKey]?.avg_optimistic || 0;
    
    const detailedData = llmDetailedScores[modelKey];
    if (!detailedData) return llmScores[modelKey]?.avg_optimistic || 0;
    
    // Calculate average of LLM scores for the specific snapshots user has played
    const llmScoresForUserGames = completedGames.map(game => {
      const snapshotId = game.snapshot?.id;
      const matchingScore = detailedData.find(score => score.snapshot_id === snapshotId);
      return matchingScore ? matchingScore.optimistic_bits : llmScores[modelKey]?.avg_optimistic || 0;
    });
    
    return llmScoresForUserGames.reduce((sum, score) => sum + score, 0) / llmScoresForUserGames.length;
  };

  const getModelComparison = () => {
    const userAvg = calculateUserAverage();
    const comparisons = Object.entries(llmScores).map(([modelName, scores]) => ({
      model: modelName,
      userScore: userAvg,
      llmOptimistic: scores.avg_optimistic,
      difference: userAvg - scores.avg_optimistic,
      betterThan: userAvg < scores.avg_optimistic
    }));
    
    return comparisons.sort((a, b) => a.llmOptimistic - b.llmOptimistic);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center">Loading prediction data...</div>
      </div>
    );
  }

  const currentGame = gameStates.length > 0 ? gameStates[gameStates.length - 1] : null;
  const completedGames = gameStates.filter(g => g.completed);
  const canShowResults = completedGames.length >= 1;

  return (
    <div className="p-6 bg-gray-50 rounded-lg space-y-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800 text-center">
        Human vs LLM: Next Letter Prediction
      </h3>
      
      <p className="text-sm text-gray-600 text-center">
        Predict the next letter (the answer is one of 26 English letters, case-insensitive)
      </p>

      {/* Game Controls */}
      {gameStates.length === 0 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={startNewGame}
            disabled={snapshots.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Current Game */}
      {currentGame && currentGame.snapshot && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="space-y-4">
            {/* Context Display */}
            <div className="text-lg">
              <span className="text-gray-700">
                {currentGame.snapshot.first_sentence}. {currentGame.snapshot.context}
              </span>
              <span className="bg-yellow-200 px-1 rounded">_</span>
              {currentGame.completed && (
                <>
                  <span className="bg-green-200 px-1 rounded font-semibold">
                    {currentGame.snapshot.target_letter}
                  </span>
                  <span className="text-gray-700">
                    {currentGame.snapshot.remaining}.
                  </span>
                </>
              )}
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-gray-400">
              Snapshot ID: {currentGame.snapshot.id}
            </div>

            {/* Game Input */}
            {!currentGame.completed && (
              <div className="space-y-2">
                <div className="flex gap-2 items-center justify-center">
                  <input
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value.slice(-1))}
                    onKeyPress={(e) => handleKeyPress(e, gameStates.length - 1)}
                    placeholder="?"
                    className="w-16 px-2 py-1 border rounded text-center font-mono text-lg"
                    maxLength={1}
                  />
                  <button
                    onClick={() => makeGuess(gameStates.length - 1, currentInput)}
                    disabled={currentInput.length !== 1}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    Guess
                  </button>
                  <button
                    onClick={() => {
                      // Give up - treat as if they guessed correctly on 26th attempt
                      const game = gameStates[gameStates.length - 1];
                      if (game && !game.completed) {
                        const score = Math.log2(26);
                        const updatedGame = {
                          ...game,
                          attempts: 26,
                          completed: true,
                          score: score
                        };
                        
                        const newGameStates = [...gameStates];
                        newGameStates[gameStates.length - 1] = updatedGame;
                        setGameStates(newGameStates);
                        setCurrentInput('');
                        
                        // Save the gave up result
                        saveGameResult(updatedGame, true);
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Give up
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 text-center">
                  Attempts: {new Set(currentGame.userGuesses).size}
                  {currentGame.userGuesses.length > 0 && (
                    <span className="ml-4">
                      Previous guesses: {[...new Set(currentGame.userGuesses)].join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Game Result */}
            {currentGame.completed && (
              <div className="space-y-3">
                <div className={`p-3 rounded border ${currentGame.attempts === 26 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className={currentGame.attempts === 26 ? 'text-red-800' : 'text-green-800'}>
                    {currentGame.attempts === 26 
                      ? `✗ You gave up! The letter was '${currentGame.snapshot.target_letter}'.`
                      : `✓ Correct! You found '${currentGame.snapshot.target_letter}' in ${currentGame.attempts} attempts.`
                    }
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={startNewGame}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Comparison */}
      {completedGames.length > 0 && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h4 className="font-semibold">Performance Comparison</h4>
          
          {/* Number of Guesses */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Number of guesses in this round (log scale)</div>
            <div className="relative h-8">
              {/* Line */}
              <div className="absolute w-full h-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2"></div>
              
              {/* Tick marks for log scale */}
              {[1, 2, 4, 8, 16, 26].map((value) => {
                const logPosition = Math.log(value) / Math.log(26) * 100;
                return (
                  <div
                    key={value}
                    className="absolute top-1/2 transform -translate-y-1/2"
                    style={{ left: `${Math.min(95, logPosition)}%` }}
                  >
                    <div className="w-0.5 h-2 bg-gray-400"></div>
                  </div>
                );
              })}
              
              {(() => {
                const lastGame = completedGames[completedGames.length - 1];
                
                // Collect all emojis with their positions
                const allEmojis: Array<{
                  type: string;
                  model?: string;
                  position: number;
                  attempts: number;
                  emoji: string;
                  guesses: string[];
                  targetPosition?: number;
                }> = [];
                
                // User emoji
                const userAttempts = lastGame.attempts;
                const userPosition = Math.min(95, (Math.log(userAttempts) / Math.log(26)) * 100);
                allEmojis.push({
                  type: 'user',
                  position: userPosition,
                  attempts: userAttempts,
                  emoji: '👤',
                  guesses: [...new Set(lastGame.userGuesses)]
                });
                
                // AI emojis
                Object.entries(llmScores).forEach(([model, scores]) => {
                  const emoji = model.includes('gpt') ? '🤖' : '🦙';
                  const detailedData = llmDetailedScores[model];
                  let llmAttempts = 1;
                  let llmGuesses: string[] = [];
                  
                  if (detailedData && lastGame.snapshot) {
                    const matchingScore = detailedData.find(score => score.snapshot_id === lastGame.snapshot!.id);
                    if (matchingScore) {
                      // Use target_position if available, otherwise use length
                      // target_position appears to be 1-based already
                      llmAttempts = matchingScore.target_position !== undefined 
                        ? matchingScore.target_position
                        : matchingScore.guesses.length;
                      llmGuesses = matchingScore.guesses;
                      
                      // Debug logging
                      console.log(`${model} for snapshot ${lastGame.snapshot.id}:`);
                      console.log(`  target_position: ${matchingScore.target_position}`);
                      console.log(`  attempts: ${llmAttempts}`);
                      console.log(`  guesses: [${matchingScore.guesses.join(', ')}]`);
                      console.log(`  target_letter: ${lastGame.snapshot.target_letter}`);
                    }
                  }
                  
                  const position = Math.min(95, (Math.log(llmAttempts) / Math.log(26)) * 100);
                  const targetPosition = detailedData && lastGame.snapshot ? 
                    detailedData.find(score => score.snapshot_id === lastGame.snapshot!.id)?.target_position : undefined;
                  // Convert from 1-based to 0-based for array indexing
                  const targetIndex = targetPosition !== undefined ? targetPosition - 1 : undefined;
                  
                  allEmojis.push({
                    type: 'ai',
                    model: model,
                    position: position,
                    attempts: llmAttempts,
                    emoji: emoji,
                    guesses: llmGuesses,
                    targetPosition: targetIndex
                  });
                });
                
                // Group by similar positions (within 2% tolerance)
                const groups: typeof allEmojis[] = [];
                allEmojis.forEach(emoji => {
                  const existingGroup = groups.find(group => 
                    Math.abs(group[0].position - emoji.position) < 2
                  );
                  if (existingGroup) {
                    existingGroup.push(emoji);
                  } else {
                    groups.push([emoji]);
                  }
                });
                
                // Render emojis with vertical offsets for overlapping ones
                return groups.flatMap(group => {
                  const groupSize = group.length;
                  return group.map((emoji: any, index: number) => {
                    let verticalOffset = 0;
                    if (groupSize === 2) {
                      verticalOffset = index === 0 ? -8 : 8; // ±8px for 2 emojis
                    } else if (groupSize === 3) {
                      verticalOffset = index === 0 ? -12 : index === 1 ? 0 : 12; // -12, 0, +12px for 3 emojis
                    }
                    
                    const displayName = emoji.model === 'meta-llama/Llama-4-Scout-17B-16E' ? 'Llama-4-Scout' : emoji.model;
                    
                    return (
                      <div
                        key={`${emoji.type}-${emoji.model || 'user'}`}
                        className="absolute text-2xl transform -translate-x-1/2 group cursor-pointer"
                        style={{
                          left: `${emoji.position}%`,
                          top: `50%`,
                          transform: `translate(-50%, calc(-50% + ${verticalOffset}px))`
                        }}
                      >
                        {emoji.emoji}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                            <div className="font-semibold">
                              {emoji.emoji} {emoji.type === 'user' ? 'You' : displayName}
                            </div>
                            <div>{emoji.attempts} guess{emoji.attempts !== 1 ? 'es' : ''}</div>
                            {emoji.guesses.length > 0 && (
                              <div className="text-gray-300 mt-1">
                                Guesses: {emoji.guesses.map((guess: string, idx: number) => {
                                  // For AI: highlight based on target_position
                                  // For user: highlight the correct letter
                                  const shouldHighlight = emoji.type === 'ai' 
                                    ? (emoji.targetPosition !== undefined && idx === emoji.targetPosition)
                                    : (lastGame.snapshot && guess.toLowerCase() === lastGame.snapshot.target_letter.toLowerCase());
                                  
                                  if (shouldHighlight) {
                                    return <span key={idx} className="font-bold text-white">{guess}</span>;
                                  }
                                  return <span key={idx}>{guess}</span>;
                                }).reduce((prev: any, curr: any, idx: number) => {
                                  if (idx === 0) return [curr];
                                  return [...prev, ', ', curr];
                                }, [])}
                                {emoji.guesses.length >= 10 && ', ...'}
                              </div>
                            )}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                });
              })()}
            </div>
            <div className="flex text-xs text-gray-500 mt-1" style={{ position: 'relative' }}>
              {[1, 2, 4, 8, 16, 26].map((value) => {
                const logPosition = Math.log(value) / Math.log(26) * 100;
                return (
                  <span
                    key={value}
                    className="absolute transform -translate-x-1/2"
                    style={{ left: `${Math.min(95, logPosition)}%` }}
                  >
                    {value}
                  </span>
                );
              })}
            </div>
          </div>
          
          {/* Overall Score */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Overall score thus far (score = ∑ log(number of guesses))</div>
            <div className="relative h-8">
              {/* Line */}
              <div className="absolute w-full h-0.5 bg-gray-300 top-1/2 transform -translate-y-1/2"></div>
              
              {/* Tick marks */}
              {[0, 1, 2, 3, 4, Math.log2(26)].map((value) => {
                const position = (value / Math.log2(26)) * 100;
                return (
                  <div
                    key={value}
                    className="absolute top-1/2 transform -translate-y-1/2"
                    style={{ left: `${Math.min(95, position)}%` }}
                  >
                    <div className="w-0.5 h-2 bg-gray-400"></div>
                  </div>
                );
              })}
              
              {/* User emoji */}
              <div 
                className="absolute text-2xl top-1/2 transform -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                style={{
                  left: `${Math.min(95, (calculateUserAverage() / Math.log2(26)) * 100)}%`
                }}
              >
                👤
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    <div className="font-semibold">👤 You</div>
                    <div className="text-yellow-300">{calculateUserAverage().toFixed(3)} bits</div>
                    <div className="text-gray-300 mt-1">
                      Average of {completedGames.length} game{completedGames.length !== 1 ? 's' : ''}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI emojis */}
              {Object.entries(llmScores).map(([model, scores]) => {
                const llmAvg = calculateLLMAverage(model);
                const emoji = model.includes('gpt') ? '🤖' : '🦙';
                const displayName = model === 'meta-llama/Llama-4-Scout-17B-16E' ? 'Llama-4-Scout' : model;
                return (
                  <div
                    key={model}
                    className="absolute text-2xl top-1/2 transform -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                    style={{
                      left: `${Math.min(95, (llmAvg / Math.log2(26)) * 100)}%`
                    }}
                  >
                    {emoji}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold">{emoji} {displayName}</div>
                        <div className="text-yellow-300">{llmAvg.toFixed(3)} bits</div>
                        <div className="text-gray-300 mt-1">
                          On same {completedGames.length} game{completedGames.length !== 1 ? 's' : ''}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex text-xs text-gray-500 mt-1" style={{ position: 'relative' }}>
              {[0, 1, 2, 3, 4].map((value) => {
                const position = (value / Math.log2(26)) * 100;
                return (
                  <span
                    key={value}
                    className="absolute transform -translate-x-1/2"
                    style={{ left: `${Math.min(95, position)}%` }}
                  >
                    {value} bit{value !== 1 ? 's' : ''}
                  </span>
                );
              })}
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Games played: {gameStates.length} | Completed: {completedGames.length}
          </div>
        </div>
      )}

    </div>
  );
};

export default LetterPredictionWidget;