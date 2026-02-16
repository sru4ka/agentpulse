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
    name: "Pro Lifetime",
    color: "#7C3AED",
    features: ["5 agents", "90 days history", "Smart alerts", "Recommendations", "CSV export"],
  },
  team: {
    name: "Team Lifetime",
    color: "#F59E0B",
    features: ["25 agents", "1 year history", "Team dashboard", "API access", "Webhooks", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    color: "#10B981",
    features: ["Unlimited agents", "Unlimited history", "All features", "Dedicated support", "Custom integrations"],
  },
};

export default function BillingPage() {
  const [plan, setPlan] = useState("free");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
            <Link
              href="/pay/crypto"
              className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#A1A1AA] mb-3">
              {plan === "pro" || plan === "team"
                ? "Lifetime access. No recurring charges."
                : "Full enterprise access with all features."}
            </p>
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

      {/* Payment Method */}
      <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-4">Payment Method</h3>
        {plan === "free" ? (
          <p className="text-sm text-[#A1A1AA]">No payment method on file. Upgrade to add one.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#FAFAFA] font-medium">Ethereum (ETH)</p>
              <p className="text-xs text-[#A1A1AA]">One-time crypto payment - Lifetime access</p>
            </div>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-[#2A2A2D]">
          <p className="text-xs text-[#A1A1AA]">
            Stripe payments coming soon. Currently only crypto (ETH) payments are available.
          </p>
        </div>
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
                    {payment.plan === "pro" ? "Pro Lifetime" : "Team Lifetime"} — ${payment.amount_usd}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {new Date(payment.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-[#A1A1AA] font-mono mt-0.5 truncate max-w-[300px]">
                    TX: {payment.tx_hash}
                  </p>
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

      {/* Upgrade CTA for free users */}
      {plan === "free" && (
        <div className="bg-gradient-to-r from-[#7C3AED]/10 to-[#F59E0B]/10 border border-[#2A2A2D] rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">Ready to upgrade?</h3>
          <p className="text-sm text-[#A1A1AA] mb-4">
            Get lifetime access with a one-time crypto payment. No subscriptions.
          </p>
          <Link
            href="/pay/crypto"
            className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  );
}
