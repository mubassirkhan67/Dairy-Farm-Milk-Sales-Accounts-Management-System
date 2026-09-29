/**
 * Universal Printing & Document Export Utility
 * Provides reliable printing across iframes, mobile devices, and standard browsers.
 */

export interface PrintOptions {
  title?: string;
  landscape?: boolean;
}

/**
 * Prints a specific DOM element cleanly by id, stripping non-printable UI controls.
 */
export const printElement = (elementId: string, options: PrintOptions = {}): boolean => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[printHelper] Element #${elementId} not found, invoking default window.print()`);
    try {
      window.print();
      return true;
    } catch (e) {
      console.error('[printHelper] window.print() error:', e);
      return false;
    }
  }

  const docTitle = options.title || document.title || 'Print Document';

  // Gather active stylesheets and inline styles
  const styles: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styles.push((link as HTMLLinkElement).outerHTML);
  });
  document.querySelectorAll('style').forEach((style) => {
    styles.push(style.outerHTML);
  });

  const printResetStyle = `
    <style>
      @page {
        size: ${options.landscape ? 'landscape' : 'portrait'};
        margin: 10mm 12mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      body {
        background: #ffffff !important;
        color: #111827 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .print-container {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      tr {
        page-break-inside: avoid;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      th, td {
        border-color: #e5e7eb !important;
      }
    </style>
  `;

  // Clone element content
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${docTitle}</title>
    ${styles.join('\n')}
    ${printResetStyle}
  </head>
  <body>
    <div style="width: 100%; max-width: 900px; margin: 0 auto; padding: 12px;">
      ${clone.innerHTML}
    </div>
  </body>
</html>`;

  // Method 1: Try printing in a dedicated hidden iframe
  try {
    let iframe = document.getElementById('print-service-iframe') as HTMLIFrameElement | null;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'print-service-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('[printHelper] Iframe print blocked, falling back to window.print():', iframeErr);
          window.print();
        }
      }, 300);
      return true;
    }
  } catch (err) {
    console.warn('[printHelper] Could not setup print iframe, falling back:', err);
  }

  // Method 2: Fallback to standard window.print()
  try {
    window.print();
    return true;
  } catch (finalErr) {
    console.error('[printHelper] window.print() failed:', finalErr);
    // Method 3: Download as printable document if window.print is totally blocked
    downloadPrintableHtml(elementId, `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`);
    return false;
  }
};

/**
 * Downloads a self-contained, printable HTML document for saving as PDF or printing offline.
 */
export const downloadPrintableHtml = (elementId: string, filename = 'document.html'): void => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const styles: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styles.push((link as HTMLLinkElement).outerHTML);
  });
  document.querySelectorAll('style').forEach((style) => {
    styles.push(style.outerHTML);
  });

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${filename.replace('.html', '')}</title>
  ${styles.join('\n')}
  <style>
    body { background: white; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }
    .no-print { display: none !important; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div style="max-width: 850px; margin: 0 auto; background: white;">
    ${clone.innerHTML}
  </div>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Auto open print dialog when opened in browser
      setTimeout(() => { window.print(); }, 500);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
