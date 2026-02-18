"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserSupabaseClient();

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGitHubSignup() {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      setError("Failed to get GitHub authorization URL.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] px-4">
      <div className="w-full max-w-md rounded-xl border border-[#2A2A2D] bg-[#141415] p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[#FAFAFA] text-center font-[Inter]">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-[#A1A1AA]">
          Get started with AgentPulse
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
            Check your email to confirm your account.
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#A1A1AA] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[#2A2A2D] bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#A1A1AA] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#2A2A2D] bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-[#A1A1AA] mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#2A2A2D] bg-[#0A0A0B] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#141415] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2A2A2D]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#141415] px-2 text-[#A1A1AA]">or</span>
          </div>
        </div>

        <button
          onClick={handleGitHubSignup}
          className="mt-6 w-full rounded-lg border border-[#2A2A2D] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#FAFAFA] hover:bg-[#2A2A2D]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#141415] transition-colors"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign up with GitHub
          </span>
        </button>

        <p className="mt-6 text-center text-sm text-[#A1A1AA]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
