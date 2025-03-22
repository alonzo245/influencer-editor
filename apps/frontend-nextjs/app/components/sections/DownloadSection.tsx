"use client";

import { useState } from "react";

interface DownloadSectionProps {
  videoUrl: string;
  filename: string;
  srtUrl?: string;
  transcriptUrl?: string;
  onNewVideo: () => void;
  onBackToEdit: () => void;
  fileId: string;
  handleDeleteAllFiles: () => void;
  isDeletingAll: boolean;
  setIsDeletingAll: (isDeletingAll: boolean) => void;
  isDeleting: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
}

export default function DownloadSection({
  handleDeleteAllFiles,
  videoUrl,
  filename,
  srtUrl,
  transcriptUrl,
  onNewVideo,
  onBackToEdit,
  fileId,
  isDeletingAll,
  setIsDeletingAll,
  isDeleting,
  setIsDeleting,
}: DownloadSectionProps) {
  const [error, setError] = useState<string | null>(null);

  const handleDeleteFiles = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || "Failed to delete files");
      }

      // If deletion is successful, redirect to upload new video
      onNewVideo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete files");
      console.error("Error deleting files:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-6 text-center mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
      <div className="space-y-3">
        {/* Download Video Button */}
        <a
          href={videoUrl}
          download
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Download Video</span>
        </a>

        {/* Divider */}
        <div className="border-t border-gray-600 my-4" />

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Back to Edit Button */}
          <button
            onClick={onBackToEdit}
            className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
            data-testid="back-to-edit-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
              />
            </svg>
            <span>Back to Edit Subtitles</span>
          </button>

          {/* Delete All Files Button */}
          <button
            onClick={handleDeleteAllFiles}
            disabled={isDeletingAll}
            className={`w-full bg-red-800 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isDeletingAll
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-red-900"
            }`}
            data-testid="delete-all-files-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>
              {isDeletingAll ? "Deleting All..." : "Delete All Files"}
            </span>
          </button>

          {/* Error Message */}
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
}
