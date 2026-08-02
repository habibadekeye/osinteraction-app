import { jsPDF } from 'jspdf';
import type { KnowledgeDocument } from '../types';

const NNPC_GREEN = [0, 135, 81] as const;   // #008751
const DARK_NAVY  = [10, 25, 15] as const;
const GRAY       = [100, 110, 100] as const;
const LIGHT_GRAY = [240, 245, 240] as const;

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadDocumentPDF(doc: KnowledgeDocument): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  // ── Header bar ────────────────────────────────────────────
  pdf.setFillColor(...NNPC_GREEN);
  pdf.rect(0, 0, pageW, 28, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HSE OPS AI  ·  NNPC Ltd  ·  HSE Platform', marginL, 11);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, marginL, 18);

  // Document code top-right
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  const codeW = pdf.getStringUnitWidth(doc.document_code) * 9 / pdf.internal.scaleFactor;
  pdf.text(doc.document_code, pageW - marginR - codeW, 11);

  y = 36;

  // ── Title block ───────────────────────────────────────────
  pdf.setTextColor(...DARK_NAVY);
  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(doc.title, contentW) as string[];
  pdf.text(titleLines, marginL, y);
  y += titleLines.length * 8 + 3;

  // Severity / risk pill
  const riskColors: Record<string, [number, number, number]> = {
    critical: [220, 38, 38], high: [234, 88, 12],
    medium:   [202, 138, 4], low:  [22, 163, 74],
  };
  const rc = riskColors[doc.risk_level] ?? [100, 100, 100];
  pdf.setFillColor(...rc);
  pdf.roundedRect(marginL, y, 30, 6, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.risk_level.toUpperCase(), marginL + 3, y + 4.2);

  if (doc.is_emergency_critical) {
    pdf.setFillColor(220, 38, 38);
    pdf.roundedRect(marginL + 34, y, 36, 6, 2, 2, 'F');
    pdf.text('EMERGENCY CRITICAL', marginL + 37, y + 4.2);
  }
  y += 12;

  // ── Meta table ────────────────────────────────────────────
  pdf.setFillColor(...LIGHT_GRAY);
  pdf.rect(marginL, y, contentW, 22, 'F');

  const meta = [
    ['Document Code', doc.document_code],
    ['Type',          doc.document_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ['Version',       `v${doc.version}`],
    ['Status',        doc.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ['Category',      doc.knowledge_categories?.name ?? '—'],
  ];

  const colW = contentW / meta.length;
  meta.forEach(([label, value], i) => {
    const x = marginL + i * colW + 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.text(label, x, y + 7);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...DARK_NAVY);
    pdf.text(value, x, y + 15);
  });
  y += 28;

  // ── Description ───────────────────────────────────────────
  if (doc.description) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...NNPC_GREEN);
    pdf.text('Description', marginL, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...DARK_NAVY);
    pdf.setFontSize(9);
    const descLines = pdf.splitTextToSize(doc.description, contentW) as string[];
    pdf.text(descLines, marginL, y);
    y += descLines.length * 5 + 6;
  }

  // ── Tags ──────────────────────────────────────────────────
  if (doc.metadata_tags?.length) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...NNPC_GREEN);
    pdf.text('Tags', marginL, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.setFontSize(8);
    pdf.text(doc.metadata_tags.join('  ·  '), marginL, y);
    y += 8;
  }

  // ── Document content ──────────────────────────────────────
  if (doc.content?.trim()) {
    // Section header
    pdf.setFillColor(...NNPC_GREEN);
    pdf.rect(marginL, y, contentW, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Procedure Content', marginL + 3, y + 5.5);
    y += 12;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...DARK_NAVY);

    const contentLines = pdf.splitTextToSize(doc.content.trim(), contentW) as string[];
    const lineH = 5;

    for (const line of contentLines) {
      if (y + lineH > pageH - 18) {
        // Page break
        addFooter(pdf, pageW, pageH, doc.document_code);
        pdf.addPage();
        y = 20;
        // Re-apply header stripe on new page
        pdf.setFillColor(...NNPC_GREEN);
        pdf.rect(0, 0, pageW, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${doc.title}  ·  ${doc.document_code}`, marginL, 5.5);
        y = 18;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...DARK_NAVY);
      }
      pdf.text(line, marginL, y);
      y += lineH;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...GRAY);
    pdf.text('No document content stored. Upload or paste the procedure text to enable PDF export of content.', marginL, y, { maxWidth: contentW });
  }

  addFooter(pdf, pageW, pageH, doc.document_code);

  const fileName = `${doc.document_code}_v${doc.version}_${doc.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.pdf`;
  pdf.save(fileName);
}

function addFooter(pdf: jsPDF, pageW: number, pageH: number, code: string) {
  pdf.setFillColor(...NNPC_GREEN);
  pdf.rect(0, pageH - 10, pageW, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('NEPL HSE Platform  ·  Confidential — Internal Use Only', 20, pageH - 4);
  const totalPages = (pdf.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  const pageNum = `${code}  ·  Page ${totalPages}`;
  const numW = pdf.getStringUnitWidth(pageNum) * 7 / pdf.internal.scaleFactor;
  pdf.text(pageNum, pageW - 20 - numW, pageH - 4);
}

export function formatFileSize(bytes: number): string {
  return fmt(bytes);
}
