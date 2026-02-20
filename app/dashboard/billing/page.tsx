"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useDashboardCache } from "@/lib/dashboard-cache";

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

const CACHE_KEY = "billing";

export default function BillingPage() {
  const { supabase, get, set } = useDashboardCache();

  const cached = get(CACHE_KEY);
  const [plan, setPlan] = useState(cached?.plan || "free");
  const [payments, setPayments] = useState<any[]>(cached?.payments || []);
  const [loading, setLoading] = useState(!cached);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const fetchDone = useRef(!!cached);

  // Read success/canceled from URL on mount (avoid useSearchParams to prevent SSR bailout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsSuccess(params.get("success") === "true");
    setIsCanceled(params.get("canceled") === "true");
  }, []);

  useEffect(() => {
    if (fetchDone.current) return;
    fetchDone.current = true;

    const fetchBilling = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserEmail(session.user?.email || "");
      const res = await fetch("/api/payments", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan || "free");
        setPayments(data.payments || []);
        set(CACHE_KEY, { plan: data.plan || "free", payments: data.payments || [] });
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

      {isSuccess && (
        <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#10B981]">Payment successful!</p>
            <p className="text-xs text-[#A1A1AA]">Your 7-day free trial has started. You won&apos;t be charged until the trial ends.</p>
          </div>
        </div>
      )}

      {isCanceled && (
        <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#F59E0B" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-[#F59E0B]">Checkout was canceled. You can try again anytime.</p>
        </div>
      )}

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

          <div className="text-center">
            <div className="w-14 h-14 bg-[#F59E0B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
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
        </div>
      )}

      {/* Payment Method on File */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Payment Method</h3>
        {plan === "free" ? (
          <p className="text-sm text-[#A1A1AA]">No payment method on file. Upgrade to add one.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center text-[#F59E0B]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#FAFAFA] font-medium">Paid via crypto</p>
              <p className="text-xs text-[#A1A1AA]">Lifetime access — ETH payment</p>
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
