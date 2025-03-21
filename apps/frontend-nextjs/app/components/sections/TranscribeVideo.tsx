"use client";

import React from "react";

interface TranscribeVideoProps {
  transcriptionEnabled: boolean;
  burnSubtitles: boolean;
  language: "english" | "hebrew";
  onTranscriptionSettings: (
    enabled: boolean,
    burn: boolean,
    lang: "english" | "hebrew"
  ) => void;
}

export default function TranscribeVideo({
  transcriptionEnabled,
  burnSubtitles,
  language,
  onTranscriptionSettings,
}: TranscribeVideoProps) {
  return (
    <div className="space-y-4 mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
      <h2 className="text-2xl font-semibold text-gray-100">
        3. Transcription Options
      </h2>
      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={transcriptionEnabled}
            onChange={(e) =>
              onTranscriptionSettings(e.target.checked, burnSubtitles, language)
            }
            className="form-checkbox"
          />
          <span>Enable Speech-to-Text</span>
        </label>

        {transcriptionEnabled && (
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={burnSubtitles}
                onChange={(e) =>
                  onTranscriptionSettings(
                    transcriptionEnabled,
                    e.target.checked,
                    language
                  )
                }
                className="form-checkbox"
              />
              <span>Burn Subtitles into Video</span>
            </label>

            <select
              value={language}
              onChange={(e) =>
                onTranscriptionSettings(
                  transcriptionEnabled,
                  burnSubtitles,
                  e.target.value as "english" | "hebrew"
                )
              }
              className="form-select bg-gray-700 text-white p-3 rounded-lg"
            >
              <option value="english">English</option>
              <option value="hebrew">Hebrew</option>
            </select>
          </div>
        )}

        <button
          onClick={() =>
            onTranscriptionSettings(
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
  );
}
