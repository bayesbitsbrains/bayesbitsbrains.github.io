import ExpandableImage from "./ExpandableImage";
import React from "react";
import ReactMarkdown from "react-markdown";

interface ImageItem {
  src: string;
  alt: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  caption?: React.ReactNode | string;
  /** Default tile height (keeps aspect ratio). Accepts number (px) or CSS length. */
  height?: number | string;
  /** Single image only: makes the container span the full width. */
  fullWidth?: boolean;
  /** Single image only: explicit container width (e.g., "75%" or 500). */
  width?: string | number;
  /** If true, caption has minimal spacing. */
  compactCaption?: boolean;

  /** NEW: How to size each tile. "height" keeps your current behavior, "width" makes tiles fill by width. */
  fit?: "height" | "width";
  /** NEW: When fit="width" and there are multiple images, controls each tile's width. 
   * For a single image, the tile defaults to 100% of the single-container width. */
  tileWidth?: number | string;
}

const DEFAULT_HEIGHT = 160;

export default function ImageGallery({
  images,
  caption,
  height = DEFAULT_HEIGHT,
  fullWidth = false,
  width,
  compactCaption = false,
  fit = "height",
  tileWidth,
}: ImageGalleryProps) {
  const isSingle = images.length === 1;

  // For a single image we allow controlling the outer container width.
  const singleContainerStyle: React.CSSProperties =
    !isSingle
      ? {}
      : width != null
      ? { width }
      : fullWidth
      ? { width: "100%" }
      : {};

  return (
    <figure className="my-6">
      {/* Outer centering wrapper */}
      <div className="w-full flex justify-center">
        {/* Image strip (wraps for multiple images) */}
        <div
          className={`flex ${isSingle ? "" : "flex-wrap gap-4"} justify-center`}
          style={singleContainerStyle}
        >
          {images.map((image, idx) => {
            // Size the *tile* either by fixed height or by width.
            const tileStyle: React.CSSProperties =
              fit === "width"
                ? {
                    width: isSingle ? "100%" : tileWidth ?? 260,
                    maxWidth: "100%",
                  }
                : {
                    height:
                      typeof height === "number" ? `${height}px` : height,
                    maxWidth: "100%",
                  };

            // Size the <img> itself to fill that tile in the chosen dimension.
            const imgStyle: React.CSSProperties =
              fit === "width"
                ? { width: "100%", height: "auto" }
                : { height: "100%", width: "auto" };

            return (
              <div
                key={`${image.src}-${idx}`}
                className="flex items-center justify-center"
                style={tileStyle}
              >
                <ExpandableImage
                  src={image.src}
                  alt={image.alt}
                  // Make the image fit the tile without cropping or extra frames.
                  className="block max-h-full max-w-full object-contain"
                  style={imgStyle}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <figcaption
        className={[
          "text-center text-sm italic font-medium text-gray-700 max-w-2xl mx-auto min-h-[1.5em]",
          compactCaption ? "mt-0 px-2 py-0" : "mt-0.5 px-4 py-0.5",
        ].join(" ")}
      >
        {typeof caption === "string" ? (
          <ReactMarkdown>{caption}</ReactMarkdown>
        ) : (
          caption || null
        )}
      </figcaption>
    </figure>
  );
}
