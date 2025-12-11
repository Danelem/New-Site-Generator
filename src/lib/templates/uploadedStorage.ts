import type { UploadedTemplate } from "./uploadedTypes";

const STORAGE_KEY = "site-generator:uploaded-templates";

export function loadUploadedTemplates(): UploadedTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

export function saveUploadedTemplates(list: UploadedTemplate[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function addUploadedTemplate(t: UploadedTemplate): UploadedTemplate[] {
  const existing = loadUploadedTemplates();
  const withoutSame = existing.filter((x) => x.id !== t.id);
  const next = [...withoutSame, t];
  saveUploadedTemplates(next);
  return next;
}
