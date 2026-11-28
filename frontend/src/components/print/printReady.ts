/** Wait for image decoding before opening browser print / Save as PDF. */
export async function waitForPrintImages(doc: Document): Promise<void> {
  await Promise.all(Array.from(doc.images, async (img) => {
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener('load', done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load', done);
        img.addEventListener('error', done);
        if (img.complete) done();
      });
    }
    if (img.naturalWidth === 0) {
      img.style.visibility = 'hidden';
    } else {
      await img.decode().catch(() => undefined);
    }
  }));
}

export async function printWhenReady(win: Window, close = false): Promise<void> {
  await waitForPrintImages(win.document);
  if (win.closed) return;
  win.focus();
  win.print();
  if (close) win.close();
}
