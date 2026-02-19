"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Sidebar from "@/components/dashboard/sidebar";
import { DashboardCacheProvider } from "@/lib/dashboard-cache";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Show verified toast when arriving from email verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      setShowVerifiedToast(true);
      // Clean up the URL param
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-dismiss after 5s
      const t = setTimeout(() => setShowVerifiedToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-pulse text-[#7C3AED] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardCacheProvider>
      <div className="min-h-screen bg-[#0A0A0B] flex">
        <Sidebar user={user} />
        <main className="flex-1 lg:ml-60 p-4 pt-16 lg:pt-8 lg:p-8">
          {children}
        </main>
      </div>

      {/* Email verified toast */}
      {showVerifiedToast && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 bg-[#141415] border border-[#10B981]/30 rounded-xl px-5 py-3.5 shadow-lg shadow-black/30">
            <div className="w-8 h-8 rounded-full bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5L6.5 12L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">Email verified!</p>
              <p className="text-xs text-[#A1A1AA]">Your account is confirmed. Welcome to AgentPulse.</p>
            </div>
            <button
              onClick={() => setShowVerifiedToast(false)}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors ml-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </DashboardCacheProvider>
  );
}
