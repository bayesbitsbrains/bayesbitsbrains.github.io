// components/widgets/FinanceSliderSP.tsx
"use client";

import React, { useState, useEffect } from "react";
import { getAssetPath } from "@/lib/utils";

type ImageItem = {
  src: string;
  index: number;
};

const generateImagePaths = (prefix: string, start: number, end: number, step: number): ImageItem[] => {
  const images: ImageItem[] = [];
  for (let i = start; i <= end; i += step) {
    const paddedIndex = String(i).padStart(4, "0");
    images.push({
      src: getAssetPath(`/financial/${prefix}_plot${paddedIndex}.png`),
      index: i,
    });
  }
  return images;
};

// S&P images only
const sapImages: ImageItem[] = generateImagePaths("sap", 20, 7460, 20);

const FinanceSliderSP: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [preloadProgress, setPreloadProgress] = useState<number>(0);

  // Preload the first few images for better UX
  useEffect(() => {
    const imagesToPreload = sapImages.slice(0, Math.min(10, sapImages.length)); // Preload first 10
    
    let loadedCount = 0;
    
    imagesToPreload.forEach((imageItem) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, imageItem.src]));
        loadedCount++;
        setPreloadProgress((loadedCount / imagesToPreload.length) * 100);
      };
      img.onerror = () => {
        loadedCount++;
        setPreloadProgress((loadedCount / imagesToPreload.length) * 100);
      };
      img.src = imageItem.src;
    });
  }, []);

  // Preload nearby images when currentIdx changes
  useEffect(() => {
    const preloadRange = 3; // Preload 3 images before and after current
    
    for (let i = Math.max(0, currentIdx - preloadRange); 
         i <= Math.min(sapImages.length - 1, currentIdx + preloadRange); 
         i++) {
      const imageItem = sapImages[i];
      if (!loadedImages.has(imageItem.src)) {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, imageItem.src]));
        };
        img.src = imageItem.src;
      }
    }
  }, [currentIdx, loadedImages]);

  // Ensure currentIdx is within bounds
  const safeCurrentIdx = Math.max(0, Math.min(currentIdx, sapImages.length - 1));

  if (sapImages.length === 0) {
    return (
      <div className="p-4 bg-red-50 rounded-md text-red-700">No S&P plots found.</div>
    );
  }

  // Safety check - don't render if we're in an invalid state
  if (safeCurrentIdx >= sapImages.length || !sapImages[safeCurrentIdx]) {
    return (
      <div className="p-4 bg-yellow-50 rounded-md text-yellow-700">Loading S&P data...</div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      {/* Image display */}
      <div className="flex justify-center">
        <div className="relative">
          {!loadedImages.has(sapImages[safeCurrentIdx].src) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md border">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm text-gray-600">Loading image...</div>
                {preloadProgress > 0 && (
                  <div className="text-xs text-gray-500 mt-1">{Math.round(preloadProgress)}% preloaded</div>
                )}
              </div>
            </div>
          )}
          <img
            src={sapImages[safeCurrentIdx].src}
            alt={`S&P 500 Plot ${sapImages[safeCurrentIdx].index}`}
            className={`max-w-full h-auto border rounded-md shadow-lg transition-opacity duration-300 ${
              loadedImages.has(sapImages[safeCurrentIdx].src) ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ maxHeight: '600px', minHeight: '400px' }}
            onError={(e) => {
              console.error('Image failed to load:', sapImages[safeCurrentIdx].src);
              (e.target as HTMLImageElement).style.border = '2px solid red';
            }}
            onLoad={() => {
              setLoadedImages(prev => new Set([...prev, sapImages[safeCurrentIdx].src]));
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">
            Past {sapImages[safeCurrentIdx].index} Days
          </div>
          <div className="text-sm text-gray-600">
            {safeCurrentIdx + 1} of {sapImages.length}
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, sapImages.length - 1)}
            step={1}
            value={safeCurrentIdx}
            onChange={(e) => setCurrentIdx(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          {/* Navigation buttons */}
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setCurrentIdx(Math.max(0, safeCurrentIdx - 1))}
              disabled={safeCurrentIdx === 0}
              className="px-3 py-1 bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentIdx(Math.min(sapImages.length - 1, safeCurrentIdx + 1))}
              disabled={safeCurrentIdx === sapImages.length - 1}
              className="px-3 py-1 bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSliderSP;