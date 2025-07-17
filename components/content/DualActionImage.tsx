"use client";

import React from "react";
import { getAssetPath } from "@/lib/utils";
import Link from "next/link";

interface DualActionImageProps {
  /** Image source */
  src: string;
  /** Alt text */
  alt?: string;
  /** Optional CSS width (e.g. "75%" or numeric px) */
  width?: string | number;
  /** Optional className for outer wrapper */
  className?: string;
}

/**
 * Displays an image with two invisible click-hotspots:
 * - Bottom-left: red pill that navigates to "/01-kl_intro"
 * - Bottom-right: blue pill that deletes the Morpheus content word by word
 *
 * Useful for the Matrix "red pill vs blue pill" illustration.
 */
export default function DualActionImage({ src, alt = "image", width = "75%", className = "" }: DualActionImageProps) {
  const handleBluePillClick = () => {
    window.location.href = 'about:blank';
  };
  return (
    <div
      className={`relative mx-auto my-6 flex justify-center ${className}`}
      style={typeof width === "string" ? { width } : { width }}
    >
      {/* The core image */}
      <img 
        src={getAssetPath(src)} 
        alt={alt} 
        className="block max-w-full h-auto select-none" 
        title="Image source: https://www.pngegg.com/en/png-nllqe/"
      />

      {/* Bottom-left clickable quadrant - Red pill (knowledge/journey) */}
      <Link
        href="/01-kl_intro"
        className="absolute bottom-0 left-0 hover:bg-red-300/20"
        style={{ width: "33%", height: "33%" }}
        aria-label="Take the red pill - Go to first chapter"
      />

      {/* Bottom-right clickable quadrant - Blue pill (ignorance/blank page) */}
      <button
        onClick={handleBluePillClick}
        className="absolute bottom-0 right-0 hover:bg-blue-300/20 cursor-pointer"
        style={{ width: "33%", height: "33%" }}
        aria-label="Take the blue pill - Open blank page"
      />

    </div>
  );
}
