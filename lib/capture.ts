// Shared export helpers for the printable sheets (voucher, exam result, daily).
//
// Two mobile bugs this fixes:
//  1) Horizontal clipping — html2canvas captures a node at its on-screen width.
//     On a phone the tables overflow (`min-width` inside `overflow-x:auto`), so
//     the right-hand columns get cut off. We force a fixed desktop width and
//     unclip the table wrappers during capture, then restore the styles.
//  2) Vertical overflow — a long sheet is taller than one A4 page; the old code
//     pasted the whole image at a computed height so the bottom was lost. We now
//     slice the canvas across as many A4 pages as needed.

const EXPORT_WIDTH = 760;

/** Render a printable node to a canvas at a fixed width so nothing is clipped. */
export async function captureSheet(node: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;

  const prevWidth = node.style.width;
  const prevMaxWidth = node.style.maxWidth;
  const wraps = Array.from(node.querySelectorAll<HTMLElement>('.table-wrap'));
  const prevOverflow = wraps.map((w) => w.style.overflowX);

  node.style.width = `${EXPORT_WIDTH}px`;
  node.style.maxWidth = 'none';
  wraps.forEach((w) => { w.style.overflowX = 'visible'; });

  try {
    return await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      width: EXPORT_WIDTH,
      windowWidth: EXPORT_WIDTH + 60, // desktop layout in the clone (skip mobile media queries)
    });
  } finally {
    node.style.width = prevWidth;
    node.style.maxWidth = prevMaxWidth;
    wraps.forEach((w, i) => { w.style.overflowX = prevOverflow[i]; });
  }
}

/** Save a captured canvas as a (multi-page if tall) A4 PDF. */
export async function sheetToPdf(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, pageH = 297, margin = 10;
  const imgW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const fullImgH = (canvas.height * imgW) / canvas.width;

  if (fullImgH <= contentH) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, fullImgH);
  } else {
    const pageHpx = (contentH * canvas.width) / imgW; // canvas px that fit one page
    for (let y = 0, first = true; y < canvas.height; y += pageHpx, first = false) {
      const sliceH = Math.min(pageHpx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (!first) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, (sliceH * imgW) / canvas.width);
    }
  }
  pdf.save(filename);
}
