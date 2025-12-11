import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import type { StaticFile } from "./buildCreatineReportFiles";

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function buildUploadedTemplateFiles(
  template: UploadedTemplate,
  slotData: Record<string, string>
): StaticFile[] {
  let bodyHtml = template.htmlBody;

  // Replace slot content using regex (server-side compatible)
  template.slots.forEach((slot) => {
    const slotContent = slotData[slot.id] || "";
    const escapedContent = escapeHtml(slotContent);
    
    // Find elements with data-slot attribute using regex
    // Pattern: <tag ... data-slot="slotId" ...>content</tag>
    const slotIdPattern = slot.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match opening tag with data-slot attribute
    const tagPattern = new RegExp(
      `(<[^>]+data-slot=["']${slotIdPattern}["'][^>]*>)([\\s\\S]*?)(</[^>]+>)`,
      'gi'
    );
    
    bodyHtml = bodyHtml.replace(tagPattern, (match, openTag, oldContent, closeTag) => {
      // Determine tag name from openTag
      const tagMatch = openTag.match(/<(\w+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      
      if (slot.type === "list" || (tagName === "ul" || tagName === "ol")) {
        // For lists, split content by newlines and create list items
        const items = slotContent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        if (items.length > 0) {
          return openTag + items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") + closeTag;
        }
        return openTag + closeTag;
      } else if (slot.type === "image" && tagName === "img") {
        // For images, update src attribute
        const updatedTag = openTag.replace(
          /(src=["'])([^"']*)(["'])/i,
          `$1${escapedContent}$3`
        );
        return updatedTag;
      } else if (slot.type === "url" && tagName === "a") {
        // For links, update href attribute
        const updatedTag = openTag.replace(
          /(href=["'])([^"']*)(["'])/i,
          `$1${escapedContent}$3`
        );
        return updatedTag + oldContent + closeTag;
      } else {
        // For text content, replace inner content
        return openTag + escapedContent + closeTag;
      }
    });
  });

  const css = template.css || "";

  // Build complete HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  <style>
${css}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  return [
    { path: "index.html", contents: html },
    { path: "styles.css", contents: css },
  ];
}
