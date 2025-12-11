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

      // Automatically detect all text-containing elements
      const textElements: { element: Element; type: string; label: string; index: number }[] = [];
      const processedElements = new Set<Element>();
      
      const isAlreadyProcessed = (el: Element): boolean => {
        if (processedElements.has(el)) return true;
        for (const processed of processedElements) {
          if (processed.contains(el)) return true;
        }
        return false;
      };

      const getTextPreview = (text: string, maxLen: number = 40): string => {
        const trimmed = text.trim();
        if (trimmed.length === 0) return "";
        return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + "..." : trimmed;
      };

      // 1. Find all headings (h1-h6)
      const headings = body.querySelectorAll("h1, h2, h3, h4, h5, h6");
      headings.forEach((el) => {
        const text = el.textContent?.trim() || "";
        if (text.length > 0 && !isAlreadyProcessed(el)) {
          const tagName = el.tagName.toLowerCase();
          const idx = textElements.filter(te => te.type === tagName).length;
          textElements.push({
            element: el,
            type: tagName,
            label: `${tagName.toUpperCase()} ${idx + 1}: ${getTextPreview(text, 50)}`,
            index: idx
          });
          processedElements.add(el);
        }
      });

      // 2. Find all paragraphs
      const paragraphs = body.querySelectorAll("p");
      paragraphs.forEach((el) => {
        const text = el.textContent?.trim() || "";
        if (text.length > 10 && !isAlreadyProcessed(el)) {
          const idx = textElements.filter(te => te.type === "paragraph").length;
          textElements.push({
            element: el,
            type: "paragraph",
            label: `Paragraph ${idx + 1}: ${getTextPreview(text, 50)}`,
            index: idx
          });
          processedElements.add(el);
        }
      });

      // 3. Find all lists (ul, ol)
      const lists = body.querySelectorAll("ul, ol");
      lists.forEach((list) => {
        const text = list.textContent?.trim() || "";
        if (text.length > 0 && !isAlreadyProcessed(list)) {
          const listType = list.tagName.toLowerCase();
          const idx = textElements.filter(te => te.type === "list").length;
          textElements.push({
            element: list,
            type: "list",
            label: `${listType.toUpperCase()} List ${idx + 1}`,
            index: idx
          });
          processedElements.add(list);
        }
      });

      // 4. Find divs with text content
      const divs = body.querySelectorAll("div");
      divs.forEach((el) => {
        if (isAlreadyProcessed(el)) return;
        
        const text = el.textContent?.trim() || "";
        if (text.length < 20) return;
        
        const childCount = el.children.length;
        const hasDirectText = Array.from(el.childNodes).some(
          node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim().length > 0
        );
        
        let containsProcessed = false;
        for (const processed of processedElements) {
          if (el.contains(processed) && el !== processed) {
            containsProcessed = true;
            break;
          }
        }
        
        if (!containsProcessed && (
          (text.length >= 30 && (hasDirectText || childCount <= 8)) ||
          text.length >= 100
        )) {
          const idx = textElements.filter(te => te.type === "div").length;
          textElements.push({
            element: el,
            type: "div",
            label: `Content Block ${idx + 1}: ${getTextPreview(text, 50)}`,
            index: idx
          });
          processedElements.add(el);
        }
      });

      // 5. Find other text-containing elements (spans, blockquotes, etc.)
      const otherElements = body.querySelectorAll("span, strong, em, b, i, blockquote, article, section");
      otherElements.forEach((el) => {
        if (isAlreadyProcessed(el)) return;
        
        const text = el.textContent?.trim() || "";
        const minLength = (el.tagName === "SPAN" || el.tagName === "STRONG" || el.tagName === "EM" || el.tagName === "B" || el.tagName === "I") ? 50 : 30;
        if (text.length >= minLength) {
          const tagName = el.tagName.toLowerCase();
          const idx = textElements.filter(te => te.type === tagName).length;
          textElements.push({
            element: el,
            type: tagName,
            label: `${tagName.toUpperCase()} ${idx + 1}: ${getTextPreview(text, 50)}`,
            index: idx
          });
          processedElements.add(el);
        }
      });

      // 5. Fallback: If we found very few elements, find any element with substantial text
      if (textElements.length < 5) {
        const allElements = body.querySelectorAll("*");
        allElements.forEach((el) => {
          if (isAlreadyProcessed(el)) return;
          if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT") return;
          
          const text = el.textContent?.trim() || "";
          if (text.length >= 40 && el.children.length <= 10) {
            let isNested = false;
            for (const processed of processedElements) {
              if (processed.contains(el) && processed !== el) {
                isNested = true;
                break;
              }
            }
            
            if (!isNested) {
              const tagName = el.tagName.toLowerCase();
              const typeKey = `element_${tagName}`;
              const idx = textElements.filter(te => te.type === typeKey).length;
              textElements.push({
                element: el,
                type: typeKey,
                label: `${tagName.toUpperCase()} ${idx + 1}: ${getTextPreview(text, 50)}`,
                index: idx
              });
              processedElements.add(el);
            }
          }
        });
      }

      // Add data-slot attributes and create slots
      const slots: TemplateSlot[] = [];
      textElements.forEach((item) => {
        const slotId = `section_${item.type}_${item.index}`;
        
        // Add data-slot attribute to the element
        item.element.setAttribute("data-slot", slotId);
        
        // Determine slot type
        let slotType: TemplateSlot["type"] = "text";
        if (item.type === "ul" || item.type === "ol" || item.type === "list") {
          slotType = "list";
        } else if (item.element.tagName === "IMG") {
          slotType = "image";
        } else if (item.element.tagName === "A") {
          slotType = "url";
        }

        slots.push({
          id: slotId,
          type: slotType,
          label: item.label
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
