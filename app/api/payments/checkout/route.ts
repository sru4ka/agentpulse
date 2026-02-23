import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/payments/checkout — Create a Stripe Checkout Session
// Returns a URL to redirect the user to Stripe's hosted checkout page.

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  pro_monthly: { amount: 1450, name: 'AgentPulse Pro (Monthly)' },
  team_monthly: { amount: 4950, name: 'AgentPulse Team (Monthly)' },
}

export async function POST(request: Request) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.' },
        { status: 503 }
      )
    }

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id } = body

    const planConfig = PLAN_PRICES[plan_id]
    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Extract the plan tier (pro/team) from plan_id
    const planTier = plan_id.split('_')[0]

    // Create Stripe Checkout Session via the API
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('success_url', `${process.env.NEXT_PUBLIC_APP_URL || 'https://agentpulses.com'}/dashboard/billing?success=true`)
    params.append('cancel_url', `${process.env.NEXT_PUBLIC_APP_URL || 'https://agentpulses.com'}/dashboard/billing?canceled=true`)
    params.append('customer_email', user.email || '')
    params.append('metadata[plan]', planTier)
    params.append('metadata[user_id]', user.id)
    params.append('line_items[0][price_data][currency]', 'usd')
    params.append('line_items[0][price_data][product_data][name]', planConfig.name)
    params.append('line_items[0][price_data][unit_amount]', String(planConfig.amount))
    params.append('line_items[0][price_data][recurring][interval]', 'month')
    params.append('line_items[0][quantity]', '1')

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()

    if (!stripeRes.ok) {
      console.error('[stripe] Checkout session error:', session.error)
      return NextResponse.json(
        { error: session.error?.message || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
