import ExpandableImage from "./ExpandableImage";
import React from "react";
import ReactMarkdown from "react-markdown";

interface ImageItem {
  src: string;
  alt: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  caption?: string;
  height?: number;
  fullWidth?: boolean;
  // Optional custom width (e.g., "75%" or "500px") for single-image galleries.
  width?: string | number;
  /** If true, caption will have minimal spacing (closer to image). */
  compactCaption?: boolean;
}

const DEFAULT_HEIGHT = 160;

export default function ImageGallery({
  images,
  caption,
  height = DEFAULT_HEIGHT,
  fullWidth = false,
  width,
  compactCaption = false,
}: ImageGalleryProps) {
  // Special handling for single image
  if (images.length === 1) {
    const image = images[0];
    return (
      <div className="my-6">
        <div className="w-full flex justify-center">
          <div className="inline-block rounded shadow-sm overflow-hidden bg-white" style={
            width ? { width } : 
            fullWidth ? { width: "100%" } : 
            {}
          }>
            <ExpandableImage 
              src={image.src} 
              alt={image.alt} 
              className="block w-auto h-auto" 
              style={
                !width && !fullWidth ? { maxHeight: `${height * 1.5}px`, maxWidth: "90%" } : {}
              }
            />
          </div>
        </div>
        {/* Markdown caption below */}
        <div
          className={`text-center text-sm italic font-medium text-gray-700 max-w-2xl mx-auto min-h-[1.5em] ${compactCaption ? "mt-0 px-2 py-0" : "mt-0.5 px-4 py-0.5"}`}
        >
          {typeof caption === "string" ? <ReactMarkdown>{caption}</ReactMarkdown> : caption || null}
        </div>
      </div>
    );
  }

  return (
    <div className="my-6">
      {/* Images grid */}
      <div className="w-full">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 place-items-center justify-center mx-auto"
          style={{ width: "fit-content" }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              style={{
                height: `${height}px`,
                width: "100%",
                maxWidth: `${height * 1.2}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              className="rounded shadow-sm overflow-hidden mx-auto bg-white"
            >
              <ExpandableImage src={image.src} alt={image.alt} className="w-full h-full object-contain block" />
            </div>
          ))}
        </div>
      </div>
      {/* Markdown caption below (always rendered) */}
      <div
        className={`text-center text-sm italic font-medium text-gray-700 max-w-2xl mx-auto min-h-[1.5em] ${compactCaption ? "mt-0 px-2 py-0" : "px-4 py-0.5 mt-0.5"}`}
      >
        {typeof caption === "string" ? <ReactMarkdown>{caption}</ReactMarkdown> : caption || null}
      </div>
    </div>
  );
}
