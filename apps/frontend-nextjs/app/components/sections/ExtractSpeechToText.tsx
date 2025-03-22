"use client";

import React, { useState, useEffect } from "react";
import ProgressBar from "../ui/ProgressBar";

interface ExtractSpeechToTextProps {
  progress?: number;
  text?: string;
}

export default function ExtractSpeechToText({
  progress = 100,
  text = "This may take a few minutes...",
}: ExtractSpeechToTextProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-100">
        Extracting Speech from Video
      </h2>
      <ProgressBar progress={progress} text={text} />
      <div className="text-gray-300 text-xl font-medium text-center">
        Elapsed time: {formatTime(elapsedTime)}
      </div>
    </div>
  );
}
