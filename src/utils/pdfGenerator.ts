import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { CertificateRecord } from '../data/certifiedParticipants';
import { claimCertificateByStudent, recordDownloadCountOnly } from '../firebase/service';

let cachedTemplateBytes: ArrayBuffer | null = null;
let cachedNameFontBytes: ArrayBuffer | null = null;
let cachedCourseFontBytes: ArrayBuffer | null = null;

async function fetchAssetAsBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load asset from ${url} (status ${res.status})`);
  }
  return res.arrayBuffer();
}

// Resolve the canonical base URL: prefer the env var (Vercel deployment URL),
// then fall back to whatever window.location.origin is at runtime.
function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, '');
  const envUrl = (import.meta.env.VITE_APP_URL as string | undefined) || '';
  if (envUrl.trim()) return envUrl.trim().replace(/\/$/, '');
  return window.location.origin.replace(/\/$/, '');
}

export async function generateCertificatePdf(
  cert: CertificateRecord,
  baseUrl?: string
): Promise<{ blob: Blob; fileName: string }> {
  const resolvedBase = resolveBaseUrl(baseUrl);
  // 1. Fetch template
  if (!cachedTemplateBytes) {
    cachedTemplateBytes = await fetchAssetAsBuffer('/Certified.pdf');
  }

  const pdfDoc = await PDFDocument.load(cachedTemplateBytes);
  pdfDoc.registerFontkit(fontkit);

  // 2. Load fonts
  let nameFont;
  let courseFont;
  let subtleIdFont;

  try {
    if (!cachedNameFontBytes) {
      cachedNameFontBytes = await fetchAssetAsBuffer('/fonts/Palatino-Bold.ttf');
    }
    nameFont = await pdfDoc.embedFont(cachedNameFontBytes);
  } catch (e) {
    nameFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  }

  try {
    if (!cachedCourseFontBytes) {
      cachedCourseFontBytes = await fetchAssetAsBuffer('/fonts/SegoeUI-Bold.ttf');
    }
    courseFont = await pdfDoc.embedFont(cachedCourseFontBytes);
  } catch (e) {
    courseFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  subtleIdFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize(); // 842 x 595

  // 3. Draw Participant Name
  const maxNameWidth = 430;
  let nameFontSize = 24;
  while (nameFont.widthOfTextAtSize(cert.name, nameFontSize) > maxNameWidth && nameFontSize > 12) {
    nameFontSize -= 0.5;
  }
  const nameWidth = nameFont.widthOfTextAtSize(cert.name, nameFontSize);
  const nameX = (width - nameWidth) / 2;
  const nameY = 348;

  page.drawText(cert.name, {
    x: nameX,
    y: nameY,
    size: nameFontSize,
    font: nameFont,
    color: rgb(15 / 255, 23 / 255, 42 / 255) // Neutral dark #0F172A
  });

  // 4. Draw Course / Programme Completed (YMCA Red)
  const maxCourseWidth = 340;
  let courseFontSize = 17;
  while (courseFont.widthOfTextAtSize(cert.course, courseFontSize) > maxCourseWidth && courseFontSize > 11) {
    courseFontSize -= 0.5;
  }
  const courseWidth = courseFont.widthOfTextAtSize(cert.course, courseFontSize);
  const courseX = (width - courseWidth) / 2;
  const courseY = 201;

  page.drawText(cert.course, {
    x: courseX,
    y: courseY,
    size: courseFontSize,
    font: courseFont,
    color: rgb(196 / 255, 18 / 255, 48 / 255) // YMCA RED #C41230
  });

  // 5. Draw QR Code in designated quiet corner
  const verifyUrl = `${resolvedBase}/verify/${cert.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 250,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  const qrImage = await pdfDoc.embedPng(qrDataUrl);
  page.drawImage(qrImage, {
    x: 736,
    y: 206,
    width: 56,
    height: 56
  });

  // 6. Draw Subtle Certificate ID in bottom-right corner watermark (Section 15 requirement)
  const idText = `ID: ${cert.id}`;
  page.drawText(idText, {
    x: 630,
    y: 18,
    size: 6.5,
    font: subtleIdFont,
    color: rgb(148 / 255, 163 / 255, 184 / 255) // Subtle gray #94A3B8 watermark
  });

  // 7. Output PDF Blob — pdfDoc.save() returns a Uint8Array; wrap in Blob directly.
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

  const cleanName = cert.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
  const cleanCourse = cert.course.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
  const fileName = `YMCA_Certificate_${cleanName}_${cleanCourse}.pdf`;

  return { blob, fileName };
}

export async function downloadCertificatePdf(
  cert: CertificateRecord,
  baseUrl?: string,
  isStudentClaim: boolean = false
): Promise<void> {
  const { blob, fileName } = await generateCertificatePdf(cert, baseUrl);

  if (isStudentClaim) {
    claimCertificateByStudent(cert.id).catch(console.error);
  } else {
    recordDownloadCountOnly(cert.id).catch(console.error);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function viewCertificatePdf(
  cert: CertificateRecord,
  baseUrl?: string
): Promise<void> {
  const { blob } = await generateCertificatePdf(cert, baseUrl);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
