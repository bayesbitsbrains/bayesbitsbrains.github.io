"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Text, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * KLDivergenceSimplex Widget
 *
 * User prompt: Show a 3D scene with a triangle representing the simplex of distributions
 * over three items. The user can drag a ball around the triangle to set distribution p.
 * The widget computes and shows the shape of D(p, .) cropped at z=5.
 *
 * This widget visualizes KL divergence on a probability simplex for 3 outcomes.
 * The triangle represents all possible probability distributions over 3 items.
 * User can drag the ball to select distribution p, and the surface shows D(p, q) for all q.
 */

// Convert barycentric coordinates to Cartesian coordinates for the equilateral triangle
function barycentricToCartesian(a: number, b: number, c: number): [number, number] {
  // Vertices of equilateral triangle centered at origin
  const v1 = [-1, -0.577]; // left vertex
  const v2 = [1, -0.577]; // right vertex
  const v3 = [0, 1.155]; // top vertex

  const x = a * v1[0] + b * v2[0] + c * v3[0];
  const y = a * v1[1] + b * v2[1] + c * v3[1];

  return [x, y];
}

// Convert Cartesian coordinates to barycentric coordinates
function cartesianToBarycentric(x: number, y: number): [number, number, number] {
  // Vertices of equilateral triangle
  const v1 = [-1, -0.577];
  const v2 = [1, -0.577];
  const v3 = [0, 1.155];

  // Calculate barycentric coordinates using area method
  const denom = (v2[1] - v3[1]) * (v1[0] - v3[0]) + (v3[0] - v2[0]) * (v1[1] - v3[1]);
  const a = ((v2[1] - v3[1]) * (x - v3[0]) + (v3[0] - v2[0]) * (y - v3[1])) / denom;
  const b = ((v3[1] - v1[1]) * (x - v3[0]) + (v1[0] - v3[0]) * (y - v3[1])) / denom;
  const c = 1 - a - b;

  // Cap probabilities at minimum 0.05 to avoid numerical issues
  const minProb = 0.05;
  const maxProb = 1 - 2 * minProb; // 0.90 when minProb = 0.05
  
  const clampedA = Math.max(minProb, Math.min(maxProb, a));
  const clampedB = Math.max(minProb, Math.min(maxProb, b));
  const clampedC = Math.max(minProb, Math.min(maxProb, c));

  // Normalize to ensure sum = 1
  const sum = clampedA + clampedB + clampedC;
  
  // Extra safety check
  if (sum <= 0 || !isFinite(sum)) {
    return [1/3, 1/3, 1/3]; // Return uniform distribution as fallback
  }

  return [clampedA / sum, clampedB / sum, clampedC / sum];
}

// Calculate KL divergence D(p || q) with robust numerical stability
function klDivergence(p: number[], q: number[]): number {
  const minProb = 0.05; // Match the constraint used elsewhere
  let kl = 0;
  
  for (let i = 0; i < p.length; i++) {
    // Extra safety: ensure probabilities are within bounds
    const p_safe = Math.max(minProb, Math.min(1 - 2 * minProb, p[i]));
    const q_safe = Math.max(minProb, Math.min(1 - 2 * minProb, q[i]));
    
    // Check for valid inputs
    if (!isFinite(p_safe) || !isFinite(q_safe) || p_safe <= 0 || q_safe <= 0) {
      return 0; // Return 0 for invalid inputs
    }
    
    const logRatio = Math.log(p_safe / q_safe);
    if (!isFinite(logRatio)) {
      return 0; // Return 0 for invalid log ratio
    }
    
    kl += p_safe * logRatio;
  }
  
  return Math.max(0, isFinite(kl) ? kl : 0); // Ensure non-negative and finite result
}

// Draggable ball component
function DraggableBall({
  position,
  setPosition,
  onDragChange,
  enabled,
}: {
  position: [number, number, number];
  setPosition: (pos: [number, number, number]) => void;
  onDragChange: (dragging: boolean) => void;
  enabled: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      // Calculate mouse position in normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Create a raycaster to project mouse position to 3D space
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      // Create a plane at z=0 for intersection
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      // Convert to barycentric and back to ensure valid position
      const [a, b, c] = cartesianToBarycentric(intersection.x, intersection.y);
      const [newX, newY] = barycentricToCartesian(a, b, c);

      setPosition([newX, newY, 0]);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragChange(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        handleMouseMove(touch as any);
      });
      window.addEventListener("touchend", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleMouseMove as any);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, camera, gl, setPosition, onDragChange]);

  return (
    <mesh
      ref={mesh}
      position={position}
      onPointerDown={() => {
        if (enabled) {
          setIsDragging(true);
          onDragChange(true);
        }
      }}
    >
      <sphereGeometry args={[0.08, 32, 32]} />
      <meshStandardMaterial color={isDragging ? "#ff6b6b" : "#4a90e2"} />
    </mesh>
  );
}

// Viridis color scale function (same as MaxEntropyVisualization)
function getViridisColor(normalizedValue: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, normalizedValue));
  let r, g, b;

  if (t < 0.25) {
    // Purple to blue
    const s = t * 4;
    r = (68 * (1 - s) + 49 * s) / 255;
    g = (1 * (1 - s) + 54 * s) / 255;
    b = (84 * (1 - s) + 149 * s) / 255;
  } else if (t < 0.5) {
    // Blue to green
    const s = (t - 0.25) * 4;
    r = (49 * (1 - s) + 42 * s) / 255;
    g = (54 * (1 - s) + 150 * s) / 255;
    b = (149 * (1 - s) + 92 * s) / 255;
  } else if (t < 0.75) {
    // Green to yellow-green
    const s = (t - 0.5) * 4;
    r = (42 * (1 - s) + 175 * s) / 255;
    g = (150 * (1 - s) + 215 * s) / 255;
    b = (92 * (1 - s) + 85 * s) / 255;
  } else {
    // Yellow-green to yellow
    const s = (t - 0.75) * 4;
    r = (175 * (1 - s) + 253 * s) / 255;
    g = (215 * (1 - s) + 231 * s) / 255;
    b = (85 * (1 - s) + 36 * s) / 255;
  }

  return [r, g, b];
}

// KL divergence surface mesh
function KLSurface({ pDistribution, reverse }: { 
  pDistribution: [number, number, number];
  reverse: boolean; // If true, compute D(q||p) instead of D(p||q)
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const resolution = 30; // Grid resolution for the surface (reduced for better mobile performance)
    const geometry = new THREE.BufferGeometry();

    // Create vertices and calculate KL divergence values
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Store vertex positions for creating triangles
    const vertexMap: Map<string, number> = new Map();
    let vertexIndex = 0;

    // Create grid of points on the simplex
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution - i; j++) {
        const probA = i / resolution;
        const probB = j / resolution;
        const probC = 1 - probA - probB;

        if (probC >= -0.001) {
          // Small tolerance for numerical errors
          // Ensure valid probability distribution with minimum probability constraint
          const minProb = 0.05; // Match the constraint used elsewhere
          const sum = probA + probB + probC;
          
          // Skip if sum is invalid
          if (sum <= 0 || !isFinite(sum)) continue;
          
          // Apply minimum probability constraint (same as in cartesianToBarycentric)
          const maxProb = 1 - 2 * minProb;
          const normalizedA = Math.max(minProb, Math.min(maxProb, probA / sum));
          const normalizedB = Math.max(minProb, Math.min(maxProb, probB / sum));
          const normalizedC = Math.max(minProb, Math.min(maxProb, probC / sum));
          
          // Re-normalize after applying constraints
          const newSum = normalizedA + normalizedB + normalizedC;
          
          // Skip if normalization failed
          if (newSum <= 0 || !isFinite(newSum)) continue;
          
          const q = [normalizedA / newSum, normalizedB / newSum, normalizedC / newSum];
          
          // Extra validation of the q distribution
          if (q.some(prob => !isFinite(prob) || prob <= 0)) continue;

          const [x, y] = barycentricToCartesian(q[0], q[1], q[2]);
          
          // Skip if coordinates are invalid
          if (!isFinite(x) || !isFinite(y)) continue;

          // Calculate KL divergence - either D(p||q) or D(q||p) based on reverse flag
          let z = reverse 
            ? klDivergence(q, pDistribution)  // D(q||p)
            : klDivergence(pDistribution, q);  // D(p||q)

          // Only add vertex if KL divergence is within bounds and valid
          if (isFinite(z) && z >= 0 && z <= 2) {
            vertices.push(x, y, z);

            // Use Viridis color scale - normalize KL divergence value
            const normalized = Math.min(1, Math.max(0, z / 2));
            const [r, g, b] = getViridisColor(normalized);
            colors.push(r, g, b);

            // Store vertex index for face creation
            vertexMap.set(`${i},${j}`, vertexIndex++);
          }
          // If z > 2 or infinite, don't add vertex (creates hole in surface)
        }
      }
    }

    // Create triangular faces
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution - i; j++) {
        // Check if all vertices of potential triangles exist
        const v1 = vertexMap.get(`${i},${j}`);
        const v2 = vertexMap.get(`${i},${j + 1}`);
        const v3 = vertexMap.get(`${i + 1},${j}`);
        const v4 = vertexMap.get(`${i + 1},${j + 1}`);

        // First triangle
        if (v1 !== undefined && v2 !== undefined && v3 !== undefined) {
          indices.push(v1, v2, v3);
        }

        // Second triangle
        if (v2 !== undefined && v3 !== undefined && v4 !== undefined) {
          indices.push(v2, v4, v3);
        }
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [pDistribution, reverse]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.8} shininess={100} />
    </mesh>
  );
}

// Triangle boundary lines
function TriangleBoundary() {
  const points = [
    [-1, -0.577, 0],
    [1, -0.577, 0],
    [0, 1.155, 0],
    [-1, -0.577, 0],
  ] as [number, number, number][];

  return (
    <>
      <Line points={points} color="black" lineWidth={2} />
      {/* Add labels for vertices */}
      <Text position={[-1.2, -0.8, 0]} fontSize={0.15} color="black">
        A
      </Text>
      <Text position={[1.2, -0.8, 0]} fontSize={0.15} color="black">
        B
      </Text>
      <Text position={[0, 1.4, 0]} fontSize={0.15} color="black">
        C
      </Text>
    </>
  );
}

// Grid lines inside the triangle for better visualization
function SimplexGrid() {
  const lines = [];
  const resolution = 10;

  // Create grid lines parallel to each edge
  for (let i = 1; i < resolution; i++) {
    const t = i / resolution;

    // Lines parallel to AB edge
    const a1 = barycentricToCartesian(1 - t, 0, t);
    const a2 = barycentricToCartesian(0, 1 - t, t);
    lines.push(
      <Line
        key={`ab-${i}`}
        points={[
          [a1[0], a1[1], 0],
          [a2[0], a2[1], 0],
        ]}
        color="#e0e0e0"
        lineWidth={0.5}
      />,
    );

    // Lines parallel to BC edge
    const b1 = barycentricToCartesian(t, 1 - t, 0);
    const b2 = barycentricToCartesian(t, 0, 1 - t);
    lines.push(
      <Line
        key={`bc-${i}`}
        points={[
          [b1[0], b1[1], 0],
          [b2[0], b2[1], 0],
        ]}
        color="#e0e0e0"
        lineWidth={0.5}
      />,
    );

    // Lines parallel to CA edge
    const c1 = barycentricToCartesian(0, t, 1 - t);
    const c2 = barycentricToCartesian(1 - t, t, 0);
    lines.push(
      <Line
        key={`ca-${i}`}
        points={[
          [c1[0], c1[1], 0],
          [c2[0], c2[1], 0],
        ]}
        color="#e0e0e0"
        lineWidth={0.5}
      />,
    );
  }

  return <>{lines}</>;
}

type InteractionMode = "move-ball" | "move-view";

export default function KLDivergenceSimplex() {
  // Initialize ball at center of triangle (uniform distribution)
  const [ballPosition, setBallPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("move-ball");
  const [reverseKL, setReverseKL] = useState(false); // Toggle between D(p||q) and D(q||p)

  // Convert ball position to probability distribution
  const pDistribution = useMemo(() => {
    return cartesianToBarycentric(ballPosition[0], ballPosition[1]);
  }, [ballPosition]);

  return (
    <div className="w-full" style={{ maxWidth: "100%", margin: "0 auto" }}>
      <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2">KL Divergence on Probability Simplex</h3>

        {/* Display current distribution */}
        <div className="mb-2 sm:mb-4 text-xs sm:text-sm">
          <p className="font-medium">Selected distribution p:</p>
          <p className="font-mono text-xs sm:text-sm">
            P(A) = {pDistribution[0].toFixed(3)}, P(B) = {pDistribution[1].toFixed(3)}, P(C) ={" "}
            {pDistribution[2].toFixed(3)}
          </p>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm">
            Drag the blue ball to change the distribution. The surface shows {reverseKL ? "D(q || p)" : "D(p || q)"} for all q.
            <br />
            <span className="text-xs">All probabilities are constrained to be ≥ 0.05 for numerical stability.</span>
          </p>
        </div>

        {/* 3D Canvas - responsive height */}
        <div
          className="relative w-full"
          style={{
            height: "min(500px, 60vh)",
            cursor: interactionMode === "move-ball" 
              ? (isDragging ? "grabbing" : "grab")
              : "move",
          }}
        >
          <Canvas camera={{ position: [0, -4, 3], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <pointLight position={[-10, -10, 10]} />

            {/* Simplex triangle and grid */}
            <SimplexGrid />
            <TriangleBoundary />

            {/* KL divergence surface */}
            <KLSurface pDistribution={pDistribution} reverse={reverseKL} />

            {/* Draggable ball */}
            <DraggableBall 
              position={ballPosition} 
              setPosition={setBallPosition} 
              onDragChange={setIsDragging}
              enabled={interactionMode === "move-ball"}
            />

            {/* Orbit controls only when in move-view mode */}
            {interactionMode === "move-view" && (
              <OrbitControls 
                enablePan={true}
                enableRotate={true}
                enableZoom={true}
              />
            )}
          </Canvas>
        </div>

        {/* Control buttons */}
        <div className="space-y-2 mt-4">
          {/* Mode toggle buttons */}
          <div className="flex justify-center gap-2">
            {(["move-ball", "move-view"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInteractionMode(mode)}
                className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                  interactionMode === mode 
                    ? "bg-blue-500 text-white shadow-sm" 
                    : "bg-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {mode === "move-ball" ? "Move Ball" : "Move View"}
              </button>
            ))}
          </div>

          {/* KL direction toggle buttons */}
          <div className="flex justify-center gap-2">
            {[false, true].map((reverse) => (
              <button
                key={reverse ? "reverse" : "forward"}
                onClick={() => setReverseKL(reverse)}
                className={`px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                  reverseKL === reverse 
                    ? "bg-green-500 text-white shadow-sm" 
                    : "bg-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {reverse ? "D(q || p)" : "D(p || q)"}
              </button>
            ))}
          </div>
        </div>

        {/* Density scale bar - matching MaxEntropyVisualization */}
        <div className="mt-4 sm:mt-6 max-w-md mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-xs sm:text-sm font-medium">Density scale</div>
            <span className="text-xs font-medium">Low</span>
            <div
              className="flex-1 h-5 sm:h-6 rounded-lg"
              style={{
                background:
                  "linear-gradient(to right, rgb(68,1,84), rgb(49,54,149), rgb(42,150,92), rgb(175,215,85), rgb(253,231,36))",
              }}
            />
            <span className="text-xs font-medium">High</span>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">Surface only shown where KL divergence ≤ 2</p>
        </div>
      </div>
    </div>
  );
}
