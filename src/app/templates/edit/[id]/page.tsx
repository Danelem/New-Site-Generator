"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { loadUploadedTemplates, saveUploadedTemplates } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate, TemplateSlot } from "@/lib/templates/uploadedTypes";

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<UploadedTemplate | null>(null);
  const [htmlBody, setHtmlBody] = useState("");
  const [css, setCss] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const templates = loadUploadedTemplates();
    const found = templates.find((t) => t.id === params.id);
    if (found) {
      setTemplate(found);
      setHtmlBody(found.htmlBody);
      setCss(found.css || "");
    } else {
      setNotFound(true);
    }
  }, [params.id]);

  const handleAutoDetect = () => {
    if (!template) return;

    // Automatically detect and mark all text content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const body = doc.body;

    // Remove existing data-slot attributes first
    body.querySelectorAll("[data-slot]").forEach(el => {
      el.removeAttribute("data-slot");
    });

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

    // 1. Find all headings
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

    // 3. Find all lists
    const lists = body.querySelectorAll("ul, ol");
    lists.forEach((list) => {
      const text = list.textContent?.trim() || "";
      if (text.length > 0 && !isAlreadyProcessed(list)) {
        const idx = textElements.filter(te => te.type === "list").length;
        textElements.push({
          element: list,
          type: "list",
          label: `${list.tagName.toUpperCase()} List ${idx + 1}`,
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

    // Add data-slot attributes
    const slots: TemplateSlot[] = [];
    textElements.forEach((item) => {
      const slotId = `section_${item.type}_${item.index}`;
      item.element.setAttribute("data-slot", slotId);
      
      let slotType: TemplateSlot["type"] = "text";
      if (item.type === "ul" || item.type === "ol" || item.type === "list") {
        slotType = "list";
      }

      slots.push({
        id: slotId,
        type: slotType,
        label: item.label
      });
    });

    // Update HTML with data-slot attributes
    setHtmlBody(body.innerHTML);
    
    // Update template slots
    const updated: UploadedTemplate = {
      ...template,
      htmlBody: body.innerHTML,
      slots,
    };

    const templates = loadUploadedTemplates();
    const updatedTemplates = templates.map((t) => (t.id === params.id ? updated : t));
    saveUploadedTemplates(updatedTemplates);

    setTemplate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSave = () => {
    if (!template) return;

    // Re-parse HTML to extract slots (in case user manually added data-slot)
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const body = doc.body;

    const slotElements = body.querySelectorAll("[data-slot]");
    const slots: TemplateSlot[] = [];
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

    const updated: UploadedTemplate = {
      ...template,
      htmlBody,
      css: css || undefined,
      slots,
    };

    const templates = loadUploadedTemplates();
    const updatedTemplates = templates.map((t) => (t.id === params.id ? updated : t));
    saveUploadedTemplates(updatedTemplates);

    setTemplate(updated);
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
            {template.slots.length > 0 
              ? `Template saved successfully! ${template.slots.length} editable section(s) detected.`
              : 'Template saved successfully!'
            }
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

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Slots ({template.slots.length})</h3>
          {template.slots.length > 0 ? (
            <ul className="space-y-2">
              {template.slots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <span className="font-medium text-gray-900">{slot.label}</span>
                  <span className="text-xs text-gray-500">({slot.type})</span>
                  <code className="ml-auto text-xs bg-white px-2 py-1 rounded border border-gray-300">
                    data-slot="{slot.id}"
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
