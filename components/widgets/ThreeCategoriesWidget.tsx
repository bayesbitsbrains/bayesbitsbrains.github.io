"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { getAssetPath } from "@/lib/utils";

interface CategoryNode extends d3.SimulationNodeDatum {
  id: string;
  category: 'country' | 'sport' | 'animal';
  displayName: string;
  size?: number;
}

interface CategoryLink extends d3.SimulationLinkDatum<CategoryNode> {
  source: string | CategoryNode;
  target: string | CategoryNode;
  value: number;
  distance: number;
}

interface CategoryResults {
  languages: string[];
  distance_matrix: Record<string, Record<string, number>>;
  entropy_values?: Record<string, number>;
  categories: Record<string, string>;
}

interface ThreeCategoriesData {
  metadata: {
    total_items: number;
    countries: number;
    fruits: number;
    animals: number;
    analysis_types: string[];
  };
  kl_analysis: {
    baseline: CategoryResults;
  };
  generalized_divergence_analysis: CategoryResults;
  zip_similarity_analysis?: CategoryResults;
}

const ThreeCategoriesWidget: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ThreeCategoriesData | null>(null);
  const [dataMode, setDataMode] = useState<'kl' | 'generalized' | 'zip'>('kl');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [customNodes, setCustomNodes] = useState<Record<string, { 
    url: string, 
    content: string,
    kl: Record<string, number>, 
    zip_div: Record<string, number>,
    zip_sim: Record<string, number>,
    debugInfo?: any[]
  }>>({});
  
  // Physics parameters
  const [maxDistance, setMaxDistance] = useState(0.063);
  const [baseSpringDistance, setBaseSpringDistance] = useState(40);
  const [maxSpringDistance, setMaxSpringDistance] = useState(250);
  const [linkStrength, setLinkStrength] = useState(0.6);
  const [chargeStrength, setChargeStrength] = useState(-800);
  const [collisionRadius, setCollisionRadius] = useState(8);
  const [edgeMultiplier, setEdgeMultiplier] = useState(4); // Show 4n edges by default

  // Color mappings for three categories - pastel shades
  const categoryColors: Record<string, string> = {
    // Countries - pastel blue shades
    'country_france': '#93C5FD',
    'country_japan': '#A5B4FC', 
    'country_brazil': '#C7D2FE',
    'country_germany': '#BFDBFE',
    'country_australia': '#7DD3FC',
    // Sports - pastel red/pink shades  
    'sport_football': '#FCA5A5',
    'sport_basketball': '#F9A8D4',
    'sport_tennis': '#FDA4AF',
    'sport_golf': '#FBCFE8',
    'sport_hockey': '#F0ABFC',
    // Animals - pastel green shades
    'animal_lion': '#86EFAC',
    'animal_elephant': '#A7F3D0',
    'animal_dolphin': '#6EE7B7',
    'animal_zebra': '#BBF7D0',
    'animal_giraffe': '#BEF264'
  };

  const getNodeColor = (nodeId: string): string => {
    // Custom nodes get a purple color
    if (nodeId.startsWith('custom_')) {
      return '#C084FC'; // Pastel purple
    }
    return categoryColors[nodeId] || '#666666';
  };

  const getDisplayName = (nodeId: string): string => {
    const categoryNames: Record<string, string> = {
      // Countries - flags
      'country_france': '🇫🇷',
      'country_japan': '🇯🇵',
      'country_brazil': '🇧🇷', 
      'country_germany': '🇩🇪',
      'country_australia': '🇦🇺',
      // Sports - sport emojis
      'sport_football': '⚽',
      'sport_basketball': '🏀',
      'sport_tennis': '🎾',
      'sport_golf': '⛳',
      'sport_hockey': '🏒',
      // Animals - animal emojis
      'animal_lion': '🦁',
      'animal_elephant': '🐘',
      'animal_dolphin': '🐬',
      'animal_zebra': '🦓',
      'animal_giraffe': '🦒'
    };
    
    // Check if it's a custom node
    if (nodeId.startsWith('custom_')) {
      const customNodeIds = Object.keys(customNodes).sort();
      const index = customNodeIds.indexOf(nodeId);
      const digitEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      return digitEmojis[index] || '🔗'; // Use digit emoji based on order, fallback to link
    }
    
    return categoryNames[nodeId] || nodeId;
  };

  const getTextName = (nodeId: string): string => {
    // Handle custom nodes
    if (nodeId.startsWith('custom_') && customNodes[nodeId]) {
      const url = customNodes[nodeId].url;
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
      } catch {
        return 'Custom URL';
      }
    }
    
    return nodeId
      .replace('country_', '')
      .replace('sport_', '')
      .replace('animal_', '')
      .replace('_', ' ')
      .replace('hockey', 'Ice hockey')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    loadData();
  }, []);
  
  const callDivergenceAPI = async (url: string, referenceTexts: Record<string, string>) => {
    const sessionHash = Math.random().toString(36).substring(2, 12);
    
    // Join the queue
    const queueResponse = await fetch(
      'https://vaclavrozhon-probabilistic-lenses-widgets.hf.space/queue/join',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: [url, JSON.stringify(referenceTexts)],
          event_data: null,
          fn_index: 0,
          trigger_id: 12,
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
        reject(new Error('API processing timeout'));
      }, 60000); // 1 minute timeout
        
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.msg === 'process_completed') {
            clearTimeout(timeout);
            eventSource.close();
            
            if (data.output && data.output.data) {
              resolve(data.output.data[0]);
            } else {
              reject(new Error('No output data'));
            }
          } else if (data.msg === 'process_errored') {
            clearTimeout(timeout);
            eventSource.close();
            reject(new Error('API processing error'));
          }
        } catch (e) {
          // Continue listening for more events
        }
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error('EventSource connection error'));
      };
    });
  };

  
  const addCustomUrl = async () => {
    if (!customUrl || !data) return;
    
    setIsAddingUrl(true);
    try {
      // First, load the reference texts
      const currentData = dataMode === 'kl' ? data.kl_analysis.baseline : data.generalized_divergence_analysis;
      const referenceTexts: Record<string, string> = {};
      
      // Load all the Wikipedia texts
      // Load analysis data
      for (const itemId of currentData.languages) {
        try {
          const textResponse = await fetch(getAssetPath(`/data/three_categories/${itemId}.txt`));
          if (textResponse.ok) {
            referenceTexts[itemId] = await textResponse.text();
          }
        } catch (e) {
          console.error(`Failed to load ${itemId}:`, e);
        }
      }
      
      // Step 1: Calculate divergences vs reference texts
      console.log('Processing URL:', customUrl);
      console.log('Reference texts loaded:', Object.keys(referenceTexts).length);
      
      // Use API for all calculations - more reliable with URL fetching and CORS handling
      console.log('Calling API for divergence calculations...');
      const result = await callDivergenceAPI(customUrl, referenceTexts);
      
      // Handle different result formats
      let divergences;
      if (typeof result === 'string') {
        divergences = JSON.parse(result);
      } else if (typeof result === 'object') {
        divergences = result; // Already an object
      } else {
        throw new Error('Unexpected result format');
      }
      
      
      if (divergences.error) {
        throw new Error(divergences.error);
      }
      
      // Generate a unique ID for this custom node
      const customId = `custom_${Date.now()}`;
      
      // OPTION B: Calculate divergences with existing custom nodes
      const existingCustomNodeIds = Object.keys(customNodes);
      const customDivergences: { kl: Record<string, number>, zip_div: Record<string, number>, zip_sim: Record<string, number>, debugInfo?: any[] } = { kl: {}, zip_div: {}, zip_sim: {} };
      
      // Step 2: Calculate divergences vs existing custom nodes
      if (existingCustomNodeIds.length > 0) {
        console.log(`Calculating divergences vs ${existingCustomNodeIds.length} existing custom nodes`);
        
        for (const existingCustomId of existingCustomNodeIds) {
          try {
            // Create a reference set with just this custom node's content
            const singleCustomRef = {
              [existingCustomId]: customNodes[existingCustomId].content
            };
            
            const customResult = await callDivergenceAPI(customUrl, singleCustomRef);
            
            let customDiv;
            if (typeof customResult === 'string') {
              customDiv = JSON.parse(customResult);
            } else {
              customDiv = customResult;
            }
            
            if (!customDiv.error) {
              // Handle KL divergences
              if (customDiv.kl_divergences) {
                customDivergences.kl[existingCustomId] = customDiv.kl_divergences[existingCustomId];
              }
              
              // Handle ZIP divergences and similarities separately
              if (customDiv.zip_divergences && customDiv.zip_divergences[existingCustomId] !== null) {
                customDivergences.zip_div[existingCustomId] = customDiv.zip_divergences[existingCustomId];
              }
              if (customDiv.zip_similarities && customDiv.zip_similarities[existingCustomId] !== null) {
                customDivergences.zip_sim[existingCustomId] = customDiv.zip_similarities[existingCustomId];
              }
              
              // Store debugging info for custom vs custom comparisons
              if (customDiv.compression_debug && customDiv.compression_debug.length > 0) {
                const debugInfo = { ...customDiv.compression_debug[0] };
                debugInfo.comparison = `Custom URL vs Custom URL`;
                
                if (!customDivergences.debugInfo) {
                  customDivergences.debugInfo = [];
                }
                customDivergences.debugInfo.push(debugInfo);
              }
            }
          } catch (err) {
            console.error(`Failed to calculate divergence vs ${existingCustomId}:`, err);
            // Continue with other nodes even if one fails
          }
        }
      }
      
      // Step 3: Update existing custom nodes with divergences to the new node
      const updatedCustomNodes = { ...customNodes };
      
      for (const existingCustomId of existingCustomNodeIds) {
        if (customDivergences.kl[existingCustomId] !== undefined) {
          updatedCustomNodes[existingCustomId] = {
            ...updatedCustomNodes[existingCustomId],
            kl: {
              ...updatedCustomNodes[existingCustomId].kl,
              [customId]: customDivergences.kl[existingCustomId]
            },
            zip_div: {
              ...updatedCustomNodes[existingCustomId].zip_div || {},
              [customId]: customDivergences.zip_div[existingCustomId]
            },
            zip_sim: {
              ...updatedCustomNodes[existingCustomId].zip_sim || {},
              [customId]: customDivergences.zip_sim[existingCustomId]
            }
          };
        }
      }
      
      // Step 4: Add the new custom node
      updatedCustomNodes[customId] = {
        url: customUrl,
        content: divergences.full_content || divergences.content_preview || '', // Store full content for future comparisons
        kl: {
          ...divergences.kl_divergences || {},
          ...customDivergences.kl
        },
        zip_div: {
          ...divergences.zip_divergences || {},
          ...customDivergences.zip_div
        },
        zip_sim: {
          ...divergences.zip_similarities || {},
          ...customDivergences.zip_sim
        },
        debugInfo: [
          ...(divergences.compression_debug || []),
          ...(customDivergences.debugInfo || [])
        ]
      };
      
      setCustomNodes(updatedCustomNodes);
      
      // Clear the URL input
      setCustomUrl('');
      
    } catch (err) {
      console.error('Failed to add URL:', err);
      alert('Failed to add URL: ' + (err as Error).message);
    } finally {
      setIsAddingUrl(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      try {
        response = await fetch('/data/three_categories_analysis.json');
        if (!response.ok) {
          throw new Error('Dev path failed');
        }
      } catch {
        response = await fetch(getAssetPath('/data/three_categories_analysis.json'));
        if (!response.ok) {
          throw new Error('Failed to fetch three categories data');
        }
      }
      
      const analysisData = await response.json();
      setData(analysisData);
      
    } catch (err) {
      setError('Failed to load three categories analysis data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createVisualization = useCallback(() => {
    if (!data || !svgRef.current) return;
    
    // Choose data based on mode
    let currentData: CategoryResults | undefined;
    if (dataMode === 'kl') {
      currentData = data.kl_analysis.baseline;
    } else if (dataMode === 'generalized') {
      currentData = data.generalized_divergence_analysis;
    } else if (dataMode === 'zip' && data.zip_similarity_analysis) {
      currentData = data.zip_similarity_analysis;
    }
    if (!currentData) return;

    // Show all categories
    let filteredItems = currentData.languages;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Calculate responsive dimensions
    const parentContainer = svgRef.current.parentElement;
    if (!parentContainer) return;
    
    let width, height, scaleFactor;
    
    if (isFullscreen) {
      // In fullscreen: use as much of the window as possible
      width = window.innerWidth - 40;
      height = window.innerHeight - 120;
      scaleFactor = Math.min(width / 1000, height / 700); // Scale based on whichever dimension is more constraining
    } else {
      // In normal mode: canvas width = container width minus padding, reasonable height
      const containerRect = parentContainer.getBoundingClientRect();
      width = containerRect.width - 32; // subtract p-4 padding (16px * 2)
      height = 500; // Fixed reasonable height
      scaleFactor = width / 1000;
    }
    
    const margin = 50 * scaleFactor;
    const nodeRadius = 30; // Fixed node size regardless of scale

    svg.attr("width", width).attr("height", height);

    const container = svg.append("g")
      .attr("transform", `translate(${margin}, ${margin})`);

    // Prepare nodes with category-based initial positions
    const centerX = width / 2;
    const centerY = height / 2;
    const clusterRadius = Math.min(width, height) / 6;
    
    // Define initial positions for each category (triangular arrangement)
    const categoryPositions = {
      'country': { x: centerX - clusterRadius, y: centerY - clusterRadius/2 },
      'sport': { x: centerX + clusterRadius, y: centerY - clusterRadius/2 },
      'animal': { x: centerX, y: centerY + clusterRadius }
    };
    
    const nodes: CategoryNode[] = [
      // Original nodes
      ...filteredItems.map((itemId, index) => {
        const category = currentData.categories[itemId] as 'country' | 'sport' | 'animal';
        const basePos = categoryPositions[category];
        // Add small random offset within cluster to avoid exact overlap
        const eps = 5;
        return {
          id: itemId,
          category: category,
          displayName: getDisplayName(itemId),
          size: currentData.entropy_values?.[itemId] || 1,
          x: basePos.x + (Math.random() - 0.5) * eps,
          y: basePos.y + (Math.random() - 0.5) * eps
        };
      }),
      // Custom nodes - place them in the center initially
      ...Object.keys(customNodes).map((customId, index) => ({
        id: customId,
        category: 'country' as 'country', // Default category for styling
        displayName: getDisplayName(customId),
        size: 1,
        x: centerX + (Math.random() - 0.5) * 10, // Small random offset from center
        y: centerY + (Math.random() - 0.5) * 10
      }))
    ];

    // Prepare links
    // First, collect all possible links with their distances
    const allPossibleLinks: (CategoryLink & { adjustedDistance: number })[] = [];
    
    // Get all node IDs including custom ones
    const allNodeIds = nodes.map(n => n.id);
    
    allNodeIds.forEach(item1 => {
      allNodeIds.forEach(item2 => {
        if (item1 < item2) { // Only create each pair once (undirected graph)
          let rawDistance = 0;
          let adjustedDistance = 0;
          
          // Handle different cases
          if (!item1.startsWith('custom_') && !item2.startsWith('custom_')) {
            // Both are original nodes - use existing distance matrix
            rawDistance = currentData.distance_matrix[item1]?.[item2] || 0;
          } else if (item1.startsWith('custom_') && !item2.startsWith('custom_')) {
            // item1 is custom, item2 is original
            const divergences = dataMode === 'kl' ? customNodes[item1]?.kl : 
                                (dataMode === 'zip' ? customNodes[item1]?.zip_sim : customNodes[item1]?.zip_div);
            rawDistance = divergences?.[item2] || 0;
          } else if (!item1.startsWith('custom_') && item2.startsWith('custom_')) {
            // item1 is original, item2 is custom
            const divergences = dataMode === 'kl' ? customNodes[item2]?.kl : 
                                (dataMode === 'zip' ? customNodes[item2]?.zip_sim : customNodes[item2]?.zip_div);
            rawDistance = divergences?.[item1] || 0;
          } else {
            // Both are custom nodes - use actual calculated divergences
            const divergences1 = dataMode === 'kl' ? customNodes[item1]?.kl : 
                                 (dataMode === 'zip' ? customNodes[item1]?.zip_sim : customNodes[item1]?.zip_div);
            const divergences2 = dataMode === 'kl' ? customNodes[item2]?.kl : 
                                 (dataMode === 'zip' ? customNodes[item2]?.zip_sim : customNodes[item2]?.zip_div);
            
            // Try to get divergence from either node's perspective
            rawDistance = divergences1?.[item2] || divergences2?.[item1] || 0.5; // Fallback only if no data
          }
          
          // For now, just use raw distance - percentile normalization will be applied later
          adjustedDistance = rawDistance;
          
          allPossibleLinks.push({
            source: item1,
            target: item2,
            value: 1, // Will be set properly later
            distance: rawDistance,
            adjustedDistance: adjustedDistance
          });
        }
      });
    });
    
    // Apply percentile-based normalization for all modes to make them comparable
    // Sort all distances to compute percentiles
    const allDistances = allPossibleLinks.map(link => link.adjustedDistance);
    const sortedDistances = [...allDistances].sort((a, b) => a - b);
    
    // Convert each distance to its percentile
    allPossibleLinks.forEach(link => {
      // Find the percentile rank of this distance
      let rank = 0;
      for (let i = 0; i < sortedDistances.length; i++) {
        if (sortedDistances[i] <= link.adjustedDistance) {
          rank = i + 1;
        }
      }
      
      // Convert rank to percentile (0.0 to 1.0)
      const percentile = rank / sortedDistances.length;
      
      // Use percentile as the adjusted distance
      link.adjustedDistance = percentile;
    });
    
    // Sort by adjusted distance (closest first) and take top (edgeMultiplier * n) links
    const n = nodes.length; // Use total nodes including custom ones
    const maxLinks = Math.max(n, edgeMultiplier * n); // At least n links, up to edgeMultiplier * n
    const selectedLinks = allPossibleLinks
      .sort((a, b) => a.adjustedDistance - b.adjustedDistance)
      .slice(0, maxLinks);
    
    // Find the maximum distance among selected links for normalization
    const maxSelectedDistance = Math.max(...selectedLinks.map(link => link.adjustedDistance));
    
    // Create final links with proper normalization
    const links: CategoryLink[] = selectedLinks.map(link => ({
      source: link.source,
      target: link.target,
      value: maxSelectedDistance > 0 ? (1 - link.adjustedDistance / maxSelectedDistance) : 1,
      distance: link.distance
    }));

    // Create force simulation
    const simulation = d3.forceSimulation<CategoryNode>(nodes)
      .force("link", d3.forceLink<CategoryNode, CategoryLink>(links)
        .id(d => d.id)
        .distance(d => (baseSpringDistance + (1 - d.value) * maxSpringDistance) * scaleFactor)
        .strength(d => Math.pow(d.value, 2) * linkStrength))
      .force("charge", d3.forceManyBody().strength(chargeStrength * scaleFactor))
      .force("center", d3.forceCenter((width - 2 * margin) / 2, (height - 2 * margin) / 2))
      .force("collision", d3.forceCollide().radius(nodeRadius + collisionRadius * scaleFactor))
      .force("boundary", () => {
        nodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            // Keep nodes within bounds - account for node radius to keep them fully visible
            const minX = 0;
            const maxX = width - 2 * margin;
            const minY = 0;
            const maxY = height - 2 * margin;
            
            node.x = Math.max(minX + nodeRadius, Math.min(maxX - nodeRadius, node.x));
            node.y = Math.max(minY + nodeRadius, Math.min(maxY - nodeRadius, node.y));
          }
        });
      });

    // Create links
    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.pow(d.value, 1.5) * 6 * scaleFactor);

    // Create nodes
    const node = container.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => getNodeColor(d.id))
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("cursor", "pointer");

    // Add emoji labels
    const labels = container.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.displayName)
      .attr("font-size", "28px")
      .attr("text-anchor", "middle")
      .attr("dy", 8)
      .style("pointer-events", "none");

    // Add interactivity
    node
      .on("mouseover", (event, d) => {
        setHoveredNode(d.id);
        
        // Get mouse position relative to the container
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        }
        
        const connectedNodes = new Set([d.id]);
        links.forEach(link => {
          if (link.source === d.id) connectedNodes.add(link.target as string);
          if (link.target === d.id) connectedNodes.add(link.source as string);
        });

        node.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.3);
        link.style("opacity", l => 
          (l.source as CategoryNode).id === d.id || (l.target as CategoryNode).id === d.id ? 0.8 : 0.1
        );
        labels.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.3);
      })
      .on("mousemove", (event) => {
        // Update tooltip position on mouse move
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        }
      })
      .on("mouseout", () => {
        setHoveredNode(null);
        setTooltipPosition(null);
        node.style("opacity", 1);
        link.style("opacity", 0.6);
        labels.style("opacity", 1);
      })
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      });

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, CategoryNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as CategoryNode).x!)
        .attr("y1", d => (d.source as CategoryNode).y!)
        .attr("x2", d => (d.target as CategoryNode).x!)
        .attr("y2", d => (d.target as CategoryNode).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

  }, [data, dataMode, selectedNode, isFullscreen, maxDistance, baseSpringDistance, maxSpringDistance, linkStrength, chargeStrength, collisionRadius, edgeMultiplier, customNodes]);

  useEffect(() => {
    createVisualization();
  }, [createVisualization]);

  // Use debounced ResizeObserver to handle layout timing issues
  useEffect(() => {
    if (!svgRef.current?.parentElement) return;
    const container = svgRef.current.parentElement;
    let frame: number;

    const ro = new ResizeObserver(() => {
      // cancel any pending frame
      cancelAnimationFrame(frame);
      // schedule a new one
      frame = requestAnimationFrame(() => createVisualization());
    });

    ro.observe(container);
    // also kick off one draw in the next frame (fixes initial layout timing)
    frame = requestAnimationFrame(() => createVisualization());

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [createVisualization]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleResize = () => {
      createVisualization();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen, createVisualization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading three categories analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-white p-4 space-y-4 overflow-y-auto"
    : "p-4 sm:p-6 bg-gray-50 rounded-lg space-y-4 w-full mx-auto";

  return (
    <div className={containerClass}>
      <h3 className="text-xl font-semibold text-gray-800 text-center mb-4">
        Clustering by divergence
      </h3>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2">
          <button
            onClick={() => setDataMode('kl')}
            className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
              dataMode === 'kl' ? 'bg-green-500 text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            KL
          </button>
          <button
            onClick={() => setDataMode('generalized')}
            className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
              dataMode === 'generalized' ? 'bg-green-500 text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ZIP-div
          </button>
          <button
            onClick={() => setDataMode('zip')}
            className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
              dataMode === 'zip' ? 'bg-green-500 text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ZIP-sim
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
          >
            {showControls ? 'Hide' : 'Show'} Controls
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>
      
      <p className="text-center text-gray-600 text-sm">
        Three categories of Wikipedia texts clustered by {
          dataMode === 'kl' ? 'KL divergence' : 
          dataMode === 'generalized' ? "'ZIP divergence'" :
          'Normalized Compression Distance (NCD)'
        }
      </p>


      {/* Physics Controls Panel */}
      {showControls && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <h4 className="font-semibold mb-3">Physics Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Edge Count: {edgeMultiplier}n = {data ? edgeMultiplier * ((
                  dataMode === 'kl' ? data.kl_analysis.baseline.languages.length : 
                  data.generalized_divergence_analysis.languages.length
                ) + Object.keys(customNodes).length) : 0} edges
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={edgeMultiplier}
                onChange={(e) => setEdgeMultiplier(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500">Show the {edgeMultiplier}×n closest connections</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Base Spring: {baseSpringDistance}px
              </label>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={baseSpringDistance}
                onChange={(e) => setBaseSpringDistance(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Max Spring: {maxSpringDistance}px
              </label>
              <input
                type="range"
                min="150"
                max="400"
                step="25"
                value={maxSpringDistance}
                onChange={(e) => setMaxSpringDistance(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Link Strength: {linkStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={linkStrength}
                onChange={(e) => setLinkStrength(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Charge: {chargeStrength}
              </label>
              <input
                type="range"
                min="-1500"
                max="-200"
                step="50"
                value={chargeStrength}
                onChange={(e) => setChargeStrength(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Collision: {collisionRadius}px
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="2"
                value={collisionRadius}
                onChange={(e) => setCollisionRadius(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

          </div>
        </div>
      )}

      {/* Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-hidden relative">
        <svg ref={svgRef} className="w-full"></svg>
        
        {/* Tooltip */}
        {hoveredNode && tooltipPosition && data && (
          <div 
            className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm z-10 pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
              maxWidth: '250px'
            }}
          >
            <div className="font-semibold mb-2">
              {getDisplayName(hoveredNode)} {getTextName(hoveredNode)}
            </div>
            <div className="text-xs opacity-90">
              <div className="mb-1">Closest by {
                dataMode === 'kl' ? 'KL divergence' : 
                dataMode === 'generalized' ? 'compression divergence' :
                'NCD'
              }:</div>
              {(() => {
                // Handle custom nodes
                if (hoveredNode.startsWith('custom_') && customNodes[hoveredNode]) {
                  const divergences = dataMode === 'kl' ? customNodes[hoveredNode].kl : 
                                      (dataMode === 'zip' ? customNodes[hoveredNode].zip_sim : customNodes[hoveredNode].zip_div);
                  
                  
                  if (!divergences) {
                    return <div className="text-xs opacity-75">No divergence data available</div>;
                  }
                  
                  return (
                    <div className="space-y-0.5">
                      {Object.entries(divergences)
                        .filter(([itemId, distance]) => distance !== null && !isNaN(distance as number))
                        .sort(([,a], [,b]) => (a as number) - (b as number))
                        .slice(0, 5)
                        .map(([itemId, distance]) => (
                          <div key={itemId} className="flex justify-between gap-2">
                            <span>{getDisplayName(itemId)} {getTextName(itemId)}</span>
                            <span className="opacity-75">
                              {dataMode === 'zip' ? `${(distance as number).toFixed(3)}` :
                               dataMode === 'generalized' ? `${(distance as number).toFixed(3)}` : 
                               (distance as number).toFixed(3)}
                            </span>
                          </div>
                        ))}
                    </div>
                  );
                }
                
                // Handle original nodes
                const currentDistanceMatrix = dataMode === 'kl' 
                  ? data.kl_analysis.baseline.distance_matrix 
                  : dataMode === 'zip' 
                    ? data.zip_similarity_analysis?.distance_matrix
                    : data.generalized_divergence_analysis.distance_matrix;
                  
                if (!currentDistanceMatrix || !currentDistanceMatrix[hoveredNode]) {
                  return null;
                }
                
                return (
                  <div className="space-y-0.5">
                    {Object.entries(currentDistanceMatrix[hoveredNode])
                      .filter(([itemId]) => itemId !== hoveredNode)
                      .sort(([,a], [,b]) => a - b)
                      .slice(0, 5)
                      .map(([itemId, distance]) => (
                        <div key={itemId} className="flex justify-between gap-2">
                          <span>{getDisplayName(itemId)} {getTextName(itemId)}</span>
                          <span className="opacity-75">
                            {dataMode === 'zip' ? `${distance.toFixed(3)}` :
                             dataMode === 'generalized' ? `${distance.toFixed(3)}` : 
                             distance.toFixed(3)}
                          </span>
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Add URL input */}
      <div className="flex gap-2 items-center max-w-md mx-auto">
        <input
          type="url"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="https://en.wikipedia.org/wiki/Horse"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isAddingUrl}
        />
        <button
          onClick={addCustomUrl}
          disabled={isAddingUrl || !customUrl}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isAddingUrl ? 'Adding...' : 'Add'}
        </button>
      </div>

    </div>
  );
};

export default ThreeCategoriesWidget;
