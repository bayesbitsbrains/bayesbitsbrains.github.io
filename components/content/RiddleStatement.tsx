"use client";

import React, { useEffect } from "react";
import Expand from "./Expand";

// Static registry of riddle headlines
const RIDDLE_HEADLINES: Record<string, string> = {
  "intelligence": "🧠 Intelligence test",
  "predictions": "🔮 Who's less wrong?",
  "financial-mathematics": "📈 Modelling returns",
  "wikipedia": "🌐 How much information is on Wikipedia?",
  "statistics": "🦶 Average foot",
  "xkcd": "🤓 Explaining XKCD jokes",
  "machine-learning": "🤯 At a loss"
};

// Global map on window for riddle metadata
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__riddleRegistry = window.__riddleRegistry || {};
}

interface Props {
  id: string;
  headline?: string;
  children: React.ReactNode;
  startOpen?: boolean;
  openByDefault?: boolean;
}

export default function RiddleStatement({ id, headline, children, startOpen = false, openByDefault = false }: Props) {
  // Get headline from static registry or use provided one
  const resolvedHeadline = headline || RIDDLE_HEADLINES[id] || "Riddle";
  
  // Register headline globally so explanations can fetch it (for dynamic riddles)
  useEffect(() => {
    if (typeof window !== "undefined" && resolvedHeadline) {
      // @ts-ignore
      window.__riddleRegistry = window.__riddleRegistry || {};
      // @ts-ignore
      window.__riddleRegistry[id] = resolvedHeadline;
    }
  }, [id, resolvedHeadline]);

  // Use openByDefault if provided, otherwise use startOpen
  const shouldStartOpen = openByDefault || startOpen;

  return (
    <Expand id={id} headline={resolvedHeadline} color="#f5f5f5" headerColor="#d1fae5" startOpen={shouldStartOpen}>
      {children}
    </Expand>
  );
}
