'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, CheckCircle, Receipt, Loader2 } from 'lucide-react';

type InvoiceItem = {
  title: string;
  amount: number;
};

type Invoice = {
  id: string;
  items: InvoiceItem[];
  donations_total: number;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  paid_at: string | null;
};

export default function CheckoutPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/events/${params.eventId}/invoices?guest=me`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setInvoice(data.data);
            if (data.data.status === 'paid') setIsPaid(true);
          }
        }
      } catch {
        setError('Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvoice();
  }, [params.eventId]);

  async function handlePay() {
    if (!invoice) return;
    setIsPaying(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${params.eventId}/invoices/${invoice.id}`, {
        method: 'POST',
      });

      if (res.ok) {
        setIsPaid(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Payment failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Payment Complete!</h1>
          <p className="text-gray-500 mt-2">
            Your receipt has been sent to your email. Thank you for your support!
          </p>
          {invoice && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Total paid</p>
              <p className="text-3xl font-bold text-brand-700">
                {formatCurrency(invoice.total)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">No Invoice Yet</h1>
          <p className="text-gray-500 mt-2">
            Your invoice will appear here once the auction closes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        {/* Invoice items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Your Items</h2>
          </div>

          <div className="divide-y divide-gray-50">
            {(invoice.items as InvoiceItem[]).map((item, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-700 text-sm flex-1">{item.title}</span>
                <span className="font-semibold text-gray-900 ml-4">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}

            {invoice.donations_total > 0 && (
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-700 text-sm">Donations</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(invoice.donations_total)}
                </span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Card on file will be charged</span>
          </div>

          <button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full py-4 px-6 rounded-xl bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 active:bg-brand-800 transition-all shadow-lg disabled:opacity-50 active:scale-[0.98]"
          >
            {isPaying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ${formatCurrency(invoice.total)}`
            )}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
