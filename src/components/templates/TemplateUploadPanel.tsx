"use client";

import React, { useState } from "react";
import { addUploadedTemplate } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate, TemplateSlot } from "@/lib/templates/uploadedTypes";

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

      // Parse HTML to automatically detect and mark all text content as editable
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlBody, "text/html");
      const body = doc.body;

      const getTextPreview = (text: string, maxLen: number = 40): string => {
        const trimmed = text.trim();
        if (trimmed.length === 0) return "";
        return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + "..." : trimmed;
      };

      // Find all headings in document order
      const allHeadings = Array.from(body.querySelectorAll("h1, h2, h3, h4, h5, h6"))
        .filter(h => h.textContent?.trim().length > 0);
      
      const processedElements = new Set<Element>();
      const sections: { container: Element; heading: Element | null; label: string; index: number }[] = [];
      let sectionIndex = 0;

      // Group content between headings into sections
      for (let i = 0; i < allHeadings.length; i++) {
        const heading = allHeadings[i];
        if (processedElements.has(heading)) continue;

        const headingText = heading.textContent?.trim() || "";
        const nextHeading = i < allHeadings.length - 1 ? allHeadings[i + 1] : null;
        
        // Collect all content elements between this heading and the next heading
        const sectionElements: Element[] = [];
        let currentEl: Node | null = heading;
        
        // Walk through siblings after the heading
        while (currentEl && currentEl.nextSibling) {
          currentEl = currentEl.nextSibling;
          
          if (currentEl.nodeType !== Node.ELEMENT_NODE) continue;
          
          const el = currentEl as Element;
          
          // Stop if we hit the next heading
          if (nextHeading && (el === nextHeading || el.contains(nextHeading))) {
            break;
          }
          
          // Check if this is a content element
          const tag = el.tagName.toUpperCase();
          const isContentElement = 
            tag === "P" || tag === "UL" || tag === "OL" || 
            tag === "IMG" || tag === "BLOCKQUOTE" || 
            tag === "DIV" || tag === "ARTICLE" || tag === "SECTION";
          
          if (isContentElement) {
            const text = el.textContent?.trim() || "";
            // For paragraphs, require minimum text length
            if (tag === "P" && text.length < 10) continue;
            // Include images and elements with text
            if (tag === "IMG" || text.length > 0) {
              sectionElements.push(el);
              processedElements.add(el);
            }
          }
        }

        // Create container for this section
        let container: Element;
        
        if (sectionElements.length > 0) {
          // Create a wrapper div
          container = doc.createElement("div");
          container.className = "template-section-group";
          
          const parent = heading.parentElement;
          if (parent) {
            // Insert container before the heading
            parent.insertBefore(container, heading);
            
            // Move heading into container
            container.appendChild(heading);
            
            // Move all content elements into container
            sectionElements.forEach(el => {
              container.appendChild(el);
            });
          }
        } else {
          // No content, just use the heading itself
          container = heading;
        }

        processedElements.add(heading);
        sections.push({
          container,
          heading,
          label: `Section ${sectionIndex + 1}: ${getTextPreview(headingText, 50)}`,
          index: sectionIndex++
        });
      }

      // Handle standalone images not between headings
      const allImages = body.querySelectorAll("img");
      allImages.forEach((img) => {
        if (processedElements.has(img)) return;
        
        const alt = img.getAttribute("alt") || "";
        const src = img.getAttribute("src") || "";
        const label = alt || src || `Image ${sections.length + 1}`;
        
        sections.push({
          container: img,
          heading: null,
          label: `Image ${sections.length + 1}: ${label.length > 40 ? label.substring(0, 40) + "..." : label}`,
          index: sectionIndex++
        });
        processedElements.add(img);
      });

      // Add data-slot attributes and create slots
      const slots: TemplateSlot[] = [];
      sections.forEach((section) => {
        const slotId = `section_content_${section.index}`;
        
        // Add data-slot attribute to the container
        section.container.setAttribute("data-slot", slotId);
        
        // Determine slot type based on content
        let slotType: TemplateSlot["type"] = "text";
        const containerTag = section.container.tagName.toUpperCase();
        
        if (containerTag === "IMG") {
          slotType = "image";
        } else {
          // Check if container has lists
          const hasList = section.container.querySelector("ul, ol");
          if (hasList) {
            slotType = "text"; // Mixed content defaults to text
          }
        }

        slots.push({
          id: slotId,
          type: slotType,
          label: section.label
        });
      });

      // Update htmlBody with the modified HTML (now includes data-slot attributes)
      const updatedHtmlBody = body.innerHTML;

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
        slots,
        createdAt: now,
      };

      addUploadedTemplate(uploaded);
      setStatus(`Template "${name}" created with ${slots.length} slot(s).`);
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
