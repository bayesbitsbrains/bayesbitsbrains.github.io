"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import KatexMath from "@/components/content/KatexMath";

// English letter frequencies (approximate percentages)
const DEFAULT_FREQUENCIES: Record<string, number> = {
  E: 12.70, T: 9.06, A: 8.17, O: 7.51, I: 6.97, N: 6.75, S: 6.33, H: 6.09,
  R: 5.99, D: 4.25, L: 4.03, C: 2.78, U: 2.76, M: 2.41, W: 2.36, F: 2.23,
  G: 2.02, Y: 1.97, P: 1.93, B: 1.29, V: 0.98, K: 0.77, J: 0.15, X: 0.15,
  Q: 0.10, Z: 0.07
};

interface CodeAssignment {
  letter: string;
  probability: number;
  codeLength: number;
  code: string;
  roundedProb: number;
}

interface TreeNode {
  id: string;
  depth: number;
  position: number;
  x: number;
  y: number;
  letter?: string;
  code?: string;
  isCodeNode: boolean;
  isVisible: boolean;
  parent?: TreeNode;
  left?: TreeNode;
  right?: TreeNode;
}

export default function ShannonCodeWidget() {
  const [frequencies, setFrequencies] = useState<Record<string, number>>(DEFAULT_FREQUENCIES);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [codeAssignments, setCodeAssignments] = useState<CodeAssignment[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const zoomedTreeContainerRef = useRef<HTMLDivElement>(null);

  // Normalize frequencies to sum to 100
  const normalizedFrequencies = useMemo(() => {
    const sum = Object.values(frequencies).reduce((a, b) => a + b, 0);
    if (sum === 0) return frequencies;
    
    const normalized: Record<string, number> = {};
    Object.entries(frequencies).forEach(([letter, freq]) => {
      normalized[letter] = (freq / sum) * 100;
    });
    return normalized;
  }, [frequencies]);

  // Generate Shannon code assignments without animation
  const generateCodeAssignments = useCallback(() => {
    // Sort letters by frequency (descending)
    const sorted = Object.entries(normalizedFrequencies)
      .sort(([, a], [, b]) => b - a)
      .map(([letter, freq]) => ({ letter, probability: freq / 100 }));

    const assignments: CodeAssignment[] = [];
    
    // Step 1: Determine code lengths by rounding probabilities down to powers of 2
    for (const { letter, probability } of sorted) {
      if (probability <= 0) continue;
      
      const codeLength = Math.max(1, Math.min(11, Math.ceil(-Math.log2(probability))));
      const roundedProb = Math.pow(2, -codeLength);
      
      assignments.push({
        letter,
        probability,
        codeLength,
        code: '', // Will be assigned in step 2
        roundedProb
      });
    }

    // Step 2: Greedily assign binary codes left-to-right
    // Track which prefixes are used to ensure no conflicts
    const usedPrefixes = new Set<string>();
    
    for (const assignment of assignments) {
      let found = false;
      for (let prefix = 0; prefix < Math.pow(2, assignment.codeLength); prefix++) {
        const code = prefix.toString(2).padStart(assignment.codeLength, '0');
        
        // Check if this code conflicts with any used prefix
        let conflict = false;
        for (const usedPrefix of usedPrefixes) {
          if (code.startsWith(usedPrefix) || usedPrefix.startsWith(code)) {
            conflict = true;
            break;
          }
        }
        
        if (!conflict) {
          assignment.code = code;
          usedPrefixes.add(code);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.warn(`Could not assign code to ${assignment.letter}`);
        assignment.code = '1'.repeat(assignment.codeLength); // fallback
      }
    }

    return assignments;
  }, [normalizedFrequencies]);

  // Build complete binary tree
  const buildTree = useCallback(() => {
    const maxDepth = 11;
    const baseWidth = 1600;
    const levelHeight = 50;
    const verticalPadding = 60; // Top and bottom padding
    const horizontalPadding = 100; // Left and right padding
    const nodeMap = new Map<string, TreeNode>();
    
    // Create all nodes
    for (let depth = 0; depth <= maxDepth; depth++) {
      for (let pos = 0; pos < Math.pow(2, depth); pos++) {
        const id = `${depth}-${pos}`;
        // More compact spacing for deep tree
        const spread = Math.min(baseWidth * Math.pow(0.6, depth), baseWidth);
        const x = baseWidth / 2 + 500 + (pos - Math.pow(2, depth) / 2 + 0.5) * spread; // Added 500 unit offset to the right
        const y = verticalPadding / 2 + depth * levelHeight;
        
        const node: TreeNode = {
          id,
          depth,
          position: pos,
          x,
          y,
          isCodeNode: false,
          isVisible: true
        };
        
        nodeMap.set(id, node);
      }
    }
    
    // Set up parent-child relationships
    for (let depth = 0; depth < maxDepth; depth++) {
      for (let pos = 0; pos < Math.pow(2, depth); pos++) {
        const nodeId = `${depth}-${pos}`;
        const leftChildId = `${depth + 1}-${pos * 2}`;
        const rightChildId = `${depth + 1}-${pos * 2 + 1}`;
        
        const node = nodeMap.get(nodeId)!;
        const leftChild = nodeMap.get(leftChildId);
        const rightChild = nodeMap.get(rightChildId);
        
        if (leftChild) {
          node.left = leftChild;
          leftChild.parent = node;
        }
        if (rightChild) {
          node.right = rightChild;
          rightChild.parent = node;
        }
      }
    }
    
    return nodeMap.get('0-0')!;
  }, []);

  // Helper to hide subtree
  const hideSubtree = useCallback((node: TreeNode) => {
    if (node.left) {
      node.left.isVisible = false;
      hideSubtree(node.left);
    }
    if (node.right) {
      node.right.isVisible = false;
      hideSubtree(node.right);
    }
  }, []);

  // Find node by code path
  const findNodeByCode = useCallback((root: TreeNode, code: string): TreeNode | null => {
    if (code === '') return root;
    
    let current = root;
    for (const bit of code) {
      if (bit === '0' && current.left) {
        current = current.left;
      } else if (bit === '1' && current.right) {
        current = current.right;
      } else {
        return null;
      }
    }
    return current;
  }, []);

  // Animation logic
  const startAnimation = useCallback(() => {
    const assignments = generateCodeAssignments();
    setCodeAssignments([]);
    setAnimationStep(0);
    setIsAnimating(true);
    
    // Initialize tree
    const initialTree = buildTree();
    setTree(initialTree);
    
    // Animate code assignments
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < assignments.length) {
        const assignment = assignments[currentStep];
        
        // Add to table
        setCodeAssignments(prev => [...prev, assignment]);
        
        // Auto-scroll table to show new row
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
          }
        }, 100);
        
        // Update tree
        setTree(prevTree => {
          if (!prevTree) return null;
          
          // Find the node for this code
          const targetNode = findNodeByCode(prevTree, assignment.code);
          if (targetNode) {
            // Mark as code node
            targetNode.isCodeNode = true;
            targetNode.letter = assignment.letter;
            targetNode.code = assignment.code;
            
            // Hide subtree
            hideSubtree(targetNode);
            
            // Center view on the current node in both regular and zoomed views
            setTimeout(() => {
              // Center in regular view
              if (treeContainerRef.current && targetNode.x && targetNode.y) {
                const container = treeContainerRef.current;
                const containerRect = container.getBoundingClientRect();
                const scrollLeft = targetNode.x - containerRect.width / 2;
                const scrollTop = targetNode.y - containerRect.height / 2;
                
                container.scrollTo({
                  left: Math.max(0, scrollLeft),
                  top: Math.max(0, scrollTop),
                  behavior: 'smooth'
                });
              }
              
              // Also center in zoomed view if it's open
              if (zoomedTreeContainerRef.current && targetNode.x && targetNode.y) {
                const container = zoomedTreeContainerRef.current;
                const containerRect = container.getBoundingClientRect();
                const scrollLeft = targetNode.x - containerRect.width / 2;
                const scrollTop = targetNode.y - containerRect.height / 2;
                
                container.scrollTo({
                  left: Math.max(0, scrollLeft),
                  top: Math.max(0, scrollTop),
                  behavior: 'smooth'
                });
              }
            }, 200);
          } else {
            console.warn(`Could not find node for code: ${assignment.code} (letter: ${assignment.letter})`);
          }
          
          // Return updated tree (React will re-render)
          return { ...prevTree };
        });
        
        currentStep++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 800);
  }, [generateCodeAssignments, buildTree, findNodeByCode, hideSubtree]);

  // Dragging logic
  const handleMouseDown = useCallback((letter: string, e: React.MouseEvent) => {
    if (isAnimating) return;
    
    // Get the individual bar container (the one being dragged)
    const barContainer = e.currentTarget.parentElement as HTMLElement;
    const barRect = barContainer.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const y = moveEvent.clientY - barRect.top;
      const maxHeight = 128; // Height of the bar container (h-32 = 128px)
      const percentage = Math.max(0.1, Math.min(30, (1 - y / maxHeight) * 20));
      
      setFrequencies(prev => ({
        ...prev,
        [letter]: percentage
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isAnimating]);

  // Calculate metrics from current assignments
  const { entropy, averageCodeLength } = useMemo(() => {
    if (codeAssignments.length === 0) return { entropy: 0, averageCodeLength: 0 };
    
    let entropy = 0;
    let averageCodeLength = 0;
    
    for (const assignment of codeAssignments) {
      if (assignment.probability > 0) {
        entropy -= assignment.probability * Math.log2(assignment.probability);
        averageCodeLength += assignment.probability * assignment.codeLength;
      }
    }
    
    return { entropy, averageCodeLength };
  }, [codeAssignments]);

  // Collect all visible nodes for rendering
  const allVisibleNodes = useMemo(() => {
    if (!tree) return [];
    
    const nodes: TreeNode[] = [];
    function collect(node: TreeNode) {
      if (node.isVisible) {
        nodes.push(node);
      }
      if (node.left && node.left.isVisible) collect(node.left);
      if (node.right && node.right.isVisible) collect(node.right);
    }
    collect(tree);
    return nodes;
  }, [tree]);

  // Calculate canvas dimensions based on visible nodes
  const canvasDimensions = useMemo(() => {
    if (allVisibleNodes.length === 0) {
      return { width: 1600, height: 600 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    allVisibleNodes.forEach(node => {
      minX = Math.min(minX, node.x - 20); // Include node radius
      maxX = Math.max(maxX, node.x + 20);
      minY = Math.min(minY, node.y - 20);
      maxY = Math.max(maxY, node.y + 40); // Extra space for code labels
    });
    
    // Add some padding
    const padding = 50;
    const width = Math.max(2100, maxX - minX + padding * 2); // Increased minimum width to account for 500 unit offset
    const height = Math.max(600, maxY - minY + padding * 2);
    
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }, [allVisibleNodes]);

  return (
    <>
      {/* Fullscreen zoom overlay */}
      {isZoomed && tree && (
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
                Shannon Code Tree Construction (Full View)
              </h4>
              <button
                onClick={() => setIsZoomed(false)}
                className="text-3xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[70vh]" ref={zoomedTreeContainerRef}>
              <svg width={canvasDimensions.width} height={canvasDimensions.height} className="mx-auto">
                {/* Draw edges */}
                {allVisibleNodes.map(node => (
                  <g key={`edges-${node.id}`}>
                    {node.left && node.left.isVisible && (
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.left.x}
                        y2={node.left.y}
                        stroke="#666"
                        strokeWidth="1"
                      />
                    )}
                    {node.right && node.right.isVisible && (
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.right.x}
                        y2={node.right.y}
                        stroke="#666"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                ))}

                {/* Draw non-code nodes first (grey nodes) */}
                {allVisibleNodes.filter(node => !node.isCodeNode).map(node => (
                  <g key={`node-${node.id}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="15"
                      fill="#f3f4f6"
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />
                  </g>
                ))}
                
                {/* Draw code nodes on top (blue nodes) */}
                {allVisibleNodes.filter(node => node.isCodeNode).map(node => (
                  <g key={`node-${node.id}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="15"
                      fill="#3b82f6"
                      stroke="#1d4ed8"
                      strokeWidth="3"
                    />
                    {node.letter && (
                      <>
                        <text
                          x={node.x}
                          y={node.y + 3}
                          textAnchor="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                        >
                          {node.letter}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 35}
                          textAnchor="middle"
                          fill="#374151"
                          fontSize="12"
                          className="font-mono"
                        >
                          {node.code}
                        </text>
                      </>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

    <div className="shannon-code-widget bg-white border border-gray-200 rounded-lg p-6 my-6">
      <h3 className="text-lg font-semibold mb-4">Shannon Code Constructor</h3>
      <p className="text-gray-600 mb-6">
        Drag the bars to adjust letter probabilities. Click &quot;Compute Shannon&apos;s Code&quot; to see 
        the animated construction of the code and tree.
      </p>

      {/* Letter frequency bars */}
      <div className="relative select-none frequency-bars-container">
        <div className="grid grid-cols-9 gap-2 mb-8">
          {Object.entries(normalizedFrequencies).map(([letter, freq]) => (
            <div key={letter} className="relative">
              <div className="h-32 bg-gray-100 rounded relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-blue-500 transition-colors ${
                    isAnimating ? 'cursor-not-allowed' : 'cursor-ns-resize hover:bg-blue-600'
                  }`}
                  style={{ height: `${freq * 5}%` }}
                  onMouseDown={(e) => handleMouseDown(letter, e)}
                />
                <div className="absolute inset-x-0 top-2 text-center">
                  <div className="font-mono font-bold">{letter}</div>
                </div>
              </div>
              <div className="text-xs text-center mt-1 text-gray-600">
                {freq.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compute Button */}
      <div className="text-center mb-6">
        <button
          onClick={startAnimation}
          disabled={isAnimating}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isAnimating 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isAnimating ? 'Computing...' : 'Compute Shannon\'s Code'}
        </button>
      </div>

      {/* Tree Visualization */}
      {tree && (
        <div className="mt-6 mb-6">
          <div className="relative">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="absolute top-2 right-2 z-10 text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {isZoomed ? '🗗 Exit Fullscreen' : '🔍 Zoom'}
            </button>
            <div 
              className={`bg-gray-50 rounded-lg p-4 overflow-auto max-h-96 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              ref={treeContainerRef}
              onClick={() => setIsZoomed(!isZoomed)}
            >
            <svg width={canvasDimensions.width} height={canvasDimensions.height} className="mx-auto">
              {/* Draw edges */}
              {allVisibleNodes.map(node => (
                <g key={`edges-${node.id}`}>
                  {node.left && node.left.isVisible && (
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={node.left.x}
                      y2={node.left.y}
                      stroke="#666"
                      strokeWidth="1"
                    />
                  )}
                  {node.right && node.right.isVisible && (
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={node.right.x}
                      y2={node.right.y}
                      stroke="#666"
                      strokeWidth="1"
                    />
                  )}
                </g>
              ))}

              {/* Draw non-code nodes first (grey nodes) */}
              {allVisibleNodes.filter(node => !node.isCodeNode).map(node => (
                <g key={`node-${node.id}`}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="15"
                    fill="#f3f4f6"
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                </g>
              ))}
              
              {/* Draw code nodes on top (blue nodes) */}
              {allVisibleNodes.filter(node => node.isCodeNode).map(node => (
                <g key={`node-${node.id}`}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="15"
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="3"
                  />
                  {node.letter && (
                    <>
                      <text
                        x={node.x}
                        y={node.y + 3}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {node.letter}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 30}
                        textAnchor="middle"
                        fill="#374151"
                        fontSize="10"
                        className="font-mono"
                      >
                        {node.code}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Shannon Code Assignment Table */}
      {codeAssignments.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-4">Shannon Code Assignments</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            {/* Fixed header outside scrollable area */}
            <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-700 mb-3 p-2 bg-gray-100 rounded">
              <div>Letter</div>
              <div>Probability</div>
              <div className="bg-white px-2 py-1 rounded shadow-sm">
                <KatexMath math="\text{Rounded to } 2^{-n}" />
              </div>
              <div>Code</div>
            </div>
            {/* Scrollable content area */}
            <div className="max-h-64 overflow-y-auto" ref={tableContainerRef}>
              {codeAssignments.map((assignment, i) => (
                <div key={assignment.letter} className={`grid grid-cols-4 gap-4 text-sm py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-100'} rounded mb-1`}>
                  <div className="font-mono font-bold text-blue-600">{assignment.letter}</div>
                  <div>{(assignment.probability * 100).toFixed(2)}%</div>
                  <div>1/2<sup>{assignment.codeLength}</sup> = {(assignment.roundedProb * 100).toFixed(1)}%</div>
                  <div className="font-mono text-green-600 font-bold">{assignment.code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Display */}
      {codeAssignments.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">Entropy</h5>
            <div className="text-2xl font-bold text-blue-600">
              {entropy.toFixed(3)} bits
            </div>
            <div className="text-sm text-blue-700 mt-1">
              <KatexMath math="H = \sum p(x) \log_2 \frac{1}{p(x)}" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h5 className="font-semibold text-green-800 mb-2">Average Code Length</h5>
            <div className="text-2xl font-bold text-green-600">
              {averageCodeLength.toFixed(3)} bits
            </div>
            <div className="text-sm text-green-700 mt-1">
              <KatexMath math="L = \sum p(x) \times \text{length}(\text{code}(x))" />
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}