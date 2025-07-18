'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface TreeNode {
  id: string;
  letter?: string;
  code?: string;
  x: number;
  y: number;
  level: number;
  position: number; // position in level (0-based)
  hasChildren?: boolean;
}

interface DraggableLetterProps {
  letter: string;
  onDragStart: (letter: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const DraggableLetter: React.FC<DraggableLetterProps> = ({ letter, onDragStart, onDragEnd, isDragging }) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(letter)}
      onDragEnd={onDragEnd}
      className={`inline-block w-10 h-10 bg-blue-100 border-2 border-blue-300 rounded-md flex items-center justify-center font-mono font-bold text-lg cursor-move hover:bg-blue-200 transition-colors mr-2 mb-2 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {letter}
    </div>
  );
};

const BuildYourOwnCodeWidget: React.FC = () => {
  const [inputText, setInputText] = useState('AACATACG');
  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState('AACATACG');
  const [treeLayers, setTreeLayers] = useState(4);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [testText, setTestText] = useState('AACATACG');
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [codedText, setCodedText] = useState('');
  const [currentTestPosition, setCurrentTestPosition] = useState(0);
  const [averageBitsPerLetter, setAverageBitsPerLetter] = useState<number | null>(null);
  const [hoveredLetterIndex, setHoveredLetterIndex] = useState<number | null>(null);
  const [hoveredBitIndices, setHoveredBitIndices] = useState<Set<number>>(new Set());
  const [letterToCodeMapping, setLetterToCodeMapping] = useState<Array<{start: number, end: number, letterIndex: number}>>([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device
  useEffect(() => {
    const coarse = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    setIsTouchDevice(
      coarse || (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0))
    );
  }, []);

  // Get unique letters from input text
  const uniqueLetters = useMemo(() => {
    return [...new Set(inputText.split(''))].sort();
  }, [inputText]);

  // Get available letters (not yet placed in tree)
  const availableLetters = useMemo(() => {
    const placedLetters = new Set(treeNodes.filter(node => node.letter).map(node => node.letter));
    return uniqueLetters.filter(letter => !placedLetters.has(letter));
  }, [uniqueLetters, treeNodes]);

  // Generate tree structure based on number of layers
  const generateTreeStructure = useCallback((layers: number): TreeNode[] => {
    const nodes: TreeNode[] = [];
    const canvasWidth = 600;
    const canvasHeight = 400;
    const nodeSize = 40;
    
    for (let level = 0; level < layers; level++) {
      const nodesInLevel = Math.pow(2, level);
      const levelY = 50 + (level * (canvasHeight - 100) / (layers - 1));
      
      for (let pos = 0; pos < nodesInLevel; pos++) {
        const levelX = (canvasWidth - nodeSize) / (nodesInLevel + 1) * (pos + 1) + nodeSize / 2;
        
        const nodeId = `${level}-${pos}`;
        const hasChildren = level < layers - 1;
        
        // Calculate binary code based on path from root
        let code = '';
        let tempPos = pos;
        for (let l = level; l > 0; l--) {
          code = (tempPos % 2).toString() + code;
          tempPos = Math.floor(tempPos / 2);
        }
        
        nodes.push({
          id: nodeId,
          x: levelX,
          y: levelY,
          level,
          position: pos,
          code,
          hasChildren
        });
      }
    }
    
    return nodes;
  }, []);

  // Initialize tree when layers change
  useEffect(() => {
    const newNodes = generateTreeStructure(treeLayers);
    setTreeNodes(prevNodes => {
      // Preserve existing letter assignments
      const letterMap = new Map(prevNodes.map(node => [node.id, node.letter]));
      return newNodes.map(node => ({
        ...node,
        letter: letterMap.get(node.id)
      }));
    });
  }, [treeLayers, generateTreeStructure]);

  // Update test text when input text changes
  useEffect(() => {
    setTestText(inputText);
  }, [inputText]);

  const handleTextEdit = () => {
    if (isEditingText) {
      setInputText(tempText);
      setIsEditingText(false);
    } else {
      setTempText(inputText);
      setIsEditingText(true);
    }
  };

  const handleToggleLayer = () => {
    if (treeLayers === 4) {
      setTreeLayers(5);
    } else if (treeLayers === 5) {
      setTreeLayers(4);
    }
  };

  const handleDragStart = (letter: string) => {
    setDraggedLetter(letter);
  };

  const handleDragEnd = () => {
    // Reset dragged letter when drag ends (whether dropped on valid target or not)
    setDraggedLetter(null);
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    if (!draggedLetter) return;

    assignLetterToNode(draggedLetter, nodeId);
    setDraggedLetter(null);
  };

  // Shared function to assign letter to node (used by both drag and click interactions)
  const assignLetterToNode = (letter: string, nodeId: string) => {
    const targetNode = treeNodes.find(node => node.id === nodeId);
    if (!targetNode) return;

    setTreeNodes(prevNodes => {
      const newNodes = [...prevNodes];
      
      // Remove any existing assignment of this letter
      newNodes.forEach(node => {
        if (node.letter === letter) {
          node.letter = undefined;
        }
      });
      
      // Assign letter to target node
      const targetIndex = newNodes.findIndex(node => node.id === nodeId);
      if (targetIndex !== -1) {
        newNodes[targetIndex] = { ...newNodes[targetIndex], letter: letter };
        
        // Grey out children nodes
        const targetLevel = newNodes[targetIndex].level;
        const targetPosition = newNodes[targetIndex].position;
        
        // Clear any letters from child nodes
        newNodes.forEach((node, index) => {
          if (node.level > targetLevel) {
            const ancestorPosition = Math.floor(node.position / Math.pow(2, node.level - targetLevel));
            if (ancestorPosition === targetPosition) {
              if (node.letter) {
                // Return letter to available pool by clearing it
                newNodes[index] = { ...node, letter: undefined };
              }
            }
          }
        });
      }
      
      return newNodes;
    });
  };

  // Mobile interaction handlers
  const handleLetterClick = (letter: string) => {
    if (isTouchDevice) {
      setSelectedLetter(selectedLetter === letter ? null : letter);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (isTouchDevice && selectedLetter) {
      const targetNode = treeNodes.find(node => node.id === nodeId);
      if (targetNode && !isNodeGreyedOut(targetNode)) {
        assignLetterToNode(selectedLetter, nodeId);
        setSelectedLetter(null);
      }
    }
  };

  const isAllLettersPlaced = useMemo(() => {
    return availableLetters.length === 0;
  }, [availableLetters]);

  const getCodeForLetter = (letter: string): string | null => {
    const node = treeNodes.find(node => node.letter === letter);
    return node?.code || null;
  };

  const handleTestCode = async () => {
    if (!isAllLettersPlaced) return;
    
    // Check if all letters in test text have codes
    const testLetters = [...new Set(testText.split(''))];
    const missingLetters = testLetters.filter(letter => !getCodeForLetter(letter));
    
    if (missingLetters.length > 0) {
      setCodeError(`Incomplete code! Missing codes for: ${missingLetters.join(', ')}`);
      return;
    }
    
    setCodeError(null);
    setIsTestingCode(true);
    setCodedText('');
    setCurrentTestPosition(0);
    setLetterToCodeMapping([]);
    
    let totalBits = 0;
    let currentCode = '';
    const newMapping: Array<{start: number, end: number, letterIndex: number}> = [];
    
    for (let i = 0; i < testText.length; i++) {
      setCurrentTestPosition(i);
      
      const letter = testText[i];
      const code = getCodeForLetter(letter);
      
      if (code) {
        const startIndex = currentCode.length;
        currentCode += code;
        const endIndex = currentCode.length;
        totalBits += code.length;
        
        // Store mapping for hover functionality
        newMapping.push({ start: startIndex, end: endIndex, letterIndex: i });
      }
      
      setCodedText(currentCode);
      setLetterToCodeMapping([...newMapping]);
      setAverageBitsPerLetter(totalBits / (i + 1));
      
      // Add delay for animation
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setCurrentTestPosition(-1);
    setIsTestingCode(false);
  };

  const resetAll = () => {
    // Reset tree structure to default 4 layers
    setTreeLayers(4);
    const newNodes = generateTreeStructure(4);
    setTreeNodes(newNodes);
    
    // Reset all other state
    setCodedText('');
    setLetterToCodeMapping([]);
    setAverageBitsPerLetter(null);
    setCurrentTestPosition(0);
    setIsTestingCode(false);
    setHoveredLetterIndex(null);
    setHoveredBitIndices(new Set());
    setCodeError(null);
  };

  const resetLetters = () => {
    // Only reset letter assignments, keep tree structure
    setTreeNodes(prevNodes => 
      prevNodes.map(node => ({ ...node, letter: undefined }))
    );
    
    // Clear related state
    setCodedText('');
    setLetterToCodeMapping([]);
    setAverageBitsPerLetter(null);
    setCodeError(null);
    setHoveredLetterIndex(null);
    setHoveredBitIndices(new Set());
  };

  const handleLetterHover = (index: number | null) => {
    setHoveredLetterIndex(index);
    if (index === null) {
      setHoveredBitIndices(new Set());
    } else {
      // Find corresponding bits
      const bitIndices = new Set<number>();
      letterToCodeMapping.forEach(mapping => {
        if (mapping.letterIndex === index) {
          for (let i = mapping.start; i < mapping.end; i++) {
            bitIndices.add(i);
          }
        }
      });
      setHoveredBitIndices(bitIndices);
    }
  };

  const handleBitHover = (bitIndex: number | null) => {
    if (bitIndex === null) {
      setHoveredLetterIndex(null);
      setHoveredBitIndices(new Set());
    } else {
      // Find which letter this bit belongs to
      const mapping = letterToCodeMapping.find(m => bitIndex >= m.start && bitIndex < m.end);
      if (mapping) {
        setHoveredLetterIndex(mapping.letterIndex);
        // Highlight all bits for this letter
        const bitIndices = new Set<number>();
        for (let i = mapping.start; i < mapping.end; i++) {
          bitIndices.add(i);
        }
        setHoveredBitIndices(bitIndices);
      }
    }
  };

  const isNodeGreyedOut = (node: TreeNode): boolean => {
    // Check if any ancestor has a letter
    for (let level = 0; level < node.level; level++) {
      const ancestorPosition = Math.floor(node.position / Math.pow(2, node.level - level));
      const ancestor = treeNodes.find(n => n.level === level && n.position === ancestorPosition);
      if (ancestor && ancestor.letter) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-6 bg-white border rounded-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-medium">Text:</span>
          {isEditingText ? (
            <input
              type="text"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextEdit();
                if (e.key === 'Escape') {
                  setIsEditingText(false);
                  setTempText(inputText);
                }
              }}
              autoFocus
            />
          ) : (
            <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded">{inputText}</span>
          )}
          <button
            onClick={handleTextEdit}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
          >
            {isEditingText ? 'Save' : 'Edit'}
          </button>
        </div>

      </div>

      <div className="mb-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Binary Tree ({treeLayers} layers)</h3>
          <div className="flex gap-2">
            <button
              onClick={handleToggleLayer}
              className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              {treeLayers === 4 ? 'Add Layer' : 'Remove Layer'}
            </button>
            <button
              onClick={resetLetters}
              className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              Reset Letters
            </button>
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-2 sm:p-4">
          <div className="flex justify-center">
            <svg width="100%" height="auto" viewBox="0 0 600 400" className="w-full max-w-2xl">
            {/* Draw tree connections */}
            {treeNodes.map(node => {
              if (node.level === 0) return null;
              
              const parentLevel = node.level - 1;
              const parentPosition = Math.floor(node.position / 2);
              const parent = treeNodes.find(n => n.level === parentLevel && n.position === parentPosition);
              
              if (!parent) return null;
              
              // Determine if this is a 0 or 1 edge (even position = 0, odd position = 1)
              const edgeLabel = node.position % 2 === 0 ? '0' : '1';
              const shouldShowLabel = node.level <= 2; // Only show labels for first two layers
              
              // Calculate midpoint for label placement
              const midX = (parent.x + node.x) / 2;
              const midY = (parent.y + node.y) / 2;
              
              return (
                <g key={`connection-${node.id}`}>
                  <line
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#666"
                    strokeWidth="2"
                  />
                  {shouldShowLabel && (
                    <text
                      x={midX}
                      y={midY - 8}
                      textAnchor="middle"
                      className="text-sm font-mono font-bold"
                      fill="#333"
                    >
                      {edgeLabel}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Draw tree nodes */}
            {treeNodes.map(node => {
              const isGreyed = isNodeGreyedOut(node);
              
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    fill={node.letter ? '#10B981' : isGreyed ? '#D1D5DB' : '#E5E7EB'}
                    stroke={node.letter ? '#059669' : isGreyed ? '#9CA3AF' : '#6B7280'}
                    strokeWidth="2"
                    className={!isGreyed && !node.letter ? 'cursor-pointer hover:fill-blue-100' : ''}
                    onDragOver={(e) => !isGreyed && !isTouchDevice && handleDragOver(e, node.id)}
                    onDrop={(e) => !isGreyed && !isTouchDevice && handleDrop(e, node.id)}
                    onClick={() => !isGreyed && handleNodeClick(node.id)}
                  />
                  {node.letter && (
                    <>
                      <text
                        x={node.x}
                        y={node.y - 5}
                        textAnchor="middle"
                        className="font-mono font-bold text-sm fill-white"
                      >
                        {node.letter}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 8}
                        textAnchor="middle"
                        className="font-mono text-xs fill-white"
                      >
                        {node.code}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            
            {/* Available letters positioned in top area */}
            <g>
              <text x="20" y="25" className="text-sm font-medium fill-gray-700">Available Letters:</text>
              {availableLetters.map((letter, index) => {
                const x = 20 + (index * 45);
                const y = 45;
                const isSelected = isTouchDevice && selectedLetter === letter;
                return (
                  <g key={letter}>
                    <rect
                      x={x}
                      y={y}
                      width="35"
                      height="35"
                      rx="4"
                      fill={isSelected ? "#3b82f6" : "#dbeafe"}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      className={`${isTouchDevice ? 'cursor-pointer' : 'cursor-move'} hover:fill-blue-200 transition-colors ${
                        draggedLetter === letter ? 'opacity-50' : ''
                      }`}
                      onClick={() => handleLetterClick(letter)}
                      onMouseDown={(e) => {
                        if (isTouchDevice) return;
                        e.preventDefault();
                        setDraggedLetter(letter);
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          // Update drag position for visual feedback
                          const svgRect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                          if (svgRect) {
                            const svgX = moveEvent.clientX - svgRect.left;
                            const svgY = moveEvent.clientY - svgRect.top;
                            setDragPosition({ x: svgX, y: svgY });
                          }
                        };
                        
                        const handleMouseUp = (upEvent: MouseEvent) => {
                          // Find if we're over a tree node
                          const svgRect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                          if (svgRect) {
                            const svgX = upEvent.clientX - svgRect.left;
                            const svgY = upEvent.clientY - svgRect.top;
                            
                            console.log('Drop coordinates:', svgX, svgY);
                            console.log('Available nodes:', treeNodes.map(n => ({ id: n.id, x: n.x, y: n.y, greyed: isNodeGreyedOut(n) })));
                            
                            // Check if we're over any tree node
                            const targetNode = treeNodes.find(node => {
                              const distance = Math.sqrt(Math.pow(svgX - node.x, 2) + Math.pow(svgY - node.y, 2));
                              const withinRadius = distance <= 20;
                              const notGreyed = !isNodeGreyedOut(node);
                              console.log(`Node ${node.id}: distance=${distance.toFixed(1)}, withinRadius=${withinRadius}, notGreyed=${notGreyed}`);
                              return withinRadius && notGreyed;
                            });
                            
                            console.log('Target node:', targetNode?.id);
                            
                            if (targetNode) {
                              // Directly call the drop logic instead of simulating drag event
                              setTreeNodes(prevNodes => {
                                const newNodes = [...prevNodes];
                                
                                // Remove any existing assignment of this letter
                                newNodes.forEach(node => {
                                  if (node.letter === letter) {
                                    node.letter = undefined;
                                  }
                                });
                                
                                // Assign letter to target node
                                const targetIndex = newNodes.findIndex(node => node.id === targetNode.id);
                                if (targetIndex !== -1) {
                                  newNodes[targetIndex] = { ...newNodes[targetIndex], letter: letter };
                                  
                                  // Grey out children nodes
                                  const targetLevel = newNodes[targetIndex].level;
                                  const targetPosition = newNodes[targetIndex].position;
                                  
                                  // Clear any letters from child nodes
                                  newNodes.forEach((node, index) => {
                                    if (node.level > targetLevel) {
                                      const ancestorPosition = Math.floor(node.position / Math.pow(2, node.level - targetLevel));
                                      if (ancestorPosition === targetPosition) {
                                        if (node.letter) {
                                          // Return letter to available pool by clearing it
                                          newNodes[index] = { ...node, letter: undefined };
                                        }
                                      }
                                    }
                                  });
                                }
                                
                                return newNodes;
                              });
                            }
                          }
                          
                          setDraggedLetter(null);
                          setDragPosition(null);
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                    <text
                      x={x + 17.5}
                      y={y + 23}
                      textAnchor="middle"
                      className={`font-mono font-bold text-lg pointer-events-none select-none ${
                        isSelected ? 'fill-white' : 'fill-blue-800'
                      }`}
                    >
                      {letter}
                    </text>
                  </g>
                );
              })}
            </g>
            
            {/* Drag preview - floating letter that follows mouse */}
            {draggedLetter && dragPosition && (
              <g>
                <rect
                  x={dragPosition.x - 17.5}
                  y={dragPosition.y - 17.5}
                  width="35"
                  height="35"
                  rx="4"
                  fill="#3b82f6"
                  stroke="#1e40af"
                  strokeWidth="2"
                  opacity="0.8"
                  style={{ pointerEvents: 'none' }}
                />
                <text
                  x={dragPosition.x}
                  y={dragPosition.y + 6}
                  textAnchor="middle"
                  className="font-mono font-bold text-lg fill-white pointer-events-none select-none"
                  style={{ pointerEvents: 'none' }}
                >
                  {draggedLetter}
                </text>
              </g>
            )}
            </svg>
          </div>
          <div className="text-center mt-2 text-sm text-gray-500 italic">
            {isTouchDevice 
              ? "Tap a letter above, then tap a node in the tree"
              : "Drag and drop letters to the nodes of the tree"
            }
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleTestCode}
          disabled={!isAllLettersPlaced || isTestingCode}
          className={`px-4 py-2 rounded font-medium ${
            !isAllLettersPlaced || isTestingCode
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isTestingCode ? 'Testing...' : 'Test Your Code'}
        </button>

        {codeError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {codeError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Text:</label>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
              disabled={isTestingCode}
            />
          </div>

          {(codedText || isTestingCode) && (
            <div className="border border-gray-300 rounded-lg p-2 sm:p-4 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Original Text:</label>
                  <div className="font-mono text-lg">
                    {testText.split('').map((char, index) => (
                      <span
                        key={index}
                        onMouseEnter={() => handleLetterHover(index)}
                        onMouseLeave={() => handleLetterHover(null)}
                        className={`inline-block px-1 cursor-pointer transition-colors ${
                          index === currentTestPosition 
                            ? 'bg-red-200 text-red-800' 
                            : hoveredLetterIndex === index
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Coded Text:</label>
                  <div className="font-mono text-lg break-all">
                    {codedText.split('').map((bit, index) => (
                      <span
                        key={index}
                        onMouseEnter={() => handleBitHover(index)}
                        onMouseLeave={() => handleBitHover(null)}
                        className={`inline-block cursor-pointer transition-colors ${
                          hoveredBitIndices.has(index)
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        {bit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {averageBitsPerLetter !== null && (
          <div className="text-sm text-gray-600">
            Average bits per letter: <span className="font-mono font-medium">
              {averageBitsPerLetter.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildYourOwnCodeWidget;