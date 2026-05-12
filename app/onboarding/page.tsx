'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shop, 
  Code, 
  AltArrowRight, 
  AltArrowLeft, 
  PenNewSquare, 
  Wallet, 
  CheckCircle,
  Tag
} from '@solar-icons/react';
import { createDemoQrSvgMarkup } from '@/lib/demo';
import { useStore } from '@/lib/store/useStore';
import type { MerchantProfile, UserType } from '@/types';
import { toast } from 'sonner';

type Step = 'type' | 'store' | 'settlement' | 'success';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, setMerchantProfile } = useStore();
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [qrMarkup, setQrMarkup] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/signup');
    } else {
      setSelectedType(user.userType);
    }
  }, [user, router]);

  const slugify = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleNext = async () => {
    if (step === 'type') {
      if (!selectedType) return;
      setUser({ ...user!, userType: selectedType });
      if (selectedType === 'developer') {
        router.push('/dashboard/dev');
      } else {
        setStep('store');
      }

    } else if (step === 'store') {
      if (!storeName.trim()) {
        toast.error('Please enter your store name.');
        return;
      }
      if (!storeCategory.trim()) {
        toast.error('Please enter your business category.');
        return;
      }
      setStep('settlement');

    } else if (step === 'settlement') {
      const storeSlug = slugify(storeName);
      const checkoutPath = `/pay/${storeSlug}`;

      const markup = await createDemoQrSvgMarkup(
        `${window.location.origin}${checkoutPath}`
      );
      setQrMarkup(markup);

      const profile: MerchantProfile = {
        id: storeSlug,
        ownerName: user?.name ?? 'Owner',
        storeName,
        storeCategory,
        settlementCurrency: currency,
        fixedCheckoutPath: checkoutPath,
        qrCodeSeed: `flux-${storeSlug}`,
        createdAt: new Date().toISOString(),
      };

      setMerchantProfile(profile);
      setStep('success');
    }
  };

  const handleBack = () => {
    if (step === 'store') setStep('type');
    if (step === 'settlement') setStep('store');
  };

  if (!user) return null;

  const steps: Step[] = ['type', 'store', 'settlement', 'success'];
  const currentIdx = steps.indexOf(step);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10 flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-[32px] border border-[#ddcdb9] bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.14),_transparent_28%),linear-gradient(180deg,_#fbf4ea,_#f4e8d8)] p-8 md:p-12 shadow-[0_24px_60px_rgba(77,54,31,0.08)]">

        {step !== 'success' && (
          <div className="flex gap-2 mb-8 justify-center">
            {steps.map((s, idx) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-all duration-500 ${
                  idx <= currentIdx ? 'bg-[#facc15]' : 'bg-[#ddcdb9]'
                }`}
              />
            ))}
          </div>
        )}

        <div className="space-y-8">

          {/* Step 1 — Type */}
          {step === 'type' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="font-serif text-xs uppercase tracking-[0.4em] text-[#9b8468]">Step 1</p>
                <h1 className="text-4xl font-semibold text-zinc-900">How will you use Flux, {user.name}?</h1>
                <p className="text-[#6e5a46]">Choose the profile that best fits your needs.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {([
                  {
                    type: 'merchant' as UserType,
                    icon: Shop,
                    label: 'Merchant',
                    description: 'I run a physical store and want to accept any currency via QR.',
                  },
                  {
                    type: 'developer' as UserType,
                    icon: Code,
                    label: 'Developer',
                    description: 'I want to integrate Flux payment rails into my own application.',
                  },
                ] as const).map(({ type, icon: Icon, label, description }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`group flex flex-col items-center p-8 rounded-3xl border transition-all text-center ${
                      selectedType === type
                        ? 'bg-[#fffaf4] border-[#facc15] ring-2 ring-[#facc15]'
                        : 'bg-white/50 border-[#ddcdb9] hover:border-[#facc15]'
                    }`}
                  >
                    <div className={`p-4 rounded-2xl mb-4 transition-colors ${
                      selectedType === type ? 'bg-[#facc15]/20' : 'bg-[#fbf4ea] group-hover:bg-[#facc15]/10'
                    }`}>
                      <Icon weight="BoldDuotone" className={`size-10 ${selectedType === type ? 'text-[#eab308]' : 'text-[#9b8468]'}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-900">{label}</h3>
                    <p className="mt-2 text-sm text-[#6e5a46]">{description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Store */}
          {step === 'store' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="font-serif text-xs uppercase tracking-[0.4em] text-[#9b8468]">Step 2</p>
                <h1 className="text-4xl font-semibold text-zinc-900">Tell us about your store.</h1>
                <p className="text-[#6e5a46]">This will appear on your receipts and checkout page.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <PenNewSquare weight="BoldDuotone" className="size-5 text-[#9b8468] opacity-70" />
                  </div>
                  <input
                    className="input pl-12 h-14"
                    placeholder="Store name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Tag weight="BoldDuotone" className="size-5 text-[#9b8468] opacity-70" />
                  </div>
                  <input
                    className="input pl-12 h-14"
                    placeholder="Business category (e.g. Fashion, Cafe)"
                    value={storeCategory}
                    onChange={(e) => setStoreCategory(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Settlement */}
          {step === 'settlement' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="font-serif text-xs uppercase tracking-[0.4em] text-[#9b8468]">Step 3</p>
                <h1 className="text-4xl font-semibold text-zinc-900">Settlement preference.</h1>
                <p className="text-[#6e5a46]">Choose which currency you want to receive your payouts in.</p>
              </div>

              <div className="grid gap-3">
                {['NGN', 'KES', 'USDT'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                      currency === curr
                        ? 'bg-[#fffaf4] border-[#facc15] ring-1 ring-[#facc15]'
                        : 'bg-white/50 border-[#ddcdb9] hover:border-[#facc15]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${currency === curr ? 'bg-[#facc15]/20 text-[#eab308]' : 'bg-[#fbf4ea] text-[#9b8468]'}`}>
                        <Wallet weight="BoldDuotone" className="size-6" />
                      </div>
                      <span className="font-semibold text-lg">{curr}</span>
                    </div>
                    {currency === curr && <CheckCircle weight="Bold" className="size-6 text-[#facc15]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Success */}
          {step === 'success' && (
            <div className="text-center space-y-8 py-4">
              <div className="space-y-2">
                <div className="inline-flex p-4 rounded-full bg-green-100 text-green-600 mb-2">
                  <CheckCircle weight="BoldDuotone" className="size-12" />
                </div>
                <h1 className="text-4xl font-semibold text-zinc-900">You&apos;re all set!</h1>
                <p className="text-[#6e5a46]">Your store is ready to accept payments. Here is your unique checkout QR.</p>
              </div>

              <div className="max-w-[240px] mx-auto p-4 bg-white rounded-[32px] border border-[#ddcdb9] shadow-lg">
                <div dangerouslySetInnerHTML={{ __html: qrMarkup }} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{storeName}</h3>
                <p className="text-sm text-[#9b8468] uppercase tracking-widest">{storeCategory}</p>
              </div>

              <button
                onClick={() => router.push('/dashboard/merchant')}
                className="btn-primary w-full rounded-full py-4 text-lg flex items-center justify-center gap-2 group"
              >
                Enter Dashboard
                <AltArrowRight weight="BoldDuotone" className="size-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* Navigation */}
          {step !== 'success' && (
            <div className="flex items-center gap-4 pt-4">
              {step !== 'type' && (
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-[#cfbba6] text-[#4d3a2c] font-semibold hover:bg-[#f7efe4] transition-colors"
                >
                  <AltArrowLeft weight="BoldDuotone" className="size-5 opacity-50" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={step === 'type' && !selectedType}
                className="btn-primary flex-1 rounded-full py-4 text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{step === 'settlement' ? 'Finish Setup' : 'Continue'}</span>
                <AltArrowRight weight="BoldDuotone" className="size-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}