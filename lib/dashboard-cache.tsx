"use client";
import { createContext, useContext, useRef, useCallback, useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface CacheEntry {
  data: any;
  ts: number;
}

interface DashboardCacheCtx {
  /** Agents list, shared across all pages. null until first fetch completes. */
  agents: any[] | null;
  /** True once agents have been fetched (even if the list is empty). */
  agentsLoaded: boolean;
  /** Supabase access token (JWT). null until session checked. */
  accessToken: string | null;
  /** Shared Supabase browser client. */
  supabase: ReturnType<typeof createBrowserSupabaseClient>;
  /** Get cached data by key. Returns null if missing or expired (>5 min). */
  get: (key: string) => any | null;
  /** Store data in cache by key. */
  set: (key: string, data: any) => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const Ctx = createContext<DashboardCacheCtx>(null!);

export function useDashboardCache() {
  return useContext(Ctx);
}

export function DashboardCacheProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const [agents, setAgents] = useState<any[] | null>(null);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const supabaseRef = useRef(createBrowserSupabaseClient());
  const supabase = supabaseRef.current;

  // Fetch agents + session once for the entire dashboard lifetime
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setAccessToken(session.access_token);

      const { data: agentsData } = await supabase
        .from("agents")
        .select("*")
        .order("last_seen", { ascending: false });

      setAgents(agentsData || []);
      setAgentsLoaded(true);
    };
    init();
  }, []);

  const get = useCallback((key: string) => {
    const entry = cache.current.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      cache.current.delete(key);
      return null;
    }
    return entry.data;
  }, []);

  const set = useCallback((key: string, data: any) => {
    cache.current.set(key, { data, ts: Date.now() });
  }, []);

  return (
    <Ctx.Provider value={{ agents, agentsLoaded, accessToken, supabase, get, set }}>
      {children}
    </Ctx.Provider>
  );
}
