"use client";

import { useState } from "react";

interface TrimSectionProps {
  onTrimSettings: (trim: [number, number]) => void;
  trimData: [number, number];
}

export default function TrimSection({
  onTrimSettings,
  trimData,
}: TrimSectionProps) {
  const [startTime, setStartTime] = useState(trimData[0]);
  const [endTime, setEndTime] = useState(trimData[1]);

  const handleSave = () => {
    onTrimSettings([startTime, endTime]);
  };

  return (
    <div className="space-y-4 mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
      <h3 className="text-xl font-semibold mb-4">4. Trim Video</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Start Time (seconds)
          </label>
          <input
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            End Time (seconds)
          </label>
          <input
            type="number"
            value={endTime}
            onChange={(e) => setEndTime(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            min="0"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
