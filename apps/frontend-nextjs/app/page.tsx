"use client";

import { useState, useEffect } from "react";
import VideoUploader from "./components/video/VideoUploader";
import VideoProcessor from "./components/video/VideoProcessor";
import ProgressBar from "./components/ui/ProgressBar";
import DownloadSection from "./components/sections/DownloadSection";
import SubtitlesSection from "./components/sections/SubtitlesSection";
import type { ProcessingOptions } from "./lib/types";

type VideoMetadata = {
  fileId: string;
  dimensions: {
    width: number;
    height: number;
  };
  localUrl: string;
};

type TranscriptionData = {
  text: string;
  styles: {
    fontSize: number;
    color: string;
    borderSize: number;
    borderColor: string;
    verticalPosition: number;
    volume: number;
  };
};

export default function Home() {
  // Flow control
  const [currentSection, setCurrentSection] = useState<
    | "upload"
    | "ratio"
    | "crop"
    | "transcribe"
    | "extracting"
    | "edit"
    | "process"
    | "download"
  >("upload");

  // Video data
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(
    null
  );
  const [selectedRatio, setSelectedRatio] = useState<"16:9" | "9:16">("9:16");
  const [cropPosition, setCropPosition] = useState(50);
  // Transcription options
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [language, setLanguage] = useState<"english" | "hebrew">("hebrew");

  // Processing state
  const [transcriptionData, setTranscriptionData] =
    useState<TranscriptionData | null>(null);
  const [progress, setProgress] = useState(0);
  const [processedFiles, setProcessedFiles] = useState<{
    videoUrl?: string;
    srtUrl?: string;
    transcriptUrl?: string;
  }>({});
  const [error, setError] = useState<string>("");
  const [shouldProcessVideo, setShouldProcessVideo] = useState(false);

  useEffect(() => {
    if (shouldProcessVideo && transcriptionData) {
      handleProcessVideo();
      setShouldProcessVideo(false);
    }
  }, [shouldProcessVideo, transcriptionData]);

  const handleVideoSelect = async (file: File) => {
    try {
      setError("");

      // Clean up previous URL if it exists
      if (videoMetadata?.localUrl) {
        URL.revokeObjectURL(videoMetadata.localUrl);
      }

      const formData = new FormData();
      formData.append("file", file);

      const localUrl = URL.createObjectURL(file);

      const response = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        URL.revokeObjectURL(localUrl);
        throw new Error(result.detail?.message || "Failed to upload video");
      }

      if (result.success) {
        setVideoMetadata({
          fileId: result.data.file_id,
          dimensions: result.data.dimensions,
          localUrl,
        });
        setCurrentSection("ratio");
      } else {
        URL.revokeObjectURL(localUrl);
        throw new Error("Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video");
      console.error("Upload error:", err);
    }
  };

  const handleRatioSelect = (ratio: "16:9" | "9:16") => {
    setSelectedRatio(ratio);
    setCurrentSection("crop");
  };

  const handleCropSettings = (position: number) => {
    setCropPosition(position);
    setCurrentSection("transcribe");
  };

  const handleTranscriptionSettings = async (
    enabled: boolean,
    burn: boolean,
    lang: "english" | "hebrew"
  ) => {
    setTranscriptionEnabled(enabled);
    setBurnSubtitles(burn);
    setLanguage(lang);

    if (enabled && videoMetadata) {
      try {
        setCurrentSection("extracting");
        setError("");

        const response = await fetch(
          `http://localhost:8000/api/videos/${videoMetadata.fileId}/transcribe`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              language: lang,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail?.message || "Failed to transcribe video"
          );
        }

        if (result.success) {
          setTranscriptionData({
            text: result.data.text,
            styles: {
              fontSize: 16,
              color: "#FFFFFF",
              borderSize: 1,
              borderColor: "#000000",
              verticalPosition: 40,
              volume: 100,
            },
          });
          setCurrentSection("edit");
        } else {
          throw new Error("Transcription failed");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to transcribe video"
        );
        console.error("Transcription error:", err);
        setCurrentSection("transcribe");
      }
    } else {
      handleProcessVideo();
    }
  };

  const handleTranscriptionEdit = (
    text: string,
    volume: number,
    styles: TranscriptionData["styles"]
  ) => {
    setTranscriptionData({ text, styles });
    setShouldProcessVideo(true);
  };

  const handleProcessVideo = async () => {
    if (!videoMetadata) return;

    try {
      setError("");
      setCurrentSection("process");
      setProgress(0);

      const requestBody = {
        target_ratio: selectedRatio,
        position: cropPosition,
        volume: transcriptionData?.styles.volume ?? 100,
        language: transcriptionEnabled ? language : undefined,
        burn_subtitles: burnSubtitles,
        subtitles: transcriptionData,
      };

      const response = await fetch(
        `http://localhost:8000/api/videos/${videoMetadata.fileId}/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail?.message || "Failed to process video");
      }

      if (result.success) {
        setProcessedFiles({
          videoUrl: `http://localhost:8000/api/files/${result.data.output_file
            .split("/")
            .pop()}`,
          ...(result.data.transcript_files?.srt && {
            srtUrl: `http://localhost:8000/api/files/${result.data.transcript_files.srt
              .split("/")
              .pop()}`,
          }),
          ...(result.data.transcript_files?.txt && {
            transcriptUrl: `http://localhost:8000/api/files/${result.data.transcript_files.txt
              .split("/")
              .pop()}`,
          }),
        });
        setProgress(100);
        setCurrentSection("download");
      } else {
        throw new Error("Processing failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process video");
      console.error("Processing error:", err);
      setCurrentSection("crop");
    }
  };

  const handleNewVideo = () => {
    if (videoMetadata?.localUrl) {
      URL.revokeObjectURL(videoMetadata.localUrl);
    }
    setCurrentSection("upload");
    setProgress(0);
    setProcessedFiles({});
    setVideoMetadata(null);
    setSelectedRatio("16:9");
    setCropPosition(50);
    setTranscriptionEnabled(false);
    setBurnSubtitles(false);
    setLanguage("english");
    setTranscriptionData(null);
    setError("");
  };

  // Clean up URL only when component unmounts or when starting a new video
  useEffect(() => {
    return () => {
      if (videoMetadata?.localUrl) {
        URL.revokeObjectURL(videoMetadata.localUrl);
      }
    };
  }, []); // Empty dependency array to only run on unmount

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-100">
        Video Editor
      </h1>
      <div className="max-w-[1200px] mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-lg">
            {error}
          </div>
        )}

        {currentSection === "upload" && (
          <VideoUploader onVideoSelect={handleVideoSelect} />
        )}

        {currentSection === "ratio" && videoMetadata && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-100">
              Choose Aspect Ratio
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleRatioSelect("16:9")}
                className={`p-4 rounded-lg ${
                  selectedRatio === "16:9" ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                16:9 (Horizontal)
              </button>
              <button
                onClick={() => handleRatioSelect("9:16")}
                className={`p-4 rounded-lg ${
                  selectedRatio === "9:16" ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                9:16 (Vertical)
              </button>
            </div>
          </div>
        )}

        {currentSection === "crop" && videoMetadata && (
          <VideoProcessor
            onProcessVideo={(options) =>
              handleCropSettings(options.cropPosition)
            }
            fileId={videoMetadata.fileId}
            localVideoUrl={videoMetadata.localUrl}
            dimensions={videoMetadata.dimensions}
            aspectRatio={selectedRatio}
          />
        )}

        {currentSection === "transcribe" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-100">
              Transcription Options
            </h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={transcriptionEnabled}
                  onChange={(e) => setTranscriptionEnabled(e.target.checked)}
                  className="form-checkbox"
                />
                <span>Enable Speech-to-Text</span>
              </label>

              {transcriptionEnabled && (
                <>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={burnSubtitles}
                      onChange={(e) => setBurnSubtitles(e.target.checked)}
                      className="form-checkbox"
                    />
                    <span>Burn Subtitles into Video</span>
                  </label>

                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as "english" | "hebrew")
                    }
                    className="form-select bg-gray-700 text-white"
                  >
                    <option value="english">English</option>
                    <option value="hebrew">Hebrew</option>
                  </select>
                </>
              )}

              <button
                onClick={() =>
                  handleTranscriptionSettings(
                    transcriptionEnabled,
                    burnSubtitles,
                    language
                  )
                }
                className="px-4 py-2 bg-blue-600 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {currentSection === "extracting" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-100">
              Extracting Speech from Video
            </h2>
            <ProgressBar progress={100} text="This may take a few minutes..." />
          </div>
        )}

        {currentSection === "edit" && (
          <SubtitlesSection
            isVisible={true}
            srtContent={transcriptionData?.text || ""}
            initialStyles={transcriptionData?.styles}
            onSave={handleTranscriptionEdit}
            onSkip={() => handleProcessVideo()}
            localVideoUrl={videoMetadata?.localUrl}
          />
        )}

        {currentSection === "process" && (
          <ProgressBar progress={progress} text="Processing video..." />
        )}

        {currentSection === "download" && (
          <DownloadSection
            onNewVideo={handleNewVideo}
            videoUrl={processedFiles.videoUrl}
            srtUrl={processedFiles.srtUrl}
            transcriptUrl={processedFiles.transcriptUrl}
          />
        )}
      </div>
    </main>
  );
}
