"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { TEMPLATES } from '@/lib/templates/registry';
import { loadUploadedTemplates, deleteUploadedTemplate } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { TemplateUploadPanel } from '@/components/templates/TemplateUploadPanel';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default function TemplatesPage() {
  const [uploaded, setUploaded] = useState<UploadedTemplate[]>([]);

  useEffect(() => {
    setUploaded(loadUploadedTemplates());
  }, []);

  // Re-load uploaded templates when storage changes
  useEffect(() => {
    const handleTemplateUploaded = () => {
      setUploaded(loadUploadedTemplates());
    };
    window.addEventListener('template-uploaded', handleTemplateUploaded);
    return () => window.removeEventListener('template-uploaded', handleTemplateUploaded);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updated = deleteUploadedTemplate(id);
      setUploaded(updated); // Update the local state to remove the row instantly
    }
  };

  return (
    <main className="min-h-screen p-8 sm:p-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Templates</h1>
          <p className="text-gray-700 leading-relaxed">
            Templates define the design and content slots for funnel sites. System templates are built-in; uploaded templates
            come from your own HTML files.
          </p>
        </div>

        {/* System Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Templates</h2>
          
          {TEMPLATES.length === 0 ? (
            <p className="text-gray-600">No system templates available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATES.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-900">{template.name}</td>
                      <td className="py-4 px-4 text-gray-600">{template.description}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {template.id === 'creatine-report' ? (
                          <Link
                            href="/preview"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Preview
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">Preview (coming soon)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Uploaded Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Templates</h2>
          
          {uploaded.length === 0 ? (
            <p className="text-gray-600 text-sm">No uploaded templates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Slots</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Uploaded</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploaded.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-900">{template.name}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{template.description || "No description"}</td>
                      <td className="py-4 px-4 text-gray-600">{template.slots.length}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {new Date(template.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-3 flex-wrap">
                          <Link
                            href={`/templates/preview/${template.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Preview
                          </Link>
                          <Link
                            href={`/templates/edit/${template.id}`}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => {
                              const htmlContent = template.htmlBody;
                              const cssContent = template.css || '';
                              const fullContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
${cssContent}
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
                              const blob = new Blob([fullContent], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${template.id}.html`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-900 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Template Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <TemplateUploadPanel 
            onUploadSuccess={() => setUploaded(loadUploadedTemplates())}
          />
        </div>
      </div>
    </main>
  );
}

