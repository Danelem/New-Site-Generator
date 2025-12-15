"use client";

import React, { useEffect, useState } from "react";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";

interface UploadedTemplateRendererProps {
  template: UploadedTemplate;
  slotData: Record<string, string>; // slotId -> content
}

export function UploadedTemplateRenderer({ template, slotData }: UploadedTemplateRendererProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Inject CSS first (separate effect to ensure it's loaded)
  useEffect(() => {
    const styleId = `uploaded-template-${template.id}-styles`;
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (template.css) {
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = template.css;
    } else if (style) {
      style.remove();
    }

    return () => {
      // Keep style for reuse - don't remove on unmount
    };
  }, [template.css, template.id]);

  // Process HTML and replace slot content
  useEffect(() => {
    // Replace slot content in HTML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(template.htmlBody, "text/html");
      const parseError = doc.querySelector("parsererror");
      
      if (parseError) {
        setError("HTML structure appears to be invalid or incomplete");
        return;
      }

      // Replace content in elements with data-slot attributes
      template.slots.forEach((slot) => {
        const slotContent = slotData[slot.id] || "";
        const elements = doc.querySelectorAll(`[data-slot="${slot.id}"]`);
        
        elements.forEach((el) => {
          // For text/list slots, replace innerHTML or textContent
          if (slot.type === "text" || slot.type === "list") {
            // Check if this is a section container (div with heading inside)
            if (el.classList.contains("template-section-group")) {
              // For section containers, preserve the heading and replace only content
              const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
              const contentElements = Array.from(el.children).filter(
                child => child !== heading && 
                (child.tagName === "P" || child.tagName === "UL" || child.tagName === "OL" || 
                 child.tagName === "DIV" || child.tagName === "BLOCKQUOTE")
              );
              
              // Remove old content elements
              contentElements.forEach(child => child.remove());
              
              // Add new content as paragraphs (split by double newlines or keep as single block)
              if (slotContent.trim()) {
                const paragraphs = slotContent.split(/\n\n+/).filter(p => p.trim());
                if (paragraphs.length > 0) {
                  paragraphs.forEach(para => {
                    const p = doc.createElement("p");
                    p.textContent = para.trim();
                    if (heading && heading.nextSibling) {
                      el.insertBefore(p, heading.nextSibling);
                    } else {
                      el.appendChild(p);
                    }
                  });
                } else {
                  // Single paragraph
                  const p = doc.createElement("p");
                  p.textContent = slotContent.trim();
                  if (heading && heading.nextSibling) {
                    el.insertBefore(p, heading.nextSibling);
                  } else {
                    el.appendChild(p);
                  }
                }
              }
            } else if (el.tagName === "UL" || el.tagName === "OL") {
              // If it's a list element (ul/ol), try to parse as list items
              const items = slotContent
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
              if (items.length > 0) {
                el.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
              }
            } else {
              // For other elements, replace with the content
              el.textContent = slotContent;
            }
          } else if (slot.type === "image" && el.tagName === "IMG") {
            // For images, set src attribute
            (el as HTMLImageElement).src = slotContent;
            (el as HTMLImageElement).alt = slotContent || "Image";
          } else if (slot.type === "url" && el.tagName === "A") {
            // For links, set href attribute
            (el as HTMLAnchorElement).href = slotContent;
          }
        });
      });

      // Get the updated HTML
      const body = doc.body;
      setRenderedHtml(body.innerHTML);
      setError(null);
    } catch (err) {
      setError("Failed to process template HTML");
      console.error("Template rendering error:", err);
    }
  }, [template.htmlBody, template.slots, slotData]);

  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">
          <strong>Preview Error:</strong> {error}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="uploaded-template-wrapper"
      style={{
        width: '100%',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Minimal constraints - let template CSS control layout */
            .uploaded-template-wrapper {
              width: 100% !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Only ensure images are responsive */
            .uploaded-template-wrapper img {
              max-width: 100% !important;
              height: auto !important;
            }
            /* Ensure text wraps properly */
            .uploaded-template-wrapper p,
            .uploaded-template-wrapper div,
            .uploaded-template-wrapper span {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
            }
          `,
        }}
      />
      <div
        dangerouslySetInnerHTML={{ __html: renderedHtml || template.htmlBody }}
      />
    </div>
  );
}
