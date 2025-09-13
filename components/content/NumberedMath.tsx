"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEquationContext } from "./EquationContext";
import { KATEX_MACROS } from "@/lib/katex-macros";

interface NumberedMathProps {
  math: string;
  displayMode?: boolean;
  throwOnError?: boolean;
  macros?: Record<string, string>;
  id?: string; // Optional ID for numbered equations
}

const NumberedMath: React.FC<NumberedMathProps> = ({
  math,
  displayMode = false,
  throwOnError = false,
  macros = KATEX_MACROS,
  id,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const { getEquationNumber, registerEquation } = useEquationContext();
  const [equationNumber, setEquationNumber] = useState<number | null>(null);

  // Register equation number on mount to avoid hydration issues
  useEffect(() => {
    if (id) {
      const existingNumber = getEquationNumber(id);
      if (existingNumber !== null) {
        setEquationNumber(existingNumber);
      } else {
        const newNumber = registerEquation(id);
        setEquationNumber(newNumber);
      }
    }
  }, [id, getEquationNumber, registerEquation]);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Clear the container before rendering to prevent duplicate content
        containerRef.current.innerHTML = '';
        katex.render(math, containerRef.current, {
          throwOnError,
          displayMode,
          macros,
          trust: true,
        });
      } catch (error) {
        console.error("KaTeX render error:", error);
        if (containerRef.current) {
          if (error instanceof Error) {
            containerRef.current.textContent = `Error: ${error.message}`;
          } else {
            containerRef.current.textContent = `Error: An unknown error occurred`;
          }
        }
      }
    }
  }, [math, displayMode, throwOnError, macros, equationNumber]);

  // For display mode equations (numbered or not), keep a stable layout to avoid duplicate renders
  if (displayMode) {
    const showNumber = Boolean(id) && equationNumber !== null;
    return (
      <span style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        margin: '1rem 0'
      }}>
        <span 
          className="katex-display-wrapper"
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            textAlign: 'center'
          }}
        >
          <span ref={containerRef} style={{ display: 'inline-block' }} />
        </span>
        <span style={{ 
          fontSize: '1rem', 
          color: '#666',
          marginLeft: '2rem',
          fontFamily: 'inherit',
          flexShrink: 0
        }} hidden={!showNumber} aria-hidden={!showNumber}>
          {showNumber ? `(${equationNumber})` : null}
        </span>
      </span>
    );
  }

  // For inline equations, use the simple version
  return <span ref={containerRef} />;
};

export default NumberedMath;