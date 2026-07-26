/**
 * Shared print utility — formal DOH letterhead document.
 *
 * Usage:
 *   printDocument({ clinicName, printedBy, title, refPrefix, bodyHtml });
 */

export interface PrintDocumentOptions {
  clinicName: string;
  printedBy: string;
  /** Document title shown in the heading, e.g. "Patient Registry" */
  title: string;
  /** Prefix for the reference number, e.g. "PT", "RPT", "INV" */
  refPrefix?: string;
  /** Pre-built inner HTML string for the body sections */
  bodyHtml: string;
}

export function printDocument({
  clinicName,
  printedBy,
  title,
  refPrefix = 'DOC',
  bodyHtml,
}: PrintDocumentOptions): void {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const refNo = `ABTC-${refPrefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const printDateFull = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const printTimeFull = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const CSS = [
    `*{box-sizing:border-box;margin:0;padding:0}`,
    `body{font-family:'Times New Roman',Times,serif;color:#000;background:#fff;padding:40px 48px;font-size:12pt;line-height:1.5}`,
    `.letterhead{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:6px}`,
    `.logo{width:64px;height:64px;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0}`,
    `.org{text-align:center}`,
    `.org .republic{font-size:9pt;letter-spacing:1px;text-transform:uppercase}`,
    `.org .dept{font-size:9pt;font-weight:700;text-transform:uppercase}`,
    `.org .clinic{font-size:14pt;font-weight:700;text-transform:uppercase;margin:2px 0}`,
    `.org .address{font-size:9pt;color:#333}`,
    `.divider-thick{border:none;border-top:3px double #000;margin:8px 0 4px}`,
    `.divider-thin{border:none;border-top:1px solid #000;margin:2px 0 16px}`,
    `.doc-title{text-align:center;margin:16px 0 20px}`,
    `.doc-title h2{font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:underline}`,
    `.doc-title p{font-size:10pt;margin-top:4px}`,
    `.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:20px;font-size:10pt;border:1px solid #ccc;padding:10px 14px}`,
    `h3.sec{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #000;padding-bottom:3px;margin:20px 0 10px}`,
    `table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:9.5pt}`,
    `th{background:#000;color:#fff;font-weight:700;padding:5px 8px;text-align:left}`,
    `td{padding:4px 8px;border-bottom:1px solid #ccc}`,
    `tr:nth-child(even) td{background:#f5f5f5}`,
    `table.info-table td{border:1px solid #ccc;padding:5px 10px;vertical-align:top}`,
    `table.info-table td.lbl{background:#f0f0f0;font-weight:700;font-size:9.5pt;width:22%}`,
    `table.info-table td.val{font-size:10pt;width:28%}`,
    `p.note{font-size:10pt;color:#333;margin-bottom:8px;font-style:italic}`,
    `.sig-section{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}`,
    `.sig-block .line{border-top:1px solid #000;margin-top:36px;padding-top:4px}`,
    `.sig-block .name{font-weight:700;font-size:11pt;text-transform:uppercase}`,
    `.sig-block .position{font-size:9.5pt}`,
    `.footer-bar{margin-top:40px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-size:8.5pt;color:#555}`,
    `@media print{body{padding:20px 28px}@page{margin:1.5cm}}`,
  ].join('');

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head>
    <title>${clinicName} — ${title}</title>
    <style>${CSS}</style>
  </head><body>
    <div class="letterhead">
      <div class="logo">&#10010;</div>
      <div class="org">
        <div class="republic">Republic of the Philippines</div>
        <div class="dept">Department of Health</div>
        <div class="clinic">${clinicName}</div>
        <div class="address">Animal Bite Treatment Center</div>
      </div>
    </div>
    <hr class="divider-thick"><hr class="divider-thin">
    <div class="doc-title">
      <h2>${title}</h2>
      <p>Reference No.: ${refNo}</p>
    </div>
    <div class="meta-grid">
      <span style="color:#444">Date Generated:</span><span style="font-weight:700">${printDateFull}</span>
      <span style="color:#444">Time Generated:</span><span style="font-weight:700">${printTimeFull}</span>
      <span style="color:#444">Prepared by:</span><span style="font-weight:700">${printedBy}</span>
    </div>
    ${bodyHtml}
    <div class="sig-section">
      <div class="sig-block">
        <div class="line">
          <div class="name">${printedBy}</div>
          <div class="position">Prepared by</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="line">
          <div class="name">____________________________</div>
          <div class="position">Noted by / Authorized Signatory</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>${clinicName} &mdash; Animal Bite Treatment Center</span>
      <span>Ref: ${refNo} &nbsp;|&nbsp; ${printDateFull}</span>
    </div>
  </body></html>`);

  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}
