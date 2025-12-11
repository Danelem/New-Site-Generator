import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return Response.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the website HTML
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!fetchResponse.ok) {
      return Response.json(
        { error: `Failed to fetch website: ${fetchResponse.status} ${fetchResponse.statusText}` },
        { status: fetchResponse.status }
      );
    }

    const html = await fetchResponse.text();

    // Clean the HTML - remove scripts, ads, tracking, etc.
    let cleanedHtml = html;

    // Remove script tags
    cleanedHtml = cleanedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Note: We'll extract style tags separately, but keep them in cleanedHtml for now
    // so we can extract body styles before removing them
    
    // Remove noscript tags
    cleanedHtml = cleanedHtml.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    
    // Remove comments
    cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove common ad/tracking elements by class/id patterns
    const adPatterns = [
      /<[^>]*\b(id|class)=["'][^"']*\b(ad|ads|advertisement|tracking|analytics|gtag|fbq|pixel)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,
      /<[^>]*\b(id|class)=["'][^"']*\b(ad|ads|advertisement|tracking|analytics|gtag|fbq|pixel)[^"']*["'][^>]*\/>/gi,
    ];
    adPatterns.forEach(pattern => {
      cleanedHtml = cleanedHtml.replace(pattern, '');
    });

    // Extract CSS from style tags before removing them
    const cssMatches = html.match(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi);
    let extractedCss = '';
    if (cssMatches) {
      extractedCss = cssMatches
        .map(match => match.replace(/<\/?style[^>]*>/gi, ''))
        .join('\n\n');
    }

    // Extract and fetch external stylesheets
    const linkMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
    let externalCss = '';
    
    // Try to fetch CSS from external stylesheets
    for (const linkTag of linkMatches) {
      const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        let cssUrl = hrefMatch[1];
        
        // Convert relative URLs to absolute
        if (cssUrl.startsWith('/')) {
          cssUrl = `${parsedUrl.origin}${cssUrl}`;
        } else if (!cssUrl.startsWith('http')) {
          cssUrl = new URL(cssUrl, parsedUrl.toString()).toString();
        }
        
        try {
          const cssResponse = await fetch(cssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (cssResponse.ok) {
            const cssContent = await cssResponse.text();
            externalCss += `\n\n/* From ${cssUrl} */\n${cssContent}`;
          }
        } catch (err) {
          // If we can't fetch the CSS, skip it
          console.warn(`Could not fetch CSS from ${cssUrl}:`, err);
        }
      }
    }

    // Extract inline styles from elements (style attributes)
    let inlineStyles = '';
    const inlineStyleMatches = cleanedHtml.match(/<[^>]+\sstyle=["']([^"']+)["'][^>]*>/gi) || [];
    if (inlineStyleMatches.length > 0) {
      inlineStyles = inlineStyleMatches
        .map(match => {
          const styleMatch = match.match(/style=["']([^"']+)["']/i);
          return styleMatch ? styleMatch[1] : '';
        })
        .filter(Boolean)
        .join('\n');
    }

    // Parse HTML to extract body content
    // Try multiple methods to get body content
    let bodyContent = '';
    
    // Method 1: Try regex match for <body> tag
    const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      bodyContent = bodyMatch[1];
    } else {
      // Method 2: If no body tag, try to find main content area
      // Look for common content containers
      const contentMatch = cleanedHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                          cleanedHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                          cleanedHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (contentMatch && contentMatch[1]) {
        bodyContent = contentMatch[1];
      } else {
        // Method 3: Use everything after <head> or just use the cleaned HTML
        const afterHead = cleanedHtml.split(/<\/head>/i)[1];
        bodyContent = afterHead ? afterHead.replace(/<\/?html[^>]*>/gi, '').replace(/<\/?body[^>]*>/gi, '') : cleanedHtml;
      }
    }
    
    // Extract style tags from body (scoped styles) before cleaning
    const bodyStyleMatches = bodyContent.match(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi) || [];
    let bodyStyles = '';
    if (bodyStyleMatches.length > 0) {
      bodyStyles = bodyStyleMatches
        .map(match => match.replace(/<\/?style[^>]*>/gi, ''))
        .join('\n\n');
      // Remove style tags from body (we've extracted them)
      bodyContent = bodyContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    }
    
    // Clean up the body content - remove any remaining script tags
    bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    bodyContent = bodyContent.trim();
    
    // Now remove style tags from cleanedHtml (we've already extracted them)
    cleanedHtml = cleanedHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Extract head content for meta tags, title, etc. (optional, for reference)
    const headMatch = cleanedHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : '';

    // Combine all CSS (inline styles, extracted styles, external stylesheets, and body styles)
    const allCss = [
      extractedCss,
      externalCss,
      inlineStyles ? `/* Inline styles */\n${inlineStyles}` : '',
      bodyStyles ? `/* Styles from body */\n${bodyStyles}` : ''
    ].filter(Boolean).join('\n\n');

    return Response.json({
      htmlBody: bodyContent.trim(),
      css: allCss.trim() || undefined,
      headContent: headContent.trim() || undefined,
      url: parsedUrl.toString(),
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return Response.json(
      { error: 'Failed to fetch and process website', details: error.message },
      { status: 500 }
    );
  }
}
