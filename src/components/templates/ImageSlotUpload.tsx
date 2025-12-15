"use client";

import React, { useState, useRef, useEffect } from "react";

interface ImageSlotUploadProps {
  slotId: string;
  slotLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholderImage?: string; // Optional: current placeholder from template
  dimensions?: { width?: number; height?: number }; // Optional: suggested dimensions
}

export function ImageSlotUpload({
  slotId,
  slotLabel,
  value,
  onChange,
  placeholderImage,
  dimensions,
}: ImageSlotUploadProps) {
  const [uploadMode, setUploadMode] = useState<"url" | "file">(value && !value.startsWith("data:") && !value.startsWith("blob:") ? "url" : "file");
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64 data URL for preview and storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert("Failed to read image file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    if (url.trim()) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUploadMode("file")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            uploadMode === "file"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          📁 Upload File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("url")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            uploadMode === "url"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          🔗 Use URL
        </button>
      </div>

      {/* File Upload Mode */}
      {uploadMode === "file" && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`file-input-${slotId}`}
            disabled={isUploading}
          />
          <label
            htmlFor={`file-input-${slotId}`}
            className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${
              isUploading
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : preview
                ? "border-green-300 bg-green-50 hover:border-green-400"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            {isUploading ? (
              <span className="text-gray-600">Uploading...</span>
            ) : preview ? (
              <span className="text-green-700 font-medium">✓ Image uploaded - Click to change</span>
            ) : (
              <span className="text-gray-700">Click to upload image or drag and drop</span>
            )}
          </label>
          {dimensions && (
            <p className="text-xs text-gray-500">
              Recommended size: {dimensions.width || "?"} × {dimensions.height || "?"}px
            </p>
          )}
        </div>
      )}

      {/* URL Mode */}
      {uploadMode === "url" && (
        <div className="space-y-2">
          <input
            type="url"
            value={value && !value.startsWith("data:") && !value.startsWith("blob:") ? value : ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500">
            Enter a direct URL to an image file
          </p>
        </div>
      )}

      {/* Preview Section */}
      {(preview || placeholderImage) && (
        <div className="space-y-2">
          <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <div className="p-2 bg-gray-100 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-700">Preview: {slotLabel}</span>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px] max-h-[400px] overflow-auto">
              {preview ? (
                <img
                  src={preview}
                  alt={`Preview for ${slotLabel}`}
                  className="max-w-full max-h-[350px] object-contain rounded"
                  onError={() => {
                    setPreview(null);
                    if (uploadMode === "url") {
                      alert("Failed to load image from URL. Please check the URL and try again.");
                    }
                  }}
                />
              ) : placeholderImage ? (
                <div className="text-center space-y-2">
                  <img
                    src={placeholderImage}
                    alt="Template placeholder"
                    className="max-w-full max-h-[350px] object-contain rounded opacity-50 mx-auto"
                  />
                  <p className="text-xs text-gray-500">Template placeholder (replace with your image)</p>
                </div>
              ) : null}
            </div>
          </div>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="w-full px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Remove Image
            </button>
          )}
        </div>
      )}

      {/* Info about where this image appears */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-2">
        💡 <strong>Tip:</strong> This image will appear in the <strong>{slotLabel}</strong> section of your template. 
        Use the preview button above to see exactly where it will be placed.
      </div>
    </div>
  );
}

