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
  const backendBase = getBackendBaseUrl();

  if (url && typeof url === 'string' && url.trim() !== '') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return `${backendBase}${trimmed}`;
    }
    return `${backendBase}/${trimmed}`;
  }

  if (path && typeof path === 'string' && path.trim() !== '') {
    const cleanPath = path.trim().replace(/^\/?storage\/?/, '').replace(/^\/+/, '');
    return `${backendBase}/storage/${cleanPath}`;
  }

  return null;
}

/**
 * Retrieves the global Left and Right Print Logos from the provided clinic,
 * falling back to the cached `clinicData` from localStorage if not provided.
 */
export function getGlobalPrintLogos(clinic?: Partial<Clinic> | null): GlobalPrintLogos {
  let targetClinic = clinic;

  if (!targetClinic && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('clinicData');
      if (stored) {
        targetClinic = JSON.parse(stored);
      }
    } catch {
      targetClinic = null;
    }
  }

  const leftLogoUrl = resolveStorageUrl(
    targetClinic?.left_print_logo_url,
    targetClinic?.left_print_logo_path
  );

  const rightLogoUrl = resolveStorageUrl(
    targetClinic?.right_print_logo_url,
    targetClinic?.right_print_logo_path
  );

  return { leftLogoUrl, rightLogoUrl };
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
  const leftSrc = leftLogoUrl !== undefined ? leftLogoUrl : globalLogos.leftLogoUrl;
  const rightSrc = rightLogoUrl !== undefined ? rightLogoUrl : globalLogos.rightLogoUrl;

  const resolvedClinicName = (clinicName || clinic?.name || 'Animal Bite Treatment Center').trim();
  const resolvedProvince = (province || clinic?.province || '').trim();
  const resolvedMunicipality = (municipality || clinic?.municipality || '').trim();
  const resolvedAddress = (address || clinic?.address || '').trim();
  const resolvedPhone = (contactNumber || clinic?.contact_number || (clinic as any)?.phone || '').trim();

  const geoSubtitle = [resolvedProvince, resolvedMunicipality].filter(Boolean).join(' • ');
  const contactSubtitle = [resolvedPhone ? `Tel. ${resolvedPhone}` : '', resolvedAddress].filter(Boolean).join(' | ');

  const leftElement = leftSrc
    ? `<img src="${leftSrc}" alt="Left Seal" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;flex-shrink:0;" />`
    : `<div style="width:${logoSize}px;height:${logoSize}px;flex-shrink:0;"></div>`;

  const rightElement = rightSrc
    ? `<img src="${rightSrc}" alt="Right Seal" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;flex-shrink:0;" />`
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
