import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendPaymentConfirmationEmail } from '@/lib/email'

// POST /api/payments/crypto/verify
// Verifies an Ethereum transaction on-chain via a public RPC and upgrades the user's plan.
// Can be called by a cron job or manually after payment submission.

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'

// Expected receiving wallet address (set in env)
const RECEIVING_WALLET = process.env.ETH_RECEIVING_WALLET || ''

// Minimum ETH amounts per plan (with 5% tolerance for gas fluctuations)
const PLAN_ETH_AMOUNTS: Record<string, number> = {
  pro: 0.060,   // ~$199 at ~$3300/ETH, with tolerance
  team: 0.150,  // ~$499 at ~$3300/ETH, with tolerance
}

interface EthTransaction {
  hash: string
  from: string
  to: string
  value: string // hex wei
  blockNumber: string | null
}

async function getTransaction(txHash: string): Promise<EthTransaction | null> {
  try {
    const res = await fetch(ETH_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await res.json()
    return data.result || null
  } catch (err) {
    console.error('[crypto] RPC error:', err)
    return null
  }
}

async function getTransactionReceipt(txHash: string): Promise<any | null> {
  try {
    const res = await fetch(ETH_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    })

    const data = await res.json()
    return data.result || null
  } catch (err) {
    console.error('[crypto] RPC receipt error:', err)
    return null
  }
}

function weiToEth(hexWei: string): number {
  const wei = BigInt(hexWei)
  // 1 ETH = 10^18 wei
  return Number(wei) / 1e18
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()

    const body = await request.json().catch(() => ({}))
    const { payment_id, tx_hash } = body

    // Can verify a specific payment or process all pending
    let paymentsToCheck: any[] = []

    if (payment_id || tx_hash) {
      let query = supabase.from('crypto_payments').select('*')
      if (payment_id) query = query.eq('id', payment_id)
      if (tx_hash) query = query.eq('tx_hash', tx_hash)
      const { data } = await query.eq('status', 'pending')
      paymentsToCheck = data || []
    } else {
      // Process all pending payments
      const { data } = await supabase
        .from('crypto_payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50)
      paymentsToCheck = data || []
    }

    if (paymentsToCheck.length === 0) {
      return NextResponse.json({ checked: 0, confirmed: 0, rejected: 0 })
    }

    let confirmed = 0
    let rejected = 0

    for (const payment of paymentsToCheck) {
      // Fetch transaction from Ethereum
      const tx = await getTransaction(payment.tx_hash)

      if (!tx) {
        // Transaction not found — might be too new, skip for now
        continue
      }

      if (!tx.blockNumber) {
        // Transaction is still pending (not mined), skip
        continue
      }

      // Check receipt for success
      const receipt = await getTransactionReceipt(payment.tx_hash)
      if (!receipt || receipt.status !== '0x1') {
        // Transaction failed on-chain
        await supabase
          .from('crypto_payments')
          .update({ status: 'rejected', verified_at: new Date().toISOString() })
          .eq('id', payment.id)
        rejected++
        continue
      }

      // Verify recipient matches our wallet (if configured)
      if (RECEIVING_WALLET) {
        if (tx.to?.toLowerCase() !== RECEIVING_WALLET.toLowerCase()) {
          await supabase
            .from('crypto_payments')
            .update({ status: 'rejected', verified_at: new Date().toISOString() })
            .eq('id', payment.id)
          rejected++
          continue
        }
      }

      // Verify amount
      const ethAmount = weiToEth(tx.value)
      const requiredAmount = PLAN_ETH_AMOUNTS[payment.plan]

      if (!requiredAmount || ethAmount < requiredAmount) {
        await supabase
          .from('crypto_payments')
          .update({
            status: 'rejected',
            verified_at: new Date().toISOString(),
            amount_eth: String(ethAmount),
          })
          .eq('id', payment.id)
        rejected++
        continue
      }

      // Transaction is valid — confirm payment and upgrade plan
      await supabase
        .from('crypto_payments')
        .update({
          status: 'confirmed',
          verified_at: new Date().toISOString(),
          amount_eth: String(ethAmount),
          from_address: tx.from,
        })
        .eq('id', payment.id)

      // Upgrade user's plan
      const { error: upgradeError } = await supabase
        .from('profiles')
        .update({ plan: payment.plan })
        .eq('email', payment.email)

      if (upgradeError) {
        console.error('[crypto] Failed to upgrade plan:', upgradeError.message)
      } else {
        // Send confirmation email
        await sendPaymentConfirmationEmail(
          payment.email,
          payment.plan,
          payment.amount_usd || 0,
          payment.tx_hash
        )
        console.log(`[crypto] Confirmed ${payment.tx_hash} — upgraded ${payment.email} to ${payment.plan}`)
      }

      confirmed++
    }

    return NextResponse.json({
      checked: paymentsToCheck.length,
      confirmed,
      rejected,
    })
  } catch (err: any) {
    console.error('[crypto/verify] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
