'use client';

import { CheckoutWidget } from '@/components/checkout/CheckoutWidget';
import { useStore } from '@/lib/store/useStore';
import { useParams, useSearchParams } from 'next/navigation';
import { createDemoPaymentLink } from '@/lib/demo';
import type { MerchantProfile } from '@/types';

export default function PublicCheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { merchantProfile, receipts } = useStore();

  const linkId = typeof params.linkId === 'string' ? params.linkId : '';
  const transactionId = searchParams.get('txn') ?? undefined;

  // Use Zustand profile if available (merchant on their own device)
  // Otherwise build one from the URL (customer scanning QR on their device)
  const resolvedProfile: MerchantProfile | null = merchantProfile ?? (() => {
    if (!linkId) return null;

    const link = createDemoPaymentLink(linkId);
    return {
      id: linkId,
      ownerName: 'Merchant',
      storeName: link.title,
      storeCategory: 'Store',
      settlementCurrency: 'NGN',
      fixedCheckoutPath: `/pay/${linkId}`,
      qrCodeSeed: `flux-${linkId}`,
      createdAt: new Date().toISOString(),
    };
  })();

  if (!resolvedProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdf8f3]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Store not found</h2>
          <p className="text-muted-foreground">
            This checkout link appears to be invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <CheckoutWidget
        merchant={resolvedProfile}
        receipts={receipts}
        initialTransactionId={transactionId}
      />
    </main>
  );
}