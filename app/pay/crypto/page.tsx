"use client";
import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "pro",
    name: "Pro Lifetime",
    price: "$99",
    ethPrice: "~0.033 ETH",
    features: ["5 agents", "90 days history", "Smart alerts", "Recommendations", "CSV export"],
  },
  {
    id: "team",
    name: "Team Lifetime",
    price: "$249",
    ethPrice: "~0.08 ETH",
    features: ["25 agents", "1 year history", "Team dashboard", "API access", "Webhooks", "Priority support"],
  },
];

const ETH_WALLET = "0xbbDAa7984E505aBBc822E896dD0D8e0F981A3547";

export default function CryptoPaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [txHash, setTxHash] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  const copyWallet = () => {
    navigator.clipboard.writeText(ETH_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!txHash || !email) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          tx_hash: txHash,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A2D] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[#FAFAFA] font-bold text-xl">AgentPulse</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/#pricing" className="text-[#A1A1AA] hover:text-[#FAFAFA] transition">Pricing</Link>
            <Link href="/dashboard" className="text-[#A1A1AA] hover:text-[#FAFAFA] transition">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm px-4 py-1.5 rounded-full mb-6">
            Pay with Crypto
          </div>
          <h1 className="text-3xl font-bold text-[#FAFAFA] mb-3">Lifetime Access with ETH</h1>
          <p className="text-[#A1A1AA]">One-time payment. No subscriptions. Pay with Ethereum.</p>
        </div>

        {!submitted ? (
          <div className="space-y-8">
            {/* Plan selection */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-3">Select Plan</label>
              <div className="grid grid-cols-2 gap-4">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`text-left p-5 rounded-xl border transition ${
                      selectedPlan === p.id
                        ? "bg-[#7C3AED]/10 border-[#7C3AED]"
                        : "bg-[#141415] border-[#2A2A2D] hover:border-[#3A3A3D]"
                    }`}
                  >
                    <h3 className="text-[#FAFAFA] font-semibold mb-1">{p.name}</h3>
                    <p className="text-2xl font-bold text-[#FAFAFA]">{p.price}</p>
                    <p className="text-sm text-[#7C3AED] mt-1">{p.ethPrice}</p>
                    <ul className="mt-3 space-y-1">
                      {p.features.slice(0, 3).map((f) => (
                        <li key={f} className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
                          <span className="text-[#10B981]">&#10003;</span> {f}
                        </li>
                      ))}
                      {p.features.length > 3 && (
                        <li className="text-xs text-[#A1A1AA]">+{p.features.length - 3} more</li>
                      )}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet address */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-1">Send {plan.ethPrice} to this ETH address:</h3>
              <p className="text-xs text-[#A1A1AA] mb-4">Ethereum Mainnet only. Make sure you send the exact amount for your selected plan.</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-3 text-sm text-[#F59E0B] font-mono break-all">
                  {ETH_WALLET}
                </code>
                <button
                  onClick={copyWallet}
                  className="text-sm text-[#7C3AED] hover:text-[#8B5CF6] transition px-3 py-2 border border-[#2A2A2D] rounded-lg whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-4 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg p-3">
                <p className="text-xs text-[#F59E0B]">
                  Important: Send only ETH on Ethereum Mainnet. Do not send tokens on other networks. Transactions are irreversible.
                </p>
              </div>
            </div>

            {/* Verification form */}
            <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-1">After sending, submit your details:</h3>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Your AgentPulse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED] placeholder-[#555]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Transaction Hash</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg px-4 py-2.5 text-sm text-[#FAFAFA] font-mono focus:outline-none focus:border-[#7C3AED] placeholder-[#555]"
                />
              </div>
              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3">
                  <p className="text-sm text-[#EF4444]">{error}</p>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!txHash || !email || submitting}
                className="w-full bg-[#7C3AED] hover:bg-[#8B5CF6] text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit for Verification"}
              </button>
              <p className="text-xs text-[#A1A1AA] text-center">
                Your account will be upgraded within 24 hours after transaction confirmation.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">Payment Submitted!</h2>
            <p className="text-[#A1A1AA] mb-2">
              We&apos;ve received your transaction details for the <strong className="text-[#FAFAFA]">{plan.name}</strong> plan.
            </p>
            <p className="text-sm text-[#A1A1AA] mb-6">
              Your account ({email}) will be upgraded within 24 hours after we confirm the transaction on-chain.
            </p>
            <div className="bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-3 text-sm text-[#A1A1AA] font-mono break-all mb-6">
              TX: {txHash}
            </div>
            <Link
              href="/dashboard"
              className="inline-block bg-[#7C3AED] hover:bg-[#8B5CF6] text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
