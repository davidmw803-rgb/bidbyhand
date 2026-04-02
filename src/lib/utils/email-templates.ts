import { formatCurrency, formatDateTime } from './index';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type TicketConfirmationData = {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  ticketType: string;
  paddleNumber: string;
  qrCodeUrl: string;
  eventSlug: string;
};

type InvoiceEmailData = {
  guestName: string;
  eventName: string;
  items: Array<{ title: string; amount: number }>;
  donationsTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  invoiceId: string;
  eventSlug: string;
};

type OutbidAlertData = {
  guestName: string;
  itemTitle: string;
  currentBid: number;
  itemId: string;
  eventSlug: string;
};

type DonationReceiptData = {
  donorName: string;
  orgName: string;
  orgEin: string;
  amount: number;
  campaignName: string;
  tributeName?: string;
  date: string;
};

export function ticketConfirmationEmail(data: TicketConfirmationData): { subject: string; html: string } {
  return {
    subject: `Your ticket for ${data.eventName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0074c5; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">You're In!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; color: #333;">Hi ${data.guestName},</p>
          <p style="font-size: 16px; color: #333;">Your registration for <strong>${data.eventName}</strong> is confirmed!</p>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 4px 0; color: #666;"><strong>Date:</strong> ${formatDateTime(data.eventDate)}</p>
            <p style="margin: 4px 0; color: #666;"><strong>Venue:</strong> ${data.eventVenue}</p>
            <p style="margin: 4px 0; color: #666;"><strong>Ticket:</strong> ${data.ticketType}</p>
            <p style="margin: 4px 0; color: #666;"><strong>Paddle #:</strong> ${data.paddleNumber}</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #666; font-size: 14px;">Show this QR code at check-in:</p>
            <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/events/${data.eventSlug}/items"
               style="background: #0074c5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Preview Auction Items
            </a>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px 24px; text-align: center; color: #999; font-size: 12px;">
          Powered by BidByHand
        </div>
      </div>
    `,
  };
}

export function invoiceEmail(data: InvoiceEmailData): { subject: string; html: string } {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.title}</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.amount)}</td></tr>`
    )
    .join('');

  return {
    subject: `Your invoice from ${data.eventName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0074c5; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Your Invoice</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p>Hi ${data.guestName}, congratulations on your wins at <strong>${data.eventName}</strong>!</p>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="text-align: left; padding: 8px 0;">Item</th>
                <th style="text-align: right; padding: 8px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              ${data.donationsTotal > 0 ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Donations</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(data.donationsTotal)}</td></tr>` : ''}
            </tbody>
            <tfoot>
              <tr><td style="padding: 8px 0;"><strong>Subtotal</strong></td><td style="text-align: right; padding: 8px 0;"><strong>${formatCurrency(data.subtotal)}</strong></td></tr>
              ${data.tax > 0 ? `<tr><td style="padding: 4px 0; color: #666;">Tax</td><td style="text-align: right; padding: 4px 0; color: #666;">${formatCurrency(data.tax)}</td></tr>` : ''}
              <tr style="border-top: 2px solid #333;"><td style="padding: 12px 0; font-size: 18px;"><strong>Total</strong></td><td style="text-align: right; padding: 12px 0; font-size: 18px;"><strong>${formatCurrency(data.total)}</strong></td></tr>
            </tfoot>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/events/${data.eventSlug}/checkout"
               style="background: #0074c5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Pay Now
            </a>
          </div>
        </div>
      </div>
    `,
  };
}

export function outbidAlertEmail(data: OutbidAlertData): { subject: string; html: string } {
  return {
    subject: `You've been outbid on "${data.itemTitle}"`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">You've Been Outbid!</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="font-size: 16px;">Someone placed a higher bid on <strong>${data.itemTitle}</strong>.</p>
          <p style="font-size: 24px; font-weight: 700; color: #0074c5; margin: 16px 0;">Current bid: ${formatCurrency(data.currentBid)}</p>
          <a href="${APP_URL}/events/${data.eventSlug}/items/${data.itemId}"
             style="background: #0074c5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Bid Again
          </a>
        </div>
      </div>
    `,
  };
}

export function donationReceiptEmail(data: DonationReceiptData): { subject: string; html: string } {
  return {
    subject: `Donation receipt from ${data.orgName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0074c5; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Thank You!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p>Dear ${data.donorName},</p>
          <p>Thank you for your generous donation to <strong>${data.orgName}</strong>.</p>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 4px 0;"><strong>Amount:</strong> ${formatCurrency(data.amount)}</p>
            <p style="margin: 4px 0;"><strong>Campaign:</strong> ${data.campaignName}</p>
            ${data.tributeName ? `<p style="margin: 4px 0;"><strong>In honor of:</strong> ${data.tributeName}</p>` : ''}
            <p style="margin: 4px 0;"><strong>Date:</strong> ${data.date}</p>
          </div>

          <p style="font-size: 12px; color: #666; margin-top: 24px;">
            ${data.orgName} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code.
            EIN: ${data.orgEin}. No goods or services were provided in exchange for this contribution.
            Please retain this receipt for your tax records.
          </p>
        </div>
      </div>
    `,
  };
}
