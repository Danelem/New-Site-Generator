"use client";

import React, { useEffect, useState } from "react";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";

interface UploadedTemplatePreviewProps {
  template: UploadedTemplate;
}

export function UploadedTemplatePreview({ template }: UploadedTemplatePreviewProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inject CSS if available
    if (template.css) {
      const styleId = `uploaded-template-${template.id}-styles`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = template.css;
        document.head.appendChild(style);
      }
      return () => {
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      };
    }
  }, [template.css, template.id]);

  // Validate HTML before rendering
  useEffect(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(template.htmlBody, "text/html");
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        setError("HTML structure appears to be invalid or incomplete");
      } else {
        setError(null);
      }
    } catch (err) {
      setError("Failed to parse HTML content");
    }
  }, [template.htmlBody]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Template Preview: {template.name}
        </h2>
        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
        <div className="flex gap-4 text-xs text-gray-500 mb-2">
          <span>Slots: {template.slots.length}</span>
          <span>Uploaded: {new Date(template.createdAt).toLocaleString()}</span>
        </div>
        {template.slots.length === 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>No editable slots detected.</strong> To make sections editable, add <code className="px-1 py-0.5 bg-yellow-100 rounded">data-slot="section-name"</code> attributes to elements in the HTML.
            </p>
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Preview Error:</strong> {error}
            </p>
            <p className="text-xs text-red-600 mt-1">
              The HTML may be incomplete or missing required elements. Try downloading the HTML to inspect it.
            </p>
          </div>
        )}
      </div>
      {!error && (
        <div
          className="uploaded-template-content"
          dangerouslySetInnerHTML={{ __html: template.htmlBody }}
        />
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HTML Content (Raw)</h3>
            <pre className="bg-white p-4 rounded border border-gray-300 text-xs overflow-x-auto max-h-96 overflow-y-auto">
              <code>{template.htmlBody.substring(0, 2000)}{template.htmlBody.length > 2000 ? '...' : ''}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
