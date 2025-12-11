import { NextRequest } from 'next/server';
import { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';
import { buildCreatineReportFiles } from '@/lib/export/buildCreatineReportFiles';
import { buildCreatineReportReactFiles } from '@/lib/export/buildCreatineReportReactFiles';
import { buildUploadedTemplateFiles } from '@/lib/export/buildUploadedTemplateFiles';
import { buildZipFromFiles } from '@/lib/export/zip';
import { ExportFormat } from '@/lib/export/types';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      slug, 
      props, 
      template,
      slotData,
      exportFormat = "static-html" 
    }: { 
      slug?: string; 
      props?: CreatineReportProps;
      template?: UploadedTemplate;
      slotData?: Record<string, string>;
      exportFormat?: ExportFormat;
    } = body;

    let files;
    
    // Handle uploaded templates
    if (template && slotData) {
      if (exportFormat === "react-json") {
        // React export for uploaded templates not yet implemented
        return new Response('React export for uploaded templates is not yet supported', { status: 400 });
      }
      files = buildUploadedTemplateFiles(template, slotData);
    } 
    // Handle CreatineReport template
    else if (props) {
      if (exportFormat === "react-json") {
        const exportSlug = slug || 'funnel';
        files = buildCreatineReportReactFiles(props, exportSlug);
      } else {
        // Default to static-html
        files = buildCreatineReportFiles(props);
      }
    } else {
      return new Response('Missing props or template in request body', { status: 400 });
    }

    const zipBytes = await buildZipFromFiles(files);
    const filename = slug || 'funnel';

    return new Response(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}.zip"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Failed to generate export', { status: 500 });
  }
}

