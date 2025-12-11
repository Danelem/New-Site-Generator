import type { TemplateId } from "./registry";

export type SlotType = "text" | "rich-text" | "list" | "image" | "url";

export type TemplateSlot = {
  id: string;           // e.g. "page_title"
  type: SlotType;       // for now you can default to "text" unless guessed
  label: string;        // human label, e.g. "Page title"
};

export type UploadedTemplate = {
  id: TemplateId;       // e.g. "uploaded-creatine-v1"
  name: string;
  description?: string;
  htmlBody: string;     // innerHTML from <body>
  css?: string;         // contents of <style> from <head>, if any
  slots: TemplateSlot[];
  createdAt: string;    // ISO date
};
