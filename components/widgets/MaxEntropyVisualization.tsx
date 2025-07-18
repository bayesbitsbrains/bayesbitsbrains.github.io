"use client";
import React, { useState, useMemo, useRef, memo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { InlineMath } from "react-katex";

interface MaxEntropyVisualizationProps {}

// Memoized heatmap component to prevent re-renders
const Heatmap2D = memo(({ heatmapData, getColor }: { 
  heatmapData: Array<{ x1: number; x2: number; normalizedDensity: number; i: number; j: number }>;
  getColor: (density: number) => string;
}) => {
  return (
    <>
      {heatmapData.map(({ x1, x2, normalizedDensity, i, j }) => (
        <rect
          key={`${i}-${j}`}
          x={x1 * 400}
          y={(1 - x2) * 400}
          width={400 / 100 + 1}
          height={400 / 100 + 1}
          fill={getColor(normalizedDensity)}
        />
      ))}
    </>
  );
});
Heatmap2D.displayName = 'Heatmap2D';

// 3D Circle component from sphere-plane intersection
const IntersectionCircle = ({ circleData, lambda1_3D, lambda2_3D, constraint1_3D, constraint2_3D }: { circleData: any; lambda1_3D: number; lambda2_3D: number; constraint1_3D: number; constraint2_3D: number }) => {
  const { exists, center, radius, normal } = circleData;
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create clipping planes for the unit cube [0,1]³ - always call hooks in same order
  const clippingPlanes = useMemo(() => [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),   // x >= 0
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1),  // x <= 1
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),   // y >= 0
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 1),  // y <= 1
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),   // z >= 0
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 1),  // z <= 1
  ], []);
  
  if (!exists || radius <= 0) {
    return null;
  }
  
  // Calculate log density on the circle (points that satisfy both constraints)
  // Any point on the circle satisfies: x₁² + x₂² + x₃² = constraint1_3D and x₁ + x₂ + x₃ = constraint2_3D
  const logDensity = lambda1_3D * constraint1_3D + lambda2_3D * constraint2_3D;
  
  // Map log density to color scale: -100 (darkest blue) to 0 (brightest yellow)
  const clampedLogDensity = Math.max(-100, Math.min(0, logDensity));
  const normalizedDensity = (clampedLogDensity + 100) / 100; // maps [-100, 0] to [0, 1]
  
  // Color scale function (same as 2D)
  const getColor = (normalizedDensity: number) => {
    const t = Math.max(0, Math.min(1, normalizedDensity)); // clamp to [0,1]
    let r, g, b;
    
    if (t < 0.25) {
      const s = t * 4;
      r = Math.floor(68 * (1 - s) + 49 * s);
      g = Math.floor(1 * (1 - s) + 54 * s);
      b = Math.floor(84 * (1 - s) + 149 * s);
    } else if (t < 0.5) {
      const s = (t - 0.25) * 4;
      r = Math.floor(49 * (1 - s) + 42 * s);
      g = Math.floor(54 * (1 - s) + 150 * s);
      b = Math.floor(149 * (1 - s) + 92 * s);
    } else if (t < 0.75) {
      const s = (t - 0.5) * 4;
      r = Math.floor(42 * (1 - s) + 175 * s);
      g = Math.floor(150 * (1 - s) + 215 * s);
      b = Math.floor(92 * (1 - s) + 85 * s);
    } else {
      const s = (t - 0.75) * 4;
      r = Math.floor(175 * (1 - s) + 253 * s);
      g = Math.floor(215 * (1 - s) + 231 * s);
      b = Math.floor(85 * (1 - s) + 36 * s);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  const circleColor = getColor(normalizedDensity);
  
  // Calculate rotation to orient circle properly
  const up = new THREE.Vector3(0, 0, 1);
  const normalVec = new THREE.Vector3(normal[0], normal[1], normal[2]);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec);
  
  return (
    <group>
      {/* Debug sphere at circle center */}
      <mesh position={center as [number, number, number]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial color="#00ff00" />
      </mesh>
      
      {/* Circle ring */}
      <mesh 
        ref={meshRef} 
        position={center as [number, number, number]}
        quaternion={quaternion}
      >
        <ringGeometry args={[Math.max(0, radius - 0.02), radius + 0.02, 64]} />
        <meshStandardMaterial 
          color={circleColor} 
          transparent 
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// 3D Axes and grid
const Axes3D = () => {
  return (
    <group>
      {/* Axes */}
      <Line points={[[0, 0, 0], [1.2, 0, 0]]} color="red" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 1.2, 0]]} color="green" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, 1.2]]} color="blue" lineWidth={2} />
      
      {/* Axes labels */}
      <Html position={[1.3, 0, 0]} center>
        <div className="text-red-600 font-semibold pointer-events-none">
          <InlineMath math="x_1" />
        </div>
      </Html>
      <Html position={[0, 1.3, 0]} center>
        <div className="text-green-600 font-semibold pointer-events-none">
          <InlineMath math="x_2" />
        </div>
      </Html>
      <Html position={[0, 0, 1.3]} center>
        <div className="text-blue-600 font-semibold pointer-events-none">
          <InlineMath math="x_3" />
        </div>
      </Html>
      
      {/* Grid lines on all three coordinate planes */}
      {[0.2, 0.4, 0.6, 0.8].map(v => (
        <group key={v}>
          {/* Grid on x1-x3 plane (y=0) - the base */}
          <Line points={[[v, 0, 0], [v, 0, 1]]} color="#cccccc" lineWidth={1} />
          <Line points={[[0, 0, v], [1, 0, v]]} color="#cccccc" lineWidth={1} />
          
          {/* Grid on x1-x2 plane (z=0) - the front */}
          <Line points={[[v, 0, 0], [v, 1, 0]]} color="#cccccc" lineWidth={1} />
          <Line points={[[0, v, 0], [1, v, 0]]} color="#cccccc" lineWidth={1} />
          
          {/* Grid on x2-x3 plane (x=0) - the left side */}
          <Line points={[[0, v, 0], [0, v, 1]]} color="#cccccc" lineWidth={1} />
          <Line points={[[0, 0, v], [0, 1, v]]} color="#cccccc" lineWidth={1} />
        </group>
      ))}
      
      {/* Add edge lines for the three visible planes */}
      {/* x1-x3 plane (y=0) edges */}
      <Line points={[[0, 0, 0], [1, 0, 0]]} color="#999999" lineWidth={1} />
      <Line points={[[1, 0, 0], [1, 0, 1]]} color="#999999" lineWidth={1} />
      <Line points={[[1, 0, 1], [0, 0, 1]]} color="#999999" lineWidth={1} />
      <Line points={[[0, 0, 1], [0, 0, 0]]} color="#999999" lineWidth={1} />
      
      {/* x1-x2 plane (z=0) edges */}
      <Line points={[[0, 0, 0], [0, 1, 0]]} color="#999999" lineWidth={1} />
      <Line points={[[0, 1, 0], [1, 1, 0]]} color="#999999" lineWidth={1} />
      <Line points={[[1, 1, 0], [1, 0, 0]]} color="#999999" lineWidth={1} />
      
      {/* x2-x3 plane (x=0) edges */}
      <Line points={[[0, 0, 0], [0, 0, 1]]} color="#999999" lineWidth={1} />
      <Line points={[[0, 0, 1], [0, 1, 1]]} color="#999999" lineWidth={1} />
      <Line points={[[0, 1, 1], [0, 1, 0]]} color="#999999" lineWidth={1} />
    </group>
  );
};

const MaxEntropyVisualization: React.FC<MaxEntropyVisualizationProps> = () => {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  
  // 2D mode parameters
  const [lambda2D, setLambda2D] = useState(-1);
  const [constraintSum, setConstraintSum] = useState(1.3);
  
  // 3D mode parameters
  const [lambda1_3D, setLambda1_3D] = useState(-20);
  const [lambda2_3D, setLambda2_3D] = useState(-20);
  const [constraint1_3D, setConstraint1_3D] = useState(0.75);
  const [constraint2_3D, setConstraint2_3D] = useState(1);

  // Generate 2D heatmap data - only depends on lambda2D
  const heatmapData = useMemo(() => {
    const resolution = 100;
    const data = [];
    let maxDensity = 0;
    let minDensity = Infinity;
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x1 = i / (resolution - 1);
        const x2 = j / (resolution - 1);
        // For independent sampling: p(x1,x2) = p(x1) * p(x2) ∝ e^(λx1) * e^(λx2) = e^(λ(x1+x2))
        const density = Math.exp(lambda2D * x1) * Math.exp(lambda2D * x2);
        maxDensity = Math.max(maxDensity, density);
        minDensity = Math.min(minDensity, density);
        data.push({ x1, x2, density, i, j });
      }
    }
    
    // Normalize densities
    return data.map(d => ({
      ...d,
      normalizedDensity: (d.density - minDensity) / (maxDensity - minDensity)
    }));
  }, [lambda2D]); // Note: constraintSum is NOT a dependency

  // Generate constraint line points for 2D
  const constraintLinePoints = useMemo(() => {
    if (constraintSum < 0 || constraintSum > 2) return [];
    
    const points = [];
    if (constraintSum <= 1) {
      // Line goes from (0, constraintSum) to (constraintSum, 0)
      points.push([0, constraintSum]);
      points.push([constraintSum, 0]);
    } else {
      // Line goes from (constraintSum-1, 1) to (1, constraintSum-1)
      points.push([constraintSum - 1, 1]);
      points.push([1, constraintSum - 1]);
    }
    return points.filter(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1);
  }, [constraintSum]);

  // Color scale function
  const getColor = useCallback((normalizedDensity: number) => {
    // Viridis-like color scale: purple -> blue -> green -> yellow
    const t = normalizedDensity;
    let r, g, b;
    
    if (t < 0.25) {
      // Purple to blue
      const s = t * 4;
      r = Math.floor(68 * (1 - s) + 49 * s);
      g = Math.floor(1 * (1 - s) + 54 * s);
      b = Math.floor(84 * (1 - s) + 149 * s);
    } else if (t < 0.5) {
      // Blue to green
      const s = (t - 0.25) * 4;
      r = Math.floor(49 * (1 - s) + 42 * s);
      g = Math.floor(54 * (1 - s) + 150 * s);
      b = Math.floor(149 * (1 - s) + 92 * s);
    } else if (t < 0.75) {
      // Green to yellow-green
      const s = (t - 0.5) * 4;
      r = Math.floor(42 * (1 - s) + 175 * s);
      g = Math.floor(150 * (1 - s) + 215 * s);
      b = Math.floor(92 * (1 - s) + 85 * s);
    } else {
      // Yellow-green to yellow
      const s = (t - 0.75) * 4;
      r = Math.floor(175 * (1 - s) + 253 * s);
      g = Math.floor(215 * (1 - s) + 231 * s);
      b = Math.floor(85 * (1 - s) + 36 * s);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  // Calculate circle from sphere-plane intersection
  const circleData = useMemo(() => {
    // Sphere: x₁² + x₂² + x₃² = R² (where R² = constraint1_3D)
    // Plane: x₁ + x₂ + x₃ = d (where d = constraint2_3D)
    
    const R_squared = constraint1_3D;
    const d = constraint2_3D;
    
    // Check if intersection exists
    // Distance from origin to plane: |d|/√3
    // For intersection: distance < R
    const distanceToPlane = Math.abs(d) / Math.sqrt(3);
    const sphereRadius = Math.sqrt(R_squared);
    
    if (distanceToPlane > sphereRadius) {
      // No intersection
      return { exists: false, center: [0, 0, 0], radius: 0, normal: [0, 0, 1] };
    }
    
    // Circle center: projection of origin onto plane
    // Plane normal vector: (1, 1, 1) / √3
    const planeNormal = [1/Math.sqrt(3), 1/Math.sqrt(3), 1/Math.sqrt(3)];
    
    // Circle center = d/3 * (1, 1, 1)
    const circleCenter = [d/3, d/3, d/3];
    
    // Circle radius using Pythagorean theorem
    const circleRadius = Math.sqrt(R_squared - (d*d)/3);
    
    // Calculate log density on the circle (points that satisfy both constraints)
    // Any point on the circle satisfies: x₁² + x₂² + x₃² = R² and x₁ + x₂ + x₃ = d
    const circleLogDensity = lambda1_3D * R_squared + lambda2_3D * d;
    
    // Map to color scale: -100 to 0
    const clampedLogDensity = Math.max(-100, Math.min(0, circleLogDensity));
    const normalizedDensity = (clampedLogDensity + 100) / 100;

    return {
      exists: true,
      center: circleCenter,
      radius: circleRadius,
      normal: planeNormal,
      logDensity: circleLogDensity,
      clampedLogDensity: clampedLogDensity,
      normalizedDensity: normalizedDensity
    };
  }, [constraint1_3D, constraint2_3D, lambda1_3D, lambda2_3D]);

  return (
    <div className="mb-6 p-2 sm:p-6 bg-gray-50 rounded-lg">
      <h4 className="text-center mb-4">Maximum Entropy Distribution Visualization</h4>
      
      {/* Mode selector */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
          <button
            onClick={() => setMode("2d")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "2d" 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Exponential
          </button>
          <button
            onClick={() => setMode("3d")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "3d" 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Gaussian
          </button>
        </div>
      </div>

      {mode === "2d" ? (
        <div>
          {/* 2D Controls */}
          <div className="mb-4 space-y-4">
            <div className="text-center">
              <div className="text-lg bg-white rounded-lg py-2 sm:py-3 px-3 sm:px-6 inline-block">
                <InlineMath math={`p(x_1, x_2) \\propto e^{${lambda2D} \\cdot x_1} \\cdot e^{${lambda2D} \\cdot x_2}`} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ = {lambda2D}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={lambda2D}
                  onChange={(e) => setLambda2D(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-blue-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Constraint: x<sub>1</sub> + x<sub>2</sub> = {constraintSum.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={constraintSum}
                  onChange={(e) => setConstraintSum(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-green-200"
                />
              </div>
            </div>
          </div>

          {/* 2D Heatmap */}
          <div className="bg-white rounded-lg p-2 sm:p-4">
            <div className="flex justify-center">
              <div className="relative inline-block w-full max-w-md">
              <svg width="100%" height="auto" viewBox="0 0 400 400" className="border border-gray-300 w-full h-auto max-w-md mx-auto">
                {/* Heatmap */}
                <Heatmap2D heatmapData={heatmapData} getColor={getColor} />
                
                {/* Constraint line */}
                {constraintLinePoints.length === 2 && (
                  <>
                    <line
                      x1={constraintLinePoints[0][0] * 400}
                      y1={(1 - constraintLinePoints[0][1]) * 400}
                      x2={constraintLinePoints[1][0] * 400}
                      y2={(1 - constraintLinePoints[1][1]) * 400}
                      stroke="white"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                    <text
                      x={(constraintLinePoints[0][0] + constraintLinePoints[1][0]) * 200}
                      y={(2 - constraintLinePoints[0][1] - constraintLinePoints[1][1]) * 200 - 10}
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.8))" }}
                    >
                      constant density
                    </text>
                  </>
                )}
                
              </svg>
              {/* All labels outside SVG */}
              {/* x1 axis label */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <InlineMath math="x_1" />
              </div>
              {/* x2 axis label */}
              <div className="absolute -left-10 top-1/2 transform -translate-y-1/2 -rotate-90">
                <InlineMath math="x_2" />
              </div>
              {/* x1 axis values */}
              <div className="absolute -bottom-6 left-0 text-sm">
                <InlineMath math="0" />
              </div>
              <div className="absolute -bottom-6 right-0 text-sm">
                <InlineMath math="1" />
              </div>
              {/* x2 axis values */}
              <div className="absolute -left-6 bottom-0 text-sm">
                <InlineMath math="0" />
              </div>
              <div className="absolute -left-6 top-0 text-sm">
                <InlineMath math="1" />
              </div>
            </div>
            </div>
            
            
            {/* Color bar */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium">Density scale</div>
                <span className="text-xs font-medium">Low</span>
                <div className="flex-1 h-6 rounded-lg" style={{
                  background: 'linear-gradient(to right, rgb(68,1,84), rgb(49,54,149), rgb(42,150,92), rgb(175,215,85), rgb(253,231,36))'
                }} />
                <span className="text-xs font-medium">High</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* 3D Controls */}
          <div className="mb-4 space-y-4">
            <div className="text-center">
              <div className="text-lg bg-white rounded-lg py-2 sm:py-3 px-3 sm:px-6 inline-block">
                <InlineMath math={`p(x_1, x_2, x_3) \\propto e^{${lambda1_3D} \\cdot x_1^2 + ${lambda2_3D} \\cdot x_1} \\cdot e^{${lambda1_3D} \\cdot x_2^2 + ${lambda2_3D} \\cdot x_2} \\cdot e^{${lambda1_3D} \\cdot x_3^2 + ${lambda2_3D} \\cdot x_3}`} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ<sub>1</sub> (quadratic coefficient) = {lambda1_3D}
                </label>
                <input
                  type="range"
                  min="-50"
                  max="-1"
                  step="1"
                  value={lambda1_3D}
                  onChange={(e) => setLambda1_3D(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-blue-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  λ<sub>2</sub> (linear coefficient) = {lambda2_3D}
                </label>
                <input
                  type="range"
                  min="-50"
                  max="-1"
                  step="1"
                  value={lambda2_3D}
                  onChange={(e) => setLambda2_3D(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-green-200"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <InlineMath math={`x_1 + x_2 + x_3 = ${constraint2_3D.toFixed(2)}`} />
                </label>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.05"
                  value={constraint2_3D}
                  onChange={(e) => setConstraint2_3D(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-purple-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <InlineMath math={`x_1^2 + x_2^2 + x_3^2 = ${constraint1_3D.toFixed(2)}`} />
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="2"
                  step="0.05"
                  value={constraint1_3D}
                  onChange={(e) => setConstraint1_3D(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-red-200"
                />
              </div>
            </div>
          </div>

          {/* 3D Visualization */}
          <div className="bg-white rounded-lg p-2">
            <div className="flex justify-center">
              <div className="relative w-full max-w-lg">
                <div className="w-full h-0 pb-[80%] relative"> {/* 5:4 aspect ratio */}
                  <div className="absolute inset-0">
              <Canvas 
                camera={{ position: [1.5, 1.2, 1.5], fov: 50 }}
                gl={{ localClippingEnabled: true }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <directionalLight position={[-5, -5, -5]} intensity={0.3} />
                
                <group position={[-0.5, -0.5, -0.5]}>
                  <Axes3D />
                  <IntersectionCircle circleData={circleData} lambda1_3D={lambda1_3D} lambda2_3D={lambda2_3D} constraint1_3D={constraint1_3D} constraint2_3D={constraint2_3D} />
                </group>
                
                <OrbitControls 
                  enablePan={false} 
                  enableZoom={true} 
                  enableRotate={true}
                  minDistance={1}
                  maxDistance={5}
                />
              </Canvas>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center space-y-1">
              <div className="text-sm font-medium">
                Drag to rotate • Scroll to zoom
              </div>
              
              {/* Show message only when circle doesn't exist */}
              {!circleData.exists && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-red-600 text-center">
                  No circle exists for these constraint values
                </div>
              )}
            </div>
            
            {/* Color bar for 3D */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium">Density scale</div>
                <span className="text-xs font-medium">Low</span>
                <div className="flex-1 h-6 rounded-lg" style={{
                  background: 'linear-gradient(to right, rgb(68,1,84), rgb(49,54,149), rgb(42,150,92), rgb(175,215,85), rgb(253,231,36))'
                }} />
                <span className="text-xs font-medium">High</span>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaxEntropyVisualization;