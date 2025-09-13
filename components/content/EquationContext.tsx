"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

interface EquationContextType {
  getEquationNumber: (id: string) => number | null;
  registerEquation: (id: string) => number;
  getAllEquations: () => Record<string, number>;
}

const EquationContext = createContext<EquationContextType | null>(null);

interface EquationProviderProps {
  children: ReactNode;
}

export function EquationProvider({ children }: EquationProviderProps) {
  const [equations, setEquations] = useState<Record<string, number>>({});
  const nextNumberRef = useRef(1);

  const getEquationNumber = useCallback((id: string) => {
    if (equations[id]) {
      return equations[id];
    }
    
    // Return null for unregistered equations to avoid hydration issues
    return null;
  }, [equations]);

  const registerEquation = useCallback((id: string) => {
    // Check current state to prevent race conditions
    if (!equations[id]) {
      const number = nextNumberRef.current;
      nextNumberRef.current += 1;
      setEquations(prev => {
        // Double-check in the state updater to prevent duplicates
        if (prev[id]) {
          return prev;
        }
        return { ...prev, [id]: number };
      });
      return number;
    }
    return equations[id];
  }, [equations]);

  const getAllEquations = useCallback(() => equations, [equations]);

  return (
    <EquationContext.Provider value={{ getEquationNumber, registerEquation, getAllEquations }}>
      {children}
    </EquationContext.Provider>
  );
}

export function useEquationContext() {
  const context = useContext(EquationContext);
  if (!context) {
    throw new Error("useEquationContext must be used within an EquationProvider");
  }
  return context;
}