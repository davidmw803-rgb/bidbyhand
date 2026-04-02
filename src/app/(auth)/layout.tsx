import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Heart className="h-8 w-8 text-brand-600" fill="currentColor" />
        <span className="text-2xl font-bold text-gray-900">BidByHand</span>
      </Link>
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
