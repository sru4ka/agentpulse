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

    // Immediately try to verify on-chain
    const verifyResult = await verifyTransaction(data.id, tx_hash, plan, email, supabase)

    return NextResponse.json({
      success: true,
      payment_id: data.id,
      verification: verifyResult,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 })
  }
}

// ─── Inline on-chain verification ───

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'
const RECEIVING_WALLET = process.env.ETH_RECEIVING_WALLET || ''
const PLAN_ETH_AMOUNTS: Record<string, number> = {
  pro: 0.060,
  team: 0.150,
}

async function ethRpc(method: string, params: any[]) {
  const res = await fetch(ETH_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  const data = await res.json()
  return data.result || null
}

function weiToEth(hexWei: string): number {
  return Number(BigInt(hexWei)) / 1e18
}

async function verifyTransaction(
  paymentId: string,
  txHash: string,
  plan: string,
  email: string,
  supabase: any
): Promise<{ status: string; message: string }> {
  try {
    const tx = await ethRpc('eth_getTransactionByHash', [txHash])
    if (!tx) {
      return { status: 'pending', message: 'Transaction not found on-chain yet. It will be verified automatically once confirmed.' }
    }

    if (!tx.blockNumber) {
      return { status: 'pending', message: 'Transaction is pending confirmation. Your account will be upgraded automatically once confirmed.' }
    }

    const receipt = await ethRpc('eth_getTransactionReceipt', [txHash])
    if (!receipt || receipt.status !== '0x1') {
      await supabase.from('crypto_payments').update({ status: 'rejected', verified_at: new Date().toISOString() }).eq('id', paymentId)
      return { status: 'rejected', message: 'Transaction failed on-chain.' }
    }

    if (RECEIVING_WALLET && tx.to?.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
      await supabase.from('crypto_payments').update({ status: 'rejected', verified_at: new Date().toISOString() }).eq('id', paymentId)
      return { status: 'rejected', message: 'Transaction was sent to wrong wallet address.' }
    }

    const ethAmount = weiToEth(tx.value)
    const requiredAmount = PLAN_ETH_AMOUNTS[plan]
    if (!requiredAmount || ethAmount < requiredAmount) {
      await supabase.from('crypto_payments').update({ status: 'rejected', verified_at: new Date().toISOString(), amount_eth: String(ethAmount) }).eq('id', paymentId)
      return { status: 'rejected', message: `Insufficient amount. Sent ${ethAmount.toFixed(4)} ETH, required ${requiredAmount} ETH.` }
    }

    // Confirmed — upgrade plan
    await supabase.from('crypto_payments').update({
      status: 'confirmed',
      verified_at: new Date().toISOString(),
      amount_eth: String(ethAmount),
      from_address: tx.from,
    }).eq('id', paymentId)

    await supabase.from('profiles').update({ plan }).eq('email', email)

    try {
      const { sendPaymentConfirmationEmail } = await import('@/lib/email')
      await sendPaymentConfirmationEmail(email, plan, plan === 'pro' ? 199 : 499, txHash)
    } catch {}

    return { status: 'confirmed', message: `Payment confirmed! Your account has been upgraded to ${plan}.` }
  } catch (err: any) {
    console.error('[crypto] Auto-verify error:', err.message)
    return { status: 'pending', message: 'Could not verify immediately. Your payment will be verified automatically within minutes.' }
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
