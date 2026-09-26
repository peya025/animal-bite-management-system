import { resolvePrintLogoUrls } from '../../../components/print/printHeaderHelper';
import { waitForPrintImages } from '../../../components/print/printReady';
/**
 * Silent in-page printing utility.
 * Fetches the printable HTML template from backend using user's bearer token,
 * loads it into a temporary hidden iframe, and triggers the native print dialog
 * without opening a new browser tab or navigating away.
 */
export async function silentPrintReport(
  endpoint: string,
  params: Record<string, string | number | undefined | null>
): Promise<void> {
  const cleanParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanParams[k] = String(v);
    }
  }

  const query = new URLSearchParams(cleanParams).toString();
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000/api';

  const url = `${API_BASE}/print/reports/${endpoint}?${query}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load print template (HTTP ${response.status})`);
  }

  const html = resolvePrintLogoUrls(await response.text());

  // Create temporary hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (!frameDoc) {
    throw new Error('Unable to initialize printing frame');
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        if (iframe.contentDocument) await waitForPrintImages(iframe.contentDocument);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1500);
      }
    }, 400);
  });
}
