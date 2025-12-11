"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { loadUploadedTemplates } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import { UploadedTemplatePreview } from "@/components/templates/UploadedTemplatePreview";

export default function UploadedTemplatePreviewPage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<UploadedTemplate | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const templates = loadUploadedTemplates();
    const found = templates.find((t) => t.id === params.id);
    if (found) {
      setTemplate(found);
    } else {
      setNotFound(true);
    }
  }, [params.id]);

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
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Home
            </Link>
            <Link href="/templates" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Templates
            </Link>
          </div>
        </div>
      </div>
      <UploadedTemplatePreview template={template} />
    </div>
  );
}
