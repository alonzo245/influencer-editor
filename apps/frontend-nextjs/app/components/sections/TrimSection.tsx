"use client";

import React, { useState } from "react";

interface TrimSectionProps {
  onTrimSettings: (trim: [number, number]) => void;
  trimData: [number, number];
}

export default function TrimSection({
  onTrimSettings,
  trimData,
}: TrimSectionProps) {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const handleSave = () => {
    onTrimSettings([startTime, endTime]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-100">4. Trim Video</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Start Time (seconds)
          </label>
          <input
            type="number"
            min="0"
            value={startTime}
            onChange={(e) => setStartTime(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            End Time (seconds)
          </label>
          <input
            type="number"
            min="0"
            value={endTime}
            onChange={(e) => setEndTime(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
