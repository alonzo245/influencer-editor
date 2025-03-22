"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  handleDeleteAllFiles: () => void;
  isDeletingAll: boolean;
  setIsDeletingAll: (isDeletingAll: boolean) => void;
}

export default function VideoUploader({
  onVideoSelect,
  handleDeleteAllFiles,
  isDeletingAll,
  setIsDeletingAll,
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.type.startsWith("video/")) {
        onVideoSelect(file);
      }
    },
    [onVideoSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "video/*": [],
    },
    multiple: false,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`drop-zone rounded-lg p-8 text-center border-2 border-dashed transition-colors
        ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-600 hover:border-gray-500"
        }`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        data-testid="upload-dropzone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-gray-300">Drag and drop your video here, or</p>
          <button
            type="button"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Video
          </button>
        </div>
        {/* Delete All Files Button */}
      </div>
      <button
        onClick={handleDeleteAllFiles}
        disabled={isDeletingAll}
        className={`mt-10 w-full bg-red-800 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
          isDeletingAll ? "opacity-50 cursor-not-allowed" : "hover:bg-red-900"
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
        <span>{isDeletingAll ? "Deleting All..." : "Delete All Files"}</span>
      </button>
    </div>
  );
}
