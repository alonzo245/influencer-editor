"use client";

interface DownloadSectionProps {
  videoUrl: string;
  filename: string;
  srtUrl?: string;
  transcriptUrl?: string;
  onNewVideo: () => void;
  onBackToEdit: () => void;
}

export default function DownloadSection({
  videoUrl,
  filename,
  srtUrl,
  transcriptUrl,
  onNewVideo,
  onBackToEdit,
}: DownloadSectionProps) {
  return (
    <div className="mt-6 text-center">
      <p className="text-gray-300 mb-4">Your files are ready!</p>
      <div className="space-y-3">
        {/* Download Video Button */}
        <a
          href={`/api/v1/files/${filename}`}
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

        {/* Download SRT Button */}
        {srtUrl && (
          <a
            href={srtUrl}
            download
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
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
            <span>Download Subtitles (SRT)</span>
          </a>
        )}

        {/* Download Transcript Button */}
        {transcriptUrl && (
          <a
            href={transcriptUrl}
            download
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
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
            <span>Download Transcript (TXT)</span>
          </a>
        )}

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

          {/* Upload New Video Button */}
          <button
            onClick={onNewVideo}
            className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            data-testid="new-video-button"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Upload New Video</span>
          </button>
        </div>
      </div>
    </div>
  );
}
