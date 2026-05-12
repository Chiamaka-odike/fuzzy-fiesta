"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MerchantProfile, PaymentReceipt } from "@/types";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { CurrencySelector } from "./CurrencySelector";
import { Button } from "@/components/ui/button";
import {
  Card2,
  CheckCircle,
  ArrowLeft,
  RoundTransferHorizontal,
  Dollar,
} from "@solar-icons/react";
import { toast } from "sonner";

const currencySymbols: Record<string, string> = {
  NGN: "₦",
  KES: "KES",
};

const formatter = new Intl.NumberFormat("en-NG");

const normalizeTransactionId = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);

export function CheckoutWidget({
  merchant,
  receipts,
  initialTransactionId,
}: {
  merchant: MerchantProfile;
  receipts: PaymentReceipt[];
  initialTransactionId?: string;
}) {
  const supportedCurrencies = ["NGN", "KES"];

  const otpRef = useRef<HTMLInputElement | null>(null);
  const [currency, setCurrency] = useState("NGN");
  const [transactionId, setTransactionId] = useState(
    normalizeTransactionId(initialTransactionId ?? ""),
  );
  const [step, setStep] = useState<"id" | "confirm" | "success">("id");
  const [browserReceipts, setBrowserReceipts] = useState<PaymentReceipt[]>([]);
  const [quote, setQuote] = useState<{
    id: string;
    source_amount: string;
    expires_at: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("flux-storage");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed.state && parsed.state.receipts) {
        setBrowserReceipts(
          parsed.state.receipts.map((receipt: any) => ({
            ...receipt,
            transactionId: normalizeTransactionId(receipt.transactionId),
          })),
        );
      }
    } catch {
      setBrowserReceipts([]);
    }
  }, []);

  const allReceipts = useMemo(() => {
    const seen = new Set<string>();
    return [...browserReceipts, ...receipts]
      .map((receipt) => ({
        ...receipt,
        transactionId: normalizeTransactionId(receipt.transactionId),
      }))
      .filter((receipt) => {
        if (seen.has(receipt.transactionId)) return false;
        seen.add(receipt.transactionId);
        return true;
      });
  }, [browserReceipts, receipts]);

  const activeReceipt = useMemo(
    () =>
      allReceipts.find(
        (receipt) =>
          receipt.transactionId === normalizeTransactionId(transactionId),
      ) ?? null,
    [allReceipts, transactionId],
  );

  const customerAmount = quote ? parseFloat(quote.source_amount) : 0;
  const formattedCustomerAmount = customerAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const fetchQuote = async () => {
    if (!activeReceipt) return;
    setQuoteLoading(true);
    try {
      // KES rough conversion rate — swap for live rate when ready
      const amount =
        currency === "KES"
          ? (activeReceipt.subtotal * 0.55).toFixed(2)
          : activeReceipt.subtotal.toFixed(2);

      setQuote({
        id: `quote_mock_${Date.now()}`,
        source_amount: amount,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handlePayment = async (method: string) => {
    if (!quote || !activeReceipt) {
      toast.error("No quote available. Please go back and try again.");
      return;
    }
    try {
      toast.loading("Preparing payment...");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: activeReceipt.subtotal,
          currency,
          title: `Payment to ${merchant.storeName}`,
          email: "customer@flux.app",
        }),
      });
      const data = await res.json();
      if (data.hostedUrl) {
        toast.dismiss();
        window.location.href = data.hostedUrl;
      } else {
        throw new Error(data.error ?? "No checkout URL returned");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to create checkout. Please try again.");
      console.error("Payment error:", error);
    }
  };

  if (step === "success") {
    return (
      <section className="max-w-2xl mx-auto rounded-[32px] border border-[#ddcdb9] bg-white p-12 text-center shadow-xl animate-in zoom-in-95 duration-500">
        <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle
            className="size-10 text-emerald-600"
            weight="BoldDuotone"
          />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-[#6e5a46] mb-8">
          Your payment of {currencySymbols[currency] ?? currency}{" "}
          {formattedCustomerAmount} has been confirmed. The merchant has been
          notified.
        </p>
        <div className="bg-[#fdf8f3] rounded-2xl p-6 mb-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Merchant</span>
            <span className="font-bold">{merchant.storeName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono">{transactionId}</span>
          </div>
          <div className="h-px bg-[#eadbc9]" />
          <div className="flex justify-between font-bold">
            <span>Total Paid</span>
            <span>
              {currencySymbols[currency] ?? currency} {formattedCustomerAmount}
            </span>
          </div>
        </div>
        <Button
          className="w-full rounded-full py-6 bg-black text-white hover:bg-zinc-800"
          onClick={() => (window.location.href = "/")}
        >
          Return Home
        </Button>
      </section>
    );
  }

  return (
    <section className="grid overflow-hidden rounded-[28px] border border-[#ddcdb9] bg-[#f8f1e7] shadow-[0_24px_60px_rgba(77,54,31,0.12)] md:grid-cols-[1.05fr_1fr]">
      {/* Left panel */}
      <div className="flex min-h-[620px] flex-col justify-between border-r border-[#e4d4c1] bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_38%),linear-gradient(180deg,_#f8f1e7,_#f1e5d6)] px-8 py-10 md:px-10">
        <div className="space-y-10">
          {/* Merchant info */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15] text-lg font-bold text-black shadow-sm">
              {(merchant.storeName[0] ?? "F").toUpperCase()}
            </div>
            <div>
              <p className="font-serif text-xs uppercase tracking-[0.35em] text-[#9b8468]">
                Merchant
              </p>
              <p className="font-serif text-xl font-medium text-zinc-900">
                {merchant.storeName}
              </p>
            </div>
          </div>

          {/* Checkout steps */}
          <div>
            <p className="font-serif text-sm uppercase tracking-[0.3em] text-[#9b8468]">
              Checkout Session
            </p>
            <div className="mt-4 space-y-3 text-[#6e5a46]">
              <p className="flex items-center gap-2">
                <CheckCircle
                  className={cn(
                    "size-4",
                    step !== "id"
                      ? "text-emerald-600"
                      : "text-[#9b8468] opacity-30",
                  )}
                />
                Identify Transaction
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle
                  className={cn(
                    "size-4",
                    step === "confirm"
                      ? "text-emerald-600"
                      : "text-[#9b8468] opacity-30",
                  )}
                />
                Confirm & Pay
              </p>
            </div>
          </div>

          {/* Receipt total */}
          <div className="space-y-4">
            <p className="font-serif text-sm uppercase tracking-[0.3em] text-[#9b8468]">
              Receipt total
            </p>
            <div className="rounded-2xl border border-[#ddcdb9] bg-[#fbf6ef] px-4 py-4 shadow-[0_10px_24px_rgba(77,54,31,0.08)]">
              {activeReceipt ? (
                <>
                  <p className="font-serif text-4xl font-medium text-zinc-900">
                    ₦{formatter.format(activeReceipt.subtotal)}
                  </p>
                  <p className="mt-2 text-sm text-[#7d6852]">
                    {activeReceipt.items.length} items • settles in{" "}
                    {merchant.settlementCurrency}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-serif text-3xl font-medium text-zinc-900">
                    Waiting for ID
                  </p>
                  <p className="mt-2 text-sm text-[#7d6852]">
                    Enter a 6-digit ID to load your receipt.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Customer pays */}
          {activeReceipt && (
            <div className="rounded-2xl border border-[#ddcdb9] bg-[#fbf6ef] px-4 py-4 shadow-[0_10px_24px_rgba(77,54,31,0.08)] animate-in slide-in-from-bottom-2">
              <p className="text-xs uppercase tracking-widest text-[#9b8468]">
                Customer pays
              </p>
              <p className="mt-2 font-serif text-2xl font-medium text-zinc-900">
                {currencySymbols[currency] ?? currency}{" "}
                {formattedCustomerAmount}
              </p>
              <p className="mt-1 text-sm text-[#7d6852]">
                Calculated at current market rates
              </p>
            </div>
          )}
        </div>

        <p className="mt-10 text-sm text-[#9b8468]">
          Secured by <span className="font-bold text-black">flux</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex min-h-[620px] flex-col justify-center bg-[#fdf8f2] px-8 py-10 md:px-12">
        <div className="mx-auto w-full max-w-[420px] space-y-6">
          {step === "id" ? (
            <>
              <div>
                <h2 className="font-serif text-4xl font-medium text-zinc-900">
                  Enter ID
                </h2>
                <p className="mt-3 text-[#7d6852]">
                  Enter the 6-digit code from the seller.
                </p>
              </div>

              <div className="space-y-3">
                <InputOTP
                  ref={otpRef}
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={transactionId}
                  onChange={(value) =>
                    setTransactionId(normalizeTransactionId(value))
                  }
                  autoFocus
                  containerClassName="justify-center"
                >
                  <div
                    className="flex justify-center"
                    onClick={() => otpRef.current?.focus()}
                  >
                    <InputOTPGroup className="cursor-text overflow-hidden rounded-[18px] border border-[#ddcdb9] bg-white shadow-sm">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-14 w-12 border-[#ddcdb9] bg-white text-lg font-bold"
                        />
                      ))}
                    </InputOTPGroup>
                  </div>
                </InputOTP>
              </div>

              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9b8468]">
                  Choose currency
                </p>
                <CurrencySelector
                  currencies={supportedCurrencies}
                  value={currency}
                  onChange={setCurrency}
                />
              </div>

              <Button
                className="w-full rounded-full py-7 text-lg bg-[#facc15] text-black hover:bg-[#eab308] shadow-lg shadow-yellow-500/10"
                disabled={
                  transactionId.length < 6 || !activeReceipt || quoteLoading
                }
                onClick={async () => {
                  await fetchQuote();
                  setStep("confirm");
                }}
              >
                {quoteLoading ? "Loading..." : "Confirm Receipt"}
              </Button>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("id")}
                  className="rounded-full -ml-2"
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Change ID
                </Button>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-zinc-900">
                  Choose Payment Method
                </h2>
                <p className="text-sm text-[#7d6852]">
                  Final amount: {currencySymbols[currency] ?? currency}{" "}
                  {formattedCustomerAmount}
                </p>
              </div>

              <div className="grid gap-3">
                {/* Dollar Account */}
                <Button
                  variant="outline"
                  className="h-16 justify-start rounded-2xl border-[#ddcdb9] bg-white hover:bg-[#fdfaf5] group"
                  onClick={() => handlePayment("Dollar Account")}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100">
                      <Dollar className="size-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Dollar Account</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Pay with USD balance
                      </p>
                    </div>
                  </div>
                </Button>

                {/* Card */}
                <Button
                  variant="outline"
                  className="h-16 justify-start rounded-2xl border-[#ddcdb9] bg-white hover:bg-[#fdfaf5] group"
                  onClick={() => handlePayment("Card")}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100">
                      <Card2 className="size-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Credit/Debit Card</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Visa, Mastercard, Verve
                      </p>
                    </div>
                  </div>
                </Button>

                {/* Bank Transfer */}
                <Button
                  variant="outline"
                  className="h-16 justify-start rounded-2xl border-[#ddcdb9] bg-white hover:bg-[#fdfaf5] group"
                  onClick={() => handlePayment("Transfer")}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100">
                      <RoundTransferHorizontal className="size-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Bank Transfer</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Direct local transfer
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          <p className="pt-2 text-center text-sm text-[#9b8468]">
            Protected by <span className="font-bold text-black">flux</span>{" "}
            security
          </p>
        </div>
      </div>
    </section>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}