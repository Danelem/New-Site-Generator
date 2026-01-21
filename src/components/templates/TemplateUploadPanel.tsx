"use client";

import React, { useState, useRef } from "react";
import { addUploadedTemplate } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import { detectSlots } from "@/lib/templates/slotDetector";

interface TemplateUploadPanelProps {
  onUploadSuccess?: () => void;
}

export function TemplateUploadPanel({ onUploadSuccess }: TemplateUploadPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setStatus("Reading file...");
    setIsProcessing(true);

    try {
      // 1. Read file contents client-side
      const text = await readFileAsText(file);
      
      // 2. Detect slots locally (no API call needed!)
      setStatus("Detecting content slots...");
      const { htmlBody, slots: templateSlots } = detectSlots(text);

      if (templateSlots.length === 0) {
        setStatus(null);
        setError("No content slots detected. Ensure your HTML has headings (h1-h6), paragraphs (p), or lists.");
        setIsProcessing(false);
        return;
      }

      // 3. Create template object
      const now = new Date().toISOString();
      // Generate short, safe ID using timestamp (ensures URL-safe IDs for edit links)
      const id = `uploaded-${Date.now()}`;
      // Keep the original filename (without extension) as the display name
      const name = file.name.replace(/\.[^/.]+$/, "") || "Uploaded Template";

      const uploaded: UploadedTemplate = {
        id: id as any,
        name,
        description: `Uploaded from file: ${file.name}`,
        htmlBody, // The cleaned HTML
        css: "", // You can add a CSS input field later if needed
        slots: templateSlots,
        createdAt: now,
      };

      // 4. Save to local storage
      addUploadedTemplate(uploaded);
      
      setStatus(`Success! Template "${name}" added with ${templateSlots.length} editable slots.`);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatus(null), 5000);

    } catch (err: any) {
      console.error(err);
      setError("Failed to process file. Please ensure it is a valid HTML file.");
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Template File</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload a clean HTML file (e.g., saved from a website or built manually). 
        The system will automatically detect editable text sections.
      </p>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <span className="sr-only">Choose file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </label>
        </div>

        {status && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            {status}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
        <strong>Tip:</strong> For best results, use &quot;Save Page As &gt; Webpage, Single File&quot; or &quot;Webpage, HTML Only&quot; in your browser.
      </div>
    </div>
  );
}
