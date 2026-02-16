import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rl = rateLimit(`payments:${ip}`, AUTH_RATE_LIMIT)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { email, tx_hash, plan } = body

    if (!email || !tx_hash || !plan) {
      return NextResponse.json({ error: 'Missing required fields: email, tx_hash, plan' }, { status: 400 })
    }

    if (!['pro', 'team'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Basic tx hash validation (Ethereum tx hashes are 66 chars: 0x + 64 hex)
    if (!/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
      return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Check for duplicate tx_hash
    const { data: existing } = await supabase
      .from('crypto_payments')
      .select('id')
      .eq('tx_hash', tx_hash)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This transaction has already been submitted' }, { status: 409 })
    }

    // Insert payment record
    const { data, error } = await supabase
      .from('crypto_payments')
      .insert({
        email,
        tx_hash,
        plan,
        amount_eth: plan === 'pro' ? '0.065' : '0.16',
        amount_usd: plan === 'pro' ? 199 : 499,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save payment', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, payment_id: data.id })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

// GET: Fetch payments for authenticated user (for billing page)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Get profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, plan')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get payments for this email
    const { data: payments } = await supabase
      .from('crypto_payments')
      .select('*')
      .eq('email', profile.email)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      plan: profile.plan || 'free',
      payments: payments || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}
