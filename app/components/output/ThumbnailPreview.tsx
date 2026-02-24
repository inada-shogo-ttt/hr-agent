"use client";

import Image from "next/image";
import { useState } from "react";

interface ThumbnailPreviewProps {
  urls: string[];
}

export function ThumbnailPreview({ urls }: ThumbnailPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (urls.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* メイン画像 */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-gray-100">
        <img
          src={urls[selectedIndex]}
          alt={`サムネイル ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* サムネイル一覧 */}
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {urls.map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`shrink-0 relative w-20 aspect-video rounded overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? "border-blue-500"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <img
                src={url}
                alt={`サムネイル ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
