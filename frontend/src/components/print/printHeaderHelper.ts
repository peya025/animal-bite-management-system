import { API_BASE_URL } from '../../shared/services/api';
import type { Clinic } from '../../shared/types';

export interface GlobalPrintLogos {
  leftLogoUrl: string | null;
  rightLogoUrl: string | null;
}

/**
 * Resolve the normalized backend base URL (e.g. http://localhost:8000).
 */
export function getBackendBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

/**
 * Resolve a relative or absolute storage logo URL cleanly.
 */
export function resolveStorageUrl(url?: string | null, path?: string | null): string | null {
  const configuredBase = API_BASE_URL.replace(/\/$/, '').replace(/(?:\/api)?$/, '/api');
  const apiBase = new URL(configuredBase, window.location.origin).href.replace(/\/$/, '');
  const value = url?.trim();
  if (value) {
    // Use the same reachable API origin/proxy as clinic configuration. Old cached
    // asset URLs may contain localhost or a backend-internal hostname.
    const storagePath = value.match(/(?:^|\/)storage\/(clinic-logos\/[^?#]+)([?#].*)?$/);
    if (storagePath) return apiBase + '/storage/' + storagePath[1] + (storagePath[2] || '');
    if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return value;
    return getBackendBaseUrl() + '/' + value.replace(/^\/+/, '');
  }
  if (path?.trim()) {
    return apiBase + '/storage/' + path.trim().replace(/^\/?storage\//, '').replace(/^\/+/, '');
  }
  return null;
}

/** Resolve print branding from the clinic shared by AuthContext and its cache. */
export function getGlobalPrintLogos(clinic?: Partial<Clinic> | null): GlobalPrintLogos {
  let targetClinic = clinic;
  if (!targetClinic && typeof window !== 'undefined') {
    try {
      targetClinic = JSON.parse(localStorage.getItem('clinicData') || 'null');
    } catch { targetClinic = null; }
  }
  return {
    leftLogoUrl: resolveStorageUrl(targetClinic?.left_print_logo_url, targetClinic?.left_print_logo_path),
    rightLogoUrl: resolveStorageUrl(targetClinic?.right_print_logo_url, targetClinic?.right_print_logo_path),
  };
}

/** Keep server-rendered logos on the configured API origin when HTML is embedded. */
export function resolvePrintLogoUrls(html: string): string {
  return html.replace(/src="([^"]*\/storage\/clinic-logos\/[^"]*)"/g,
    (_attribute, url: string) => 'src="' + resolveStorageUrl(url) + '"');
}

export interface RenderLetterheadOptions {
  clinic?: Partial<Clinic> | null;
  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;
  clinicName?: string;
  province?: string;
  municipality?: string;
  address?: string;
  contactNumber?: string;
  docTitle?: string;
  refNo?: string;
  logoSize?: number;
}

/**
 * Generates uniform, formal DOH letterhead HTML with Left and Right Print Logos.
 * If a logo is not configured, renders a clean blank spacer to keep layout aligned.
 */
export function renderPrintLetterheadHtml({
  clinic,
  leftLogoUrl,
  rightLogoUrl,
  clinicName,
  province,
  municipality,
  address,
  contactNumber,
  docTitle,
  refNo,
  logoSize = 64,
}: RenderLetterheadOptions): string {
  const globalLogos = getGlobalPrintLogos(clinic);
  const leftSrc = leftLogoUrl !== undefined ? resolveStorageUrl(leftLogoUrl) : globalLogos.leftLogoUrl;
  const rightSrc = rightLogoUrl !== undefined ? resolveStorageUrl(rightLogoUrl) : globalLogos.rightLogoUrl;

  const resolvedClinicName = (clinicName || clinic?.name || 'Animal Bite Treatment Center').trim();
  const resolvedProvince = (province || clinic?.province || '').trim();
  const resolvedMunicipality = (municipality || clinic?.municipality || '').trim();
  const resolvedAddress = (address || clinic?.address || '').trim();
  const resolvedPhone = (contactNumber || clinic?.contact_number || (clinic as any)?.phone || '').trim();

  const geoSubtitle = [resolvedProvince, resolvedMunicipality].filter(Boolean).join(' • ');
  const contactSubtitle = [resolvedPhone ? `Tel. ${resolvedPhone}` : '', resolvedAddress].filter(Boolean).join(' | ');

  const leftElement = leftSrc
    ? `<img src="${leftSrc}" alt="Left Seal" onerror="this.style.visibility='hidden'" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;flex-shrink:0;" />`
    : `<div style="width:${logoSize}px;height:${logoSize}px;flex-shrink:0;"></div>`;

  const rightElement = rightSrc
    ? `<img src="${rightSrc}" alt="Right Seal" onerror="this.style.visibility='hidden'" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;flex-shrink:0;" />`
    : `<div style="width:${logoSize}px;height:${logoSize}px;flex-shrink:0;"></div>`;

  return `
    <div class="letterhead" style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:8px;">
      ${leftElement}
      <div class="org" style="text-align:center;flex:1;padding:0 8px;">
        <div class="republic" style="font-size:9pt;letter-spacing:1px;text-transform:uppercase;color:#333;">Republic of the Philippines${geoSubtitle ? ` • ${geoSubtitle}` : ''}</div>
        <div class="clinic" style="font-size:13pt;font-weight:700;text-transform:uppercase;margin:2px 0;color:#000;">${resolvedClinicName}</div>
        <div class="address" style="font-size:9pt;color:#444;">Animal Bite Treatment Center${contactSubtitle ? ` | ${contactSubtitle}` : ''}</div>
      </div>
      ${rightElement}
    </div>
    <hr class="divider-thick" style="border:none;border-top:3px double #000;margin:6px 0 3px;" />
    <hr class="divider-thin" style="border:none;border-top:1px solid #000;margin:2px 0 14px;" />
    ${docTitle ? `
      <div class="doc-title" style="text-align:center;margin:14px 0 18px;">
        <h2 style="font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:underline;">${docTitle}</h2>
        ${refNo ? `<p style="font-size:9.5pt;margin-top:3px;color:#555;">Reference No.: ${refNo}</p>` : ''}
      </div>
    ` : ''}
  `;
}
