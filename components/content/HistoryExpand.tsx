import Expand from "./Expand";
import React from "react";

interface HistoryExpandProps {
  children: React.ReactNode;
  headline: React.ReactNode;
  img?: string;
  startOpen?: boolean;
  id?: string;
}

export default function HistoryExpand({
  children,
  headline,
  img,
  startOpen = false,
  id,
}: HistoryExpandProps) {
  return (
    <Expand
      headline={headline}
      img={img}
      startOpen={startOpen}
      id={id}
      color="#f5f5f5"        // Same gray as normal expand box content
      headerColor="#e6f3ff"  // Light blue header to indicate historical content
    >
      {children}
    </Expand>
  );
}