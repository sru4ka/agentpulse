import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

interface AuthResult {
  userId: string
  plan: string
  agentIds: string[]
}

/**
 * Authenticate a request using either:
 *   1. API key (X-API-Key header or api_key query param)
 *   2. Bearer JWT token (Authorization header)
 *
 * Returns { userId, plan, agentIds } or null if unauthorized.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  const url = new URL(request.url)
  const apiKey = request.headers.get('X-API-Key') || url.searchParams.get('api_key')

  if (apiKey) {
    return authenticateByApiKey(apiKey)
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader) {
    return authenticateByJWT(authHeader.replace('Bearer ', ''))
  }

  return null
}

async function authenticateByApiKey(apiKey: string): Promise<AuthResult | null> {
  const supabase = createServerSupabaseClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, plan')
    .eq('api_key', apiKey)
    .single()

  if (error || !profile) return null

  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', profile.id)

  return {
    userId: profile.id,
    plan: profile.plan || 'free',
    agentIds: (agents || []).map((a: any) => a.id),
  }
}

async function authenticateByJWT(token: string): Promise<AuthResult | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan')
    .eq('id', user.id)
    .single()

  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)

  return {
    userId: user.id,
    plan: profile?.plan || 'free',
    agentIds: (agents || []).map((a: any) => a.id),
  }
}
