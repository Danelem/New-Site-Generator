"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { loadUploadedTemplates, saveUploadedTemplates } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate, TemplateSlot } from "@/lib/templates/uploadedTypes";
import { detectSlots } from "@/lib/templates/slotDetector";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [template, setTemplate] = useState<UploadedTemplate | null>(null);
  const [htmlBody, setHtmlBody] = useState("");
  const [css, setCss] = useState("");
  const [slots, setSlots] = useState<TemplateSlot[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [highlightSlots, setHighlightSlots] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const templates = loadUploadedTemplates();
    const found = templates.find((t) => t.id === id);
    if (found) {
      setTemplate(found);
      setHtmlBody(found.htmlBody);
      setCss(found.css || "");
      setSlots(found.slots || []);
    } else {
      setNotFound(true);
    }
  }, [id]);

  // Inject/remove highlight CSS when toggle changes
  useEffect(() => {
    const styleId = 'slot-highlight-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (highlightSlots) {
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = `
        [data-slot] {
          border: 2px dashed red !important;
          background: rgba(255, 255, 0, 0.2) !important;
          position: relative;
        }
        [data-slot]:hover::after {
          content: attr(data-slot);
          position: absolute;
          top: -20px;
          left: 0;
          background: black;
          color: white;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 2px;
          white-space: nowrap;
          z-index: 9999;
          pointer-events: none;
        }
      `;
    } else {
      if (styleElement) {
        styleElement.remove();
      }
    }

    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [highlightSlots]);

  const handleAutoDetect = () => {
    if (!template) return;

    // Use the shared slot detection utility
    const { htmlBody: updatedHtmlBody, slots: newSlots } = detectSlots(htmlBody);
    
    // Update HTML with data-slot attributes
    setHtmlBody(updatedHtmlBody);
    
    // CRITICAL: Force the slots list to update immediately
    setSlots(newSlots);
    
    // Show status message
    setStatus(`Detected ${newSlots.length} slot${newSlots.length !== 1 ? 's' : ''}!`);
    setTimeout(() => setStatus(null), 3000);
    
    // Update template slots
    const updated: UploadedTemplate = {
      ...template,
      htmlBody: updatedHtmlBody,
      slots: newSlots,
    };

    const templates = loadUploadedTemplates();
    const updatedTemplates = templates.map((t) => (t.id === id ? updated : t));
    saveUploadedTemplates(updatedTemplates);

    setTemplate(updated);
  };

  const handleSave = () => {
    if (!template) return;

    // First, check if there are existing data-slot attributes
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const body = doc.body;
    const slotElements = body.querySelectorAll("[data-slot]");
    
    let slots: TemplateSlot[] = [];
    let finalHtmlBody = htmlBody;
    
    // If slots exist, extract them (preserve user's manual edits)
    if (slotElements.length > 0) {
      slotElements.forEach((el) => {
        const id = el.getAttribute("data-slot");
        if (!id) return;
        if (slots.some((s) => s.id === id)) return;

        const label = id
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        let type: TemplateSlot["type"] = "text";
        if (el.tagName === "UL" || el.tagName === "OL") type = "list";
        if (el.tagName === "IMG") type = "image";
        if (el.tagName === "A") type = "url";

        slots.push({ id, type, label });
      });
    } else {
      // No slots found - automatically detect them
      // This ensures slots are always available after saving
      const result = detectSlots(htmlBody);
      slots = result.slots;
      finalHtmlBody = result.htmlBody;
      // Update htmlBody state with data-slot attributes
      setHtmlBody(result.htmlBody);
    }

    const updated: UploadedTemplate = {
      ...template,
      htmlBody: finalHtmlBody,
      css: css || undefined,
      slots,
    };

    const templates = loadUploadedTemplates();
    const updatedTemplates = templates.map((t) => (t.id === id ? updated : t));
    saveUploadedTemplates(updatedTemplates);

    setTemplate(updated);
    setSlots(slots); // Keep slots state in sync
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h1>
          <Link href="/templates" className="text-blue-600 hover:text-blue-800">
            ← Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/templates" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Templates
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Edit Template: {template.name}
            </h1>
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
            {slots.length > 0 ? (() => {
              const textSlots = slots.filter(s => s.type === 'headline' || s.type === 'subheadline' || s.type === 'paragraph' || s.type === 'list' || s.type === 'cta').length;
              const imageSlots = slots.filter(s => s.type === 'image').length;
              const totalSlots = slots.length;
              
              const parts: string[] = [];
              if (textSlots > 0) parts.push(`${textSlots} text slot${textSlots !== 1 ? 's' : ''}`);
              if (imageSlots > 0) parts.push(`${imageSlots} image slot${imageSlots !== 1 ? 's' : ''}`);
              
              return `Template saved successfully! ${totalSlots} editable section${totalSlots !== 1 ? 's' : ''} detected (${parts.join(', ')}).`;
            })() : 'Template saved successfully! No editable sections detected. Click "Auto-Detect All Text Sections" to automatically detect content slots.'}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Auto-Detect Editable Sections</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Click the button below to automatically detect all headings, paragraphs, and lists in your template and make them editable. No technical knowledge required!
            </p>
            <button
              onClick={handleAutoDetect}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Auto-Detect All Text Sections
            </button>
            {status && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                {status}
              </div>
            )}
            <p className="text-xs text-gray-600">
              The system will automatically find all headings (H1, H2, etc.), paragraphs, and lists, and mark them as editable sections with descriptive names.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HTML Body</h3>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              className="w-full h-96 font-mono text-xs p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="HTML content..."
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CSS Styles</h3>
            <textarea
              value={css}
              onChange={(e) => setCss(e.target.value)}
              className="w-full h-96 font-mono text-xs p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="CSS styles..."
            />
          </div>
        </div>

        {/* Template Preview Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
            <button
              onClick={() => setHighlightSlots(!highlightSlots)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                highlightSlots
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {highlightSlots ? '✓ Highlighting Slots' : 'Highlight Slots'}
            </button>
          </div>
          <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            <div 
              className="p-4 max-h-[600px] overflow-y-auto"
              style={{ 
                fontFamily: 'inherit',
              }}
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
            {css && (
              <style dangerouslySetInnerHTML={{ __html: css }} />
            )}
          </div>
          {highlightSlots && (
            <p className="mt-3 text-xs text-gray-600">
              <strong>Highlighting enabled:</strong> Elements with red dashed borders and yellow backgrounds are detected slots. Hover over them to see the slot ID.
            </p>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Slots ({slots.length})</h3>
          {slots.length > 0 ? (
            <ul className="space-y-2">
              {slots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="font-medium text-gray-900">{slot.label}</span>
                  <span className="text-xs text-gray-500">({slot.type})</span>
                  <code className="ml-auto text-xs bg-white px-2 py-1 rounded border border-gray-300">
                    data-slot=&quot;{slot.id}&quot;
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 text-sm">
              No slots detected. Add <code className="px-1.5 py-0.5 bg-gray-100 rounded">data-slot</code> attributes to HTML elements above and save to create editable sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
