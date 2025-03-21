"use client";

import { useState, useEffect } from "react";
import VideoUploader from "./components/video/VideoUploader";
import VideoProcessor from "./components/video/VideoProcessor";
import ProgressBar from "./components/ui/ProgressBar";
import DownloadSection from "./components/sections/DownloadSection";
import SubtitlesSection from "./components/sections/SubtitlesSection";
import TranscribeVideo from "./components/sections/TranscribeVideo";
import ExtractSpeechToText from "./components/sections/ExtractSpeechToText";
import RatioVideo from "./components/sections/RatioVideo";
import type { ProcessingOptions } from "./lib/types";
import { INITIAL_SUBTITLE_FONTS } from "./lib/consts";
import TrimSection from "./components/sections/TrimSection";

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
  styles: SubtitleStyles;
};

interface SubtitleStyles {
  fontSize: number;
  color: string;
  borderSize: number;
  borderColor: string;
  verticalPosition: number;
  volume: number;
  textDirection: "ltr" | "rtl";
  marginV: number;
  alignment: "2" | "5" | "8";
  fontType: string;
}

export default function Home() {
  // Flow control
  const [currentSection, setCurrentSection] = useState<
    | "upload"
    | "ratio"
    | "crop"
    | "trim"
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
  const [trimData, setTrimData] = useState<[number, number]>([0, 0]);
  // Transcription options
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [language, setLanguage] = useState<"english" | "hebrew">("hebrew");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAllFiles = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all files? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeletingAll(true);
      setError("");

      const response = await fetch(`http://localhost:8000/api/files/all`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail?.message || "Failed to delete all files"
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete all files"
      );
      console.error("Error deleting all files:", err);
    } finally {
      setIsDeletingAll(false);
    }
  };

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

  // Add state for subtitle styles
  const [subtitleText, setSubtitleText] = useState<string>("");
  const [subtitleStyles, setSubtitleStyles] = useState<
    SubtitleStyles | undefined
  >({
    fontSize: 16,
    color: "#fcfc00",
    borderSize: 1,
    borderColor: "#000000",
    verticalPosition: 90,
    volume: 100,
    textDirection: "rtl",
    marginV: 100, // Default to middle
    alignment: "2", // Default to middle center
    fontType: INITIAL_SUBTITLE_FONTS,
  });

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
  };

  const handleCropSettings = (position: number) => {
    setCropPosition(position);
    // setCurrentSection("trim");
  };

  const handleTrimSettings = (trim: [number, number]) => {
    setTrimData(trim);
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
              textDirection: lang === "hebrew" ? "rtl" : "ltr",
              fontSize: 16,
              color: "#fcfc00",
              borderSize: 1,
              borderColor: "#000000",
              verticalPosition: 90,
              volume: 100,
              marginV: 100,
              alignment: "2",
              fontType: INITIAL_SUBTITLE_FONTS,
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
    styles: SubtitleStyles
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

      // Ensure all required subtitle style fields are included
      const subtitleStyles: SubtitleStyles = transcriptionData?.styles || {
        fontSize: 16,
        color: "#e1ff00",
        borderSize: 1,
        borderColor: "#000000",
        verticalPosition: 90,
        volume: 100,
        textDirection: "rtl",
        marginV: 40,
        alignment: "2" as const,
        fontType: INITIAL_SUBTITLE_FONTS,
      };

      const requestBody = {
        target_ratio: selectedRatio,
        position: cropPosition,
        volume: transcriptionData?.styles.volume ?? 100,
        language: transcriptionEnabled ? language : undefined,
        burn_subtitles: burnSubtitles,
        subtitles: transcriptionData
          ? {
              text: transcriptionData.text,
              styles: subtitleStyles,
            }
          : undefined,
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

  // Update the handleBackToEdit function
  const handleBackToEdit = () => {
    setCurrentSection("edit");
    // Restore the previous subtitle text and styles
    if (transcriptionData) {
      setTranscriptionData(transcriptionData);
    }
    if (subtitleStyles) {
      setSubtitleStyles({
        ...subtitleStyles,
        textDirection: subtitleStyles.textDirection || "ltr", // Ensure textDirection is set
      });
    }
  };

  // Update the handleSaveSubtitles function
  const handleSaveSubtitles = (
    text: string,
    volume: number,
    styles: SubtitleStyles
  ) => {
    setSubtitleText(text);
    setSubtitleStyles(styles);
    setCurrentSection("process"); // Changed from "processing" to "process" to match the type
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-[1200px] mx-auto rounded-lg shadow-xl p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-lg">
            {error}
          </div>
        )}

        {currentSection === "upload" && (
          <VideoUploader
            onVideoSelect={handleVideoSelect}
            handleDeleteAllFiles={handleDeleteAllFiles}
            isDeletingAll={isDeletingAll}
            setIsDeletingAll={setIsDeletingAll}
          />
        )}

        {currentSection === "ratio" && videoMetadata && (
          <div className="space-y-4">
            <RatioVideo
              selectedRatio={selectedRatio}
              onRatioSelect={handleRatioSelect}
              onProcessVideo={(options) =>
                handleCropSettings(options.cropPosition)
              }
              fileId={videoMetadata.fileId}
              localVideoUrl={videoMetadata.localUrl}
              dimensions={videoMetadata.dimensions}
            />

            <TranscribeVideo
              transcriptionEnabled={transcriptionEnabled}
              burnSubtitles={burnSubtitles}
              language={language}
              onTranscriptionSettings={handleTranscriptionSettings}
            />
          </div>
        )}

        {currentSection === "trim" && (
          <TrimSection
            onTrimSettings={handleTrimSettings}
            trimData={trimData}
          />
        )}

        {currentSection === "extracting" && <ExtractSpeechToText />}

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
          <div className="space-y-4 mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
            <ProgressBar progress={progress} text="Processing video..." />
          </div>
        )}

        {currentSection === "download" && processedFiles.videoUrl && (
          <DownloadSection
            handleDeleteAllFiles={handleDeleteAllFiles}
            videoUrl={processedFiles.videoUrl}
            filename={`processed_${processedFiles.videoUrl}.mp4`}
            srtUrl={processedFiles.srtUrl}
            transcriptUrl={processedFiles.transcriptUrl}
            onNewVideo={handleNewVideo}
            onBackToEdit={handleBackToEdit}
            fileId={videoMetadata?.fileId || ""}
            isDeletingAll={isDeletingAll}
            setIsDeletingAll={setIsDeletingAll}
            isDeleting={isDeleting}
            setIsDeleting={setIsDeleting}
          />
        )}
      </div>
    </main>
  );
}
