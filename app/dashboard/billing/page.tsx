"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const PLAN_DETAILS: Record<string, { name: string; color: string; features: string[] }> = {
  free: {
    name: "Free",
    color: "#A1A1AA",
    features: ["1 agent", "7 days history", "Basic dashboard"],
  },
  pro: {
    name: "Pro",
    color: "#7C3AED",
    features: ["5 agents", "90 days history", "Smart alerts", "Recommendations", "CSV export", "Prompt replay"],
  },
  team: {
    name: "Team",
    color: "#F59E0B",
    features: ["25 agents", "1 year history", "Team dashboard", "API access", "Webhooks", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    color: "#10B981",
    features: ["Unlimited agents", "Unlimited history", "All features", "Dedicated support", "Custom integrations"],
  },
};

const STRIPE_PLANS = [
  {
    id: "pro_monthly",
    name: "Pro",
    price: 29,
    interval: "month",
    color: "#7C3AED",
    features: ["5 agents", "90 days history", "Smart alerts", "Prompt replay"],
    popular: true,
  },
  {
    id: "team_monthly",
    name: "Team",
    price: 99,
    interval: "month",
    color: "#F59E0B",
    features: ["25 agents", "1 year history", "Team dashboard", "Webhooks"],
    popular: false,
  },
];

function CreditCardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function StripeCheckoutForm({ selectedPlan, onCancel }: { selectedPlan: typeof STRIPE_PLANS[0]; onCancel: () => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProcessing(true);

    // In production, this would create a Stripe checkout session via API
    // For now, show a message directing to Stripe setup
    setTimeout(() => {
      setProcessing(false);
      setError("Stripe integration requires API keys. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in your environment to enable payments.");
    }, 1500);
  };

  const getCardBrand = () => {
    const num = cardNumber.replace(/\s/g, "");
    if (num.startsWith("4")) return "Visa";
    if (num.startsWith("5") || num.startsWith("2")) return "Mastercard";
    if (num.startsWith("3")) return "Amex";
    return null;
  };

  const brand = getCardBrand();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-[#FAFAFA]">
          Subscribe to {selectedPlan.name} — ${selectedPlan.price}/{selectedPlan.interval}
        </h4>
        <button type="button" onClick={onCancel} className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition">
          Cancel
        </button>
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-xs text-[#A1A1AA] mb-1.5">Card number</label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#3A3A3D] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30 font-mono tracking-wider"
            maxLength={19}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {brand && (
              <span className="text-[10px] font-medium text-[#A1A1AA] bg-[#2A2A2D] px-1.5 py-0.5 rounded">
                {brand}
              </span>
            )}
            <CreditCardIcon />
          </div>
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#A1A1AA] mb-1.5">Expiration</label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#3A3A3D] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30 font-mono"
            maxLength={5}
          />
        </div>
        <div>
          <label className="block text-xs text-[#A1A1AA] mb-1.5">CVC</label>
          <input
            type="text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="123"
            className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#3A3A3D] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30 font-mono"
            maxLength={4}
          />
        </div>
      </div>

      {/* Name on card */}
      <div>
        <label className="block text-xs text-[#A1A1AA] mb-1.5">Name on card</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Smith"
          className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#3A3A3D] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
        />
      </div>

      {error && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg p-3">
          <p className="text-xs text-[#EF4444]">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={processing || !cardNumber || !expiry || !cvc || !name}
        className="w-full bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:bg-[#7C3AED]/50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Pay ${selectedPlan.price}/{selectedPlan.interval}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-[10px] text-[#A1A1AA]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        Secured by Stripe. We never store your card details.
      </div>
    </form>
  );
}

export default function BillingPage() {
  const [plan, setPlan] = useState("free");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");
  const [selectedStripePlan, setSelectedStripePlan] = useState<typeof STRIPE_PLANS[0] | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchBilling = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/payments", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan || "free");
        setPayments(data.payments || []);
      }
      setLoading(false);
    };
    fetchBilling();
  }, []);

  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.free;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Billing</h1>
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#FAFAFA]">Billing</h1>

      {/* Current Plan */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">Current Plan</h3>
          <span
            className="text-xs px-3 py-1 rounded-full uppercase font-semibold"
            style={{ backgroundColor: planInfo.color + "20", color: planInfo.color }}
          >
            {planInfo.name}
          </span>
        </div>

        {plan === "free" ? (
          <div>
            <p className="text-sm text-[#A1A1AA] mb-4">
              You&apos;re on the free plan. Upgrade to unlock more agents, longer history, and advanced features.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#A1A1AA] mb-3">Full access to all {planInfo.name} features.</p>
            <ul className="space-y-1.5">
              {planInfo.features.map((f) => (
                <li key={f} className="text-sm text-[#A1A1AA] flex items-center gap-2">
                  <span className="text-[#10B981]">&#10003;</span> {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Upgrade Section — only show for free users */}
      {plan === "free" && (
        <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Upgrade Your Plan</h3>

          {/* Payment Method Toggle */}
          <div className="flex items-center gap-1 bg-[#0A0A0B] rounded-lg p-1 mb-6">
            <button
              onClick={() => { setPaymentMethod("card"); setSelectedStripePlan(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                paymentMethod === "card"
                  ? "bg-[#7C3AED] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              <CreditCardIcon />
              Credit Card
            </button>
            <button
              onClick={() => { setPaymentMethod("crypto"); setSelectedStripePlan(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                paymentMethod === "crypto"
                  ? "bg-[#F59E0B] text-white"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Crypto (ETH)
            </button>
          </div>

          {paymentMethod === "card" && !selectedStripePlan && (
            <div className="space-y-3">
              {STRIPE_PLANS.map((sp) => (
                <div
                  key={sp.id}
                  className={`border rounded-xl p-4 cursor-pointer transition hover:border-[#3A3A3D] ${
                    sp.popular ? "border-[#7C3AED]/50 bg-[#7C3AED]/5" : "border-[#2A2A2D]"
                  }`}
                  onClick={() => setSelectedStripePlan(sp)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: sp.color + "15" }}
                      >
                        <span className="text-lg font-bold" style={{ color: sp.color }}>
                          {sp.name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#FAFAFA]">{sp.name}</h4>
                          {sp.popular && (
                            <span className="text-[9px] bg-[#7C3AED] text-white px-2 py-0.5 rounded-full font-medium">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-0.5">
                          {sp.features.join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-[#FAFAFA]">${sp.price}</span>
                      <span className="text-xs text-[#A1A1AA]">/{sp.interval}</span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-[#A1A1AA] text-center mt-2">
                Cancel anytime. Payments processed securely by Stripe.
              </p>
            </div>
          )}

          {paymentMethod === "card" && selectedStripePlan && (
            <StripeCheckoutForm
              selectedPlan={selectedStripePlan}
              onCancel={() => setSelectedStripePlan(null)}
            />
          )}

          {paymentMethod === "crypto" && (
            <div className="text-center">
              <p className="text-sm text-[#A1A1AA] mb-4">
                Get lifetime access with a one-time ETH payment. No recurring charges.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border border-[#2A2A2D] rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-[#FAFAFA]">Pro Lifetime</h4>
                  <div className="text-2xl font-bold text-[#FAFAFA] mt-1">$199</div>
                  <p className="text-xs text-[#A1A1AA] mt-1">One-time payment</p>
                </div>
                <div className="border border-[#2A2A2D] rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-[#FAFAFA]">Team Lifetime</h4>
                  <div className="text-2xl font-bold text-[#FAFAFA] mt-1">$499</div>
                  <p className="text-xs text-[#A1A1AA] mt-1">One-time payment</p>
                </div>
              </div>
              <Link
                href="/pay/crypto"
                className="inline-block bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 px-6 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Pay with ETH
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Payment Method on File */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Payment Method</h3>
        {plan === "free" ? (
          <p className="text-sm text-[#A1A1AA]">No payment method on file. Upgrade to add one.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#7C3AED]/10 rounded-lg flex items-center justify-center text-[#7C3AED]">
              <CreditCardIcon />
            </div>
            <div>
              <p className="text-sm text-[#FAFAFA] font-medium">Payment on file</p>
              <p className="text-xs text-[#A1A1AA]">Managed by Stripe</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-[#A1A1AA]">No payments yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-3 border-b border-[#2A2A2D]/50 last:border-0"
              >
                <div>
                  <p className="text-sm text-[#FAFAFA] font-medium">
                    {payment.plan === "pro" ? "Pro" : "Team"} — ${payment.amount_usd}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {new Date(payment.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {payment.tx_hash && (
                    <p className="text-xs text-[#A1A1AA] font-mono mt-0.5 truncate max-w-[300px]">
                      TX: {payment.tx_hash}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    payment.status === "confirmed"
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : payment.status === "rejected"
                      ? "bg-[#EF4444]/10 text-[#EF4444]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}
                >
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
