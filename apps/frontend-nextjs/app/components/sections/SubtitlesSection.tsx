"use client";

import { useState, useEffect, useRef } from "react";

interface SubtitlesSectionProps {
  srtContent?: string;
  initialStyles?: SubtitleStyles;
  onSave: (subtitles: string, volume: number, styles: SubtitleStyles) => void;
  onSkip: () => void;
  isVisible: boolean;
  localVideoUrl?: string;
}

interface SubtitleStyles {
  fontSize: number;
  color: string;
  borderSize: number;
  borderColor: string;
  verticalPosition: number;
  volume: number;
}

export default function SubtitlesSection({
  srtContent = "",
  initialStyles,
  onSave,
  onSkip,
  isVisible,
  localVideoUrl,
}: SubtitlesSectionProps) {
  const [subtitleText, setSubtitleText] = useState(srtContent);
  const [volume, setVolume] = useState(100);
  const [styles, setStyles] = useState<SubtitleStyles>(
    initialStyles || {
      fontSize: 16,
      color: "#ffffff",
      borderSize: 1,
      borderColor: "#000000",
      verticalPosition: 90,
      volume: 100,
    }
  );
  const [isPlaying, setIsPlaying] = useState(false);

  // Create refs for DOM elements
  const previewRef = useRef<HTMLDivElement>(null);
  const sizeValueRef = useRef<HTMLSpanElement>(null);
  const borderValueRef = useRef<HTMLSpanElement>(null);
  const yValueRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeValueRef = useRef<HTMLSpanElement>(null);

  // Update text when srtContent changes
  useEffect(() => {
    setSubtitleText(srtContent);
  }, [srtContent]);

  // Update styles when initialStyles changes
  useEffect(() => {
    if (initialStyles) {
      setStyles(initialStyles);
    }
  }, [initialStyles]);

  // Update preview when styles change
  useEffect(() => {
    updateSubtitlePreview();
  }, [styles]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const updateSubtitlePreview = () => {
    if (!previewRef.current) return;

    const preview = previewRef.current;
    preview.style.fontSize = `${styles.fontSize}px`;
    preview.style.color = styles.color;
    preview.style.textShadow =
      styles.borderSize > 0
        ? `0 0 ${styles.borderSize}px ${styles.borderColor}`
        : "none";
    preview.style.bottom = `${styles.verticalPosition}%`;
  };

  const handleStyleChange = (
    key: keyof SubtitleStyles,
    value: number | string
  ) => {
    setStyles((prev) => ({ ...prev, [key]: value }));

    // Update value displays
    const displays: { [key: string]: string } = {
      fontSize: `${value}px`,
      borderSize: `${value}px`,
      verticalPosition: `${value}%`,
    };

    // Update display values using refs
    switch (key) {
      case "fontSize":
        if (sizeValueRef.current) {
          sizeValueRef.current.textContent = displays[key];
        }
        break;
      case "borderSize":
        if (borderValueRef.current) {
          borderValueRef.current.textContent = displays[key];
        }
        break;
      case "verticalPosition":
        if (yValueRef.current) {
          yValueRef.current.textContent = displays[key];
        }
        break;
      case "volume":
        if (volumeValueRef.current) {
          volumeValueRef.current.textContent = displays[key];
        }
        break;
    }
  };

  if (!isVisible) return null;

  return (
    <div id="subtitle-editor" className="mt-4">
      <h3 className="text-xl font-semibold mb-4">Edit Subtitles</h3>
      <div className="alert alert-info bg-blue-50 p-4 rounded-lg mb-4 text-black">
        Edit the subtitles below. Keep the timing and subtitle numbers intact
        for proper synchronization.
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[70%]">
          <textarea
            id="subtitle-text"
            className="w-full p-4 border border-gray-300 rounded-lg mb-4 font-mono text-black"
            rows={15}
            value={subtitleText}
            onChange={(e) => setSubtitleText(e.target.value)}
          />

          <div
            id="subtitle-customization"
            className="bg-gray-50 p-4 rounded-lg mb-4"
          >
            <h4 className="text-lg font-semibold mb-3">Subtitle Appearance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Font Size
                </label>
                <input
                  type="range"
                  min={16}
                  max={72}
                  value={styles.fontSize}
                  className="w-full"
                  onChange={(e) =>
                    handleStyleChange("fontSize", parseInt(e.target.value))
                  }
                />
                <div className="text-sm text-gray-600 flex justify-between">
                  <span>16px</span>
                  <span ref={sizeValueRef}>{styles.fontSize}px</span>
                  <span>72px</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Font Color
                </label>
                <input
                  type="color"
                  value={styles.color}
                  className="h-10 w-full"
                  onChange={(e) => handleStyleChange("color", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Border Size
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={styles.borderSize}
                  className="w-full"
                  onChange={(e) =>
                    handleStyleChange("borderSize", parseInt(e.target.value))
                  }
                />
                <div className="text-sm text-gray-600 flex justify-between text-black">
                  <span>None</span>
                  <span ref={borderValueRef}>{styles.borderSize}px</span>
                  <span>5px</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Border Color
                </label>
                <input
                  type="color"
                  value={styles.borderColor}
                  className="h-10 w-full"
                  onChange={(e) =>
                    handleStyleChange("borderColor", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Vertical Position
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={styles.verticalPosition}
                  className="w-full"
                  onChange={(e) =>
                    handleStyleChange(
                      "verticalPosition",
                      parseInt(e.target.value)
                    )
                  }
                />
                <div className="text-sm text-gray-600 flex justify-between">
                  <span>Top</span>
                  <span ref={yValueRef}>{styles.verticalPosition}%</span>
                  <span>Bottom</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-black">
                  Volume
                </label>
                <input
                  type="range"
                  min={0}
                  max={300}
                  value={styles.volume}
                  className="w-full"
                  onChange={(e) =>
                    handleStyleChange("volume", parseInt(e.target.value))
                  }
                />
                <div className="text-sm text-gray-600 flex justify-between">
                  <span>Mute</span>
                  <span>{styles.volume}%</span>
                  <span>300%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => onSave(subtitleText, styles.volume, styles)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save and Render
            </button>
            <button
              onClick={onSkip}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Skip Editing
            </button>
          </div>
        </div>

        <div className="lg:w-[30%]">
          <div className="sticky top-4 space-y-6">
            {/* Video Preview */}
            {localVideoUrl && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Video Preview</h4>
                <div className="relative bg-gray-900 w-full rounded-lg overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    src={localVideoUrl}
                    className="w-full"
                    controls
                    controlsList="nodownload nofullscreen"
                    playsInline
                  />
                  <div
                    className="absolute inset-x-0 px-4 pointer-events-none"
                    style={{
                      bottom: `${styles.verticalPosition}%`,
                    }}
                  >
                    <div
                      className="text-center"
                      style={{
                        fontSize: `${styles.fontSize}px`,
                        color: styles.color,
                        textShadow:
                          styles.borderSize > 0
                            ? `0 0 ${styles.borderSize}px ${styles.borderColor}`
                            : "none",
                      }}
                    >
                      {subtitleText
                        .split("\n\n")[0]
                        ?.split("\n")
                        .slice(2)
                        .join("\n") || "Sample subtitle text"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-center">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
