"use client";

import React, { useEffect, useState, useCallback } from "react";
import Expand from "./Expand";
import RIDDLE_HEADLINES from "./riddleHeadlines";

interface Props {
  id: string;
  headline?: string;
  children: React.ReactNode;
  startOpen?: boolean;
}

export default function RiddleExplanation({ id, headline, children, startOpen = false }: Props) {
  const [resolvedHeadline, setResolvedHeadline] = useState<string>(headline ?? "");

  // Fetch headline from static registry or global registry
  useEffect(() => {
    if (headline) {
      setResolvedHeadline(headline);
      return;
    }

    // First check static registry
    if (RIDDLE_HEADLINES[id]) {
      setResolvedHeadline(RIDDLE_HEADLINES[id]);
      return;
    }

    // Fallback to global registry (for dynamic riddles)
    if (typeof window !== "undefined") {
      // @ts-ignore
      const registry = window.__riddleRegistry || {};
      if (registry[id]) {
        setResolvedHeadline(registry[id]);
      }
    }
  }, [headline, id]);

  const handleBack = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (typeof window === "undefined") return;
      const el = document.getElementById(id);
      if (el) {
        // attempt to open
        const header = el.querySelector('[class*="header"]') as HTMLElement | null;
        if (header) header.click();

        // Scroll to 75% from top (25% from viewport top) like the Expand component
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = scrollTop + rect.top - window.innerHeight * 0.25;

        window.scrollTo({
          top: targetY,
          behavior: "smooth",
        });
      }
    },
    [id],
  );

  const displayHeadline = resolvedHeadline || "Riddle";

  return (
    <Expand headline={displayHeadline} color="#f5f5f5" headerColor="#d1fae5" startOpen={startOpen}>
      {children}
    </Expand>
  );
}
