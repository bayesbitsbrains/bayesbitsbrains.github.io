"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEquationContext } from "./EquationContext";

const default_macros: Record<string, string> = { "\\R": "\\mathbb{R}", "\\eps": "\\varepsilon" };

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
  macros = default_macros,
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

  // For display mode equations (numbered or not), add horizontal scrolling
  if (displayMode) {
    if (id && equationNumber !== null) {
      // Numbered equation with scroll - use span with block display to avoid div in p error
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
          }}>
            ({equationNumber})
          </span>
        </span>
      );
    } else {
      // Unnumbered display equation with scroll - use span with block display to avoid div in p error
      return (
        <span 
          className="katex-display-wrapper"
          style={{
            display: 'block',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            margin: '1rem 0',
            textAlign: 'center'
          }}
        >
          <span ref={containerRef} style={{ display: 'inline-block' }} />
        </span>
      );
    }
  }

  // For inline equations, use the simple version
  return <span ref={containerRef} />;
};

export default NumberedMath;