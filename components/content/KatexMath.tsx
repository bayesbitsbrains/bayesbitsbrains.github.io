// components/KatexRenderer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css"; // Make sure this path is correct
import { KATEX_MACROS } from "@/lib/katex-macros";

interface KatexMathProps {
  math: string;
  displayMode?: boolean;
  throwOnError?: boolean;
  macros?: Record<string, string>; // More specific type for simple string replacement macros
}

const KatexMath: React.FC<KatexMathProps> = ({
  math,
  displayMode = false,
  throwOnError = false,
  macros = KATEX_MACROS,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          throwOnError,
          displayMode,
          macros,
          trust: true, // if you need this for \href or similar
        });
      } catch (error) {
        console.error("KaTeX render error:", error);
        if (containerRef.current) {
          // Display a fallback message or the raw math string on error
          if (error instanceof Error) {
            containerRef.current.textContent = `Error: ${error.message}`;
          } else {
            containerRef.current.textContent = `Error: An unknown error occurred`;
          }
        }
      }
    }
  }, [math, displayMode, throwOnError, macros]);

  return <span ref={containerRef} />;
};

export default KatexMath;
