"use client";

import React from "react";
import VideoProcessor from "../video/VideoProcessor";

interface RatioVideoProps {
  selectedRatio: "16:9" | "9:16";
  onRatioSelect: (ratio: "16:9" | "9:16") => void;
  onProcessVideo: (options: { cropPosition: number }) => void;
  fileId: string;
  localVideoUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export default function RatioVideo({
  selectedRatio,
  onRatioSelect,
  onProcessVideo,
  fileId,
  localVideoUrl,
  dimensions,
}: RatioVideoProps) {
  return (
    <>
      <div className="space-y-4 mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
        <div className="flex gap-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-100">
            1. Choose Aspect Ratio
          </h2>
          <div>
            <button
              onClick={() => onRatioSelect("16:9")}
              className={`p-3 rounded-lg ${
                selectedRatio === "16:9" ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              16:9 (Horizontal)
            </button>
            <button
              onClick={() => onRatioSelect("9:16")}
              className={`p-3 rounded-lg ml-3 ${
                selectedRatio === "9:16" ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              9:16 (Vertical)
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-4 mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
        <VideoProcessor
          onProcessVideo={onProcessVideo}
          fileId={fileId}
          localVideoUrl={localVideoUrl}
          dimensions={dimensions}
          aspectRatio={selectedRatio}
        />
      </div>
    </>
  );
}
