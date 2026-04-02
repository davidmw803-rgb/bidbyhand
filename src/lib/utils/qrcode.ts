import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Generate QR code as a data URL for an item's Aircode */
export async function generateItemQR(eventSlug: string, itemId: string): Promise<string> {
  const url = `${APP_URL}/events/${eventSlug}/items/${itemId}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

/** Generate QR code as a data URL for a guest ticket */
export async function generateTicketQR(guestId: string): Promise<string> {
  const url = `${APP_URL}/checkin/${guestId}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'H',
  });
}

/** Generate QR code as SVG string (for printing) */
export async function generateItemQRSvg(eventSlug: string, itemId: string): Promise<string> {
  const url = `${APP_URL}/events/${eventSlug}/items/${itemId}`;
  return QRCode.toString(url, {
    type: 'svg',
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

/** Generate QR code as a Buffer (for server-side image generation) */
export async function generateQRBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}
