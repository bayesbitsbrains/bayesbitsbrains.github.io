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
  /** Default pixel height for each image tile (keeps aspect ratio). */
  height?: number;
  /** Single image only: makes the container span the full width. */
  fullWidth?: boolean;
  /** Single image only: explicit container width (e.g., "75%" or 500). */
  width?: string | number;
  /** If true, caption has minimal spacing. */
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
          {images.map((image, idx) => (
            <div
              key={`${image.src}-${idx}`}
              className="flex items-center justify-center"
              style={{
                // The tile's height is the control knob. Width is content-driven.
                height: `${height}px`,
                // Keep tiles from growing too wide while still allowing responsiveness.
                maxWidth: "100%",
              }}
            >
              <ExpandableImage
                src={image.src}
                alt={image.alt}
                // Make the image fit the tile without cropping and without extra frames.
                className="block max-h-full max-w-full object-contain"
                // Ensure the img actually takes the tile's height and shrinks as needed.
                style={{ height: "100%", width: "auto" }}
              />
            </div>
          ))}
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
