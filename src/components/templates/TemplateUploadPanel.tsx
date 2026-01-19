"use client";

import React, { useState } from "react";
import { addUploadedTemplate } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate, TemplateSlot } from "@/lib/templates/uploadedTypes";
import { detectSlots } from "@/lib/templates/slotDetector";

interface TemplateUploadPanelProps {
  onUploadSuccess?: () => void;
}

export function TemplateUploadPanel({ onUploadSuccess }: TemplateUploadPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setStatus("Fetching website...");
    setError(null);
    setIsFetching(true);

    try {
      const response = await fetch("/api/fetch-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch website");
      }

      const data = await response.json();
      const { htmlBody, css } = data;

      if (!htmlBody) {
        throw new Error("No body content found in the website");
      }

      // Automatically detect slots using the shared utility
      // This ensures slots are always detected and saved with the template
      setStatus("Detecting content slots...");
      const { htmlBody: updatedHtmlBody, slots: templateSlots } = detectSlots(htmlBody);

      const now = new Date().toISOString();
      const urlObj = new URL(url.trim());
      const baseName = urlObj.hostname.replace(/^www\./, "") || "website-template";
      const id = (`uploaded-${baseName}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      const uploaded: UploadedTemplate = {
        id: id as any,
        name,
        description: `Template extracted from ${url.trim()}`,
        htmlBody: updatedHtmlBody,
        css: css || undefined,
        slots: templateSlots,
        createdAt: now,
      };

      addUploadedTemplate(uploaded);
      setStatus(`Template "${name}" created with ${templateSlots.length} slot(s).`);
      setUrl(""); // Clear input
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      window.dispatchEvent(new CustomEvent("template-uploaded"));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch and process website.");
      setStatus(null);
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #ddd", marginTop: "16px", paddingTop: "12px" }}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Template from Website</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter a website URL to extract its HTML and CSS. The system will automatically remove scripts, ads, and tracking code, keeping only the design structure.
      </p>
      <form onSubmit={handleUrlSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isFetching}
          />
          <button
            type="submit"
            disabled={isFetching || !url.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isFetching ? "Fetching..." : "Extract Template"}
          </button>
        </div>
        {status && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            {status}
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}
      </form>
      <p className="mt-3 text-xs text-gray-500">
        Note: The website must be publicly accessible. The system will automatically detect all headings, paragraphs, and lists and make them editable - no technical knowledge required!
      </p>
    </div>
  );
}
