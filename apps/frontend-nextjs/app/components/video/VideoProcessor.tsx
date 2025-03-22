"use client";

import { useState, useEffect, useRef } from "react";
import type { ProcessingOptions } from "../../lib/types";

export interface VideoProcessorProps {
  onProcessVideo: (options: ProcessingOptions) => void;
  fileId: string;
  localVideoUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  aspectRatio: "16:9" | "9:16";
}

export default function VideoProcessor({
  onProcessVideo,
  fileId,
  localVideoUrl,
  dimensions,
  aspectRatio,
}: VideoProcessorProps) {
  const [cropPosition, setCropPosition] = useState<number>(50);
  const [language, setLanguage] = useState<string>("");
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const cropHandleRef = useRef<HTMLDivElement>(null);
  const cropPreviewRef = useRef<HTMLVideoElement>(null);

  // Calculate original aspect ratio
  const originalRatio = dimensions.width / dimensions.height;
  const originalRatioFormatted = `${Math.round(originalRatio * 100) / 100}:1`;

  useEffect(() => {
    // Load the video source for both videos using the local URL
    if (videoRef.current) {
      videoRef.current.src = localVideoUrl;
      videoRef.current.addEventListener("play", () => {
        if (cropPreviewRef.current) {
          cropPreviewRef.current.currentTime = videoRef.current!.currentTime;
          cropPreviewRef.current.play();
        }
      });
      videoRef.current.addEventListener("pause", () => {
        if (cropPreviewRef.current) {
          cropPreviewRef.current.pause();
        }
      });
      videoRef.current.addEventListener("seeked", () => {
        if (cropPreviewRef.current) {
          cropPreviewRef.current.currentTime = videoRef.current!.currentTime;
        }
      });
    }
    if (cropPreviewRef.current) {
      cropPreviewRef.current.src = localVideoUrl;
    }

    // Add event listeners for video state
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoRef.current?.addEventListener("play", handlePlay);
    videoRef.current?.addEventListener("pause", handlePause);

    return () => {
      videoRef.current?.removeEventListener("play", handlePlay);
      videoRef.current?.removeEventListener("pause", handlePause);
    };
  }, [localVideoUrl]);

  useEffect(() => {
    // Update preview crop position when it changes
    if (videoRef.current && previewRef.current && cropPreviewRef.current) {
      const video = videoRef.current;
      const preview = previewRef.current;
      const cropPreview = cropPreviewRef.current;

      // Calculate dimensions
      let newWidth, newHeight, xOffset;
      const { width, height } = dimensions;

      if (aspectRatio === "9:16") {
        newWidth = height * (9 / 16);
        const maxOffset = width - newWidth;
        xOffset = (cropPosition / 100) * maxOffset;
      } else {
        newWidth = width;
        newHeight = width * (9 / 16);
        xOffset = 0;
      }

      // Apply the crop effect using scale and transform
      const scale = preview.clientWidth / newWidth;
      video.style.transform = `scale(${scale}) translateX(${-xOffset}px)`;
      video.style.transformOrigin = "left top";

      // Apply the same transform to the crop preview
      cropPreview.style.transform = `scale(${scale}) translateX(${-xOffset}px)`;
      cropPreview.style.transformOrigin = "left top";

      // Update crop handle position
      if (cropHandleRef.current && aspectRatio === "9:16") {
        const handleWidth = 4; // Width of the handle in pixels
        const containerWidth = preview.clientWidth;
        const position = (cropPosition / 100) * (containerWidth - handleWidth);
        cropHandleRef.current.style.left = `${position}px`;
      }
    }
  }, [cropPosition, aspectRatio, dimensions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Calculate position percentage
    let newPosition = (x / width) * 100;
    newPosition = Math.max(0, Math.min(100, newPosition));

    setCropPosition(newPosition);
    handleRangeOnChange(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleRangeOnChange = (newPosition: number) => {
    setCropPosition(newPosition);

    onProcessVideo({
      cropPosition,
      aspectRatio,
      language: language || undefined,
      burnSubtitles,
    });
  };

  const handleSubmit = () => {
    onProcessVideo({
      cropPosition,
      aspectRatio,
      language: language || undefined,
      burnSubtitles,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mt-10">
        <h2 className="text-2xl font-semibold text-gray-100">
          2. Adjust Crop Position
        </h2>
        <div className="text-gray-300 text-sm space-y-1">
          <div>
            Original: {dimensions.width}×{dimensions.height}px (
            {originalRatioFormatted})
          </div>
          <div>Target: {aspectRatio}</div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-gray-100">
            Crop Position ({Math.round(cropPosition)}%)
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={cropPosition}
            onChange={(e) => handleRangeOnChange(parseInt(e.target.value))}
            className="w-full"
            data-testid="crop-slider"
          />
        </label>

        <div className="flex flex-col items-center gap-8">
          {/* Original video with crop overlay */}
          <div className="relative">
            <div
              ref={previewRef}
              className={`relative bg-gray-900 rounded-lg overflow-hidden w-full max-w-[1200px] h-[300px]`}
              style={{
                aspectRatio:
                  originalRatio > 1
                    ? `${originalRatio}/1`
                    : `1/${1 / originalRatio}`,
              }}
              onMouseDown={handleMouseDown}
            >
              <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
                playsInline
                controls
                controlsList="nodownload nofullscreen"
              />
              {aspectRatio === "9:16" && (
                <>
                  {/* Crop guides */}
                  <div
                    className="absolute top-0 bottom-0 bg-black/50"
                    style={{
                      left: 0,
                      width: `${cropPosition}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 bg-black/50"
                    style={{
                      right: 0,
                      width: `${100 - cropPosition}%`,
                    }}
                  />
                  {/* Target ratio overlay */}
                  <div
                    className="absolute border-2 border-blue-500 pointer-events-none"
                    style={{
                      left: `${cropPosition}%`,
                      width: `${((9 / 16) * 100) / originalRatio}%`,
                      top: 0,
                      bottom: 0,
                      transform: "translateX(-50%)",
                    }}
                  />
                  {/* Draggable handle */}
                  <div
                    ref={cropHandleRef}
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                    style={{
                      left: `${cropPosition}%`,
                      transform: "translateX(-50%)",
                    }}
                    onMouseDown={handleMouseDown}
                  />
                </>
              )}
            </div>
          </div>

          <div className="mt-1 flex gap-4">
            <button
              onClick={togglePlay}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              {isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button> */}
      </div>
    </div>
  );
}
