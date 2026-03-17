/**
 * PDF Export Service.
 * Uses browser print-to-PDF with print-optimized stylesheet.
 *
 * For programmatic PDF generation (without print dialog), consider adding
 * jspdf + html2canvas as dependencies in the future. For MVP, window.print()
 * provides a zero-dependency solution that works across all browsers.
 */

/**
 * Trigger a print dialog for the current page.
 * The @media print styles in globals.css handle layout optimization.
 *
 * Usage: Call on an intelligence report page or product detail page.
 * The print stylesheet hides sidebar, navigation, and non-essential UI.
 */
export function exportPageAsPDF(): void {
  window.print();
}

/**
 * Export a specific HTML element as PDF by temporarily replacing the page body.
 * More controlled than window.print() — only exports the target element.
 *
 * @param elementId - The DOM id of the element to print
 * @param title - The document title shown in the print dialog
 */
export function exportElementAsPDF(elementId: string, title?: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[PDF Export] Element not found: ${elementId}`);
    return;
  }

  // Create a new window with just the target content
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    // Popup blocked — fall back to full page print
    exportPageAsPDF();
    return;
  }

  const docTitle = title ?? "Amazon Research Report";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(docTitle)}</title>
        <style>
          /* Print-optimized styles */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            background: white;
            padding: 40px;
            line-height: 1.6;
          }
          h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
          h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 20px; color: #333; }
          h3 { font-size: 16px; color: #555; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-s { background: #dcfce7; color: #166534; }
          .badge-a { background: #dbeafe; color: #1e40af; }
          .badge-b { background: #fef3c7; color: #92400e; }
          .badge-c { background: #fed7aa; color: #9a3412; }
          .badge-d { background: #fecaca; color: #991b1b; }
          @media print {
            body { padding: 20px; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        ${sanitizeHtml(element.innerHTML)}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to render, then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.print();
      printWindow.close();
    }
  }, 1000);
}

/**
 * Escape HTML special characters to prevent XSS in the print window.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitize HTML content for safe injection into print window.
 * Strips script tags, event handlers, and dangerous attributes
 * while preserving safe structural/styling HTML.
 */
function sanitizeHtml(html: string): string {
  // Create a temporary DOM element to parse the HTML safely
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove all script elements
  const scripts = temp.querySelectorAll("script");
  scripts.forEach((el) => el.remove());

  // Remove all elements with dangerous tags
  const dangerousTags = temp.querySelectorAll("iframe, object, embed, form, link[rel='import']");
  dangerousTags.forEach((el) => el.remove());

  // Remove event handler attributes and dangerous attributes from all elements
  const allElements = temp.querySelectorAll("*");
  allElements.forEach((el) => {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      // Remove event handlers (onclick, onerror, onload, etc.)
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
      // Remove javascript: URLs in href/src/action
      if (
        (name === "href" || name === "src" || name === "action") &&
        attr.value.trim().toLowerCase().startsWith("javascript:")
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return temp.innerHTML;
}
