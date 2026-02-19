import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendPaymentConfirmationEmail } from '@/lib/email'

// Stripe webhook handler
// Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in env

export async function POST(request: Request) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature using Stripe's algorithm
    // We implement verification manually to avoid importing the full stripe package
    const event = await verifyAndParseWebhook(body, sig, STRIPE_WEBHOOK_SECRET)

    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerEmail = session.customer_email || session.customer_details?.email
        // Payment Links won't have metadata.plan — default to "pro"
        const plan = session.metadata?.plan || 'pro'

        if (!customerEmail) {
          console.error('[stripe] Missing email in session:', session.id)
          break
        }

        // Upgrade user's plan
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .update({ plan })
          .eq('email', customerEmail)
          .select('id, email')
          .single()

        if (profileError) {
          console.error('[stripe] Failed to update plan:', profileError.message)
          break
        }

        // Send confirmation email
        const amount = (session.amount_total || 0) / 100
        await sendPaymentConfirmationEmail(customerEmail, plan, amount)

        console.log(`[stripe] Upgraded ${customerEmail} to ${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status

        // If subscription is cancelled or past_due, downgrade
        if (status === 'canceled' || status === 'unpaid') {
          const customerId = subscription.customer

          // Look up customer email via Stripe API
          const customerRes = await fetch(
            `https://api.stripe.com/v1/customers/${customerId}`,
            {
              headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
            }
          )
          const customer = await customerRes.json()

          if (customer.email) {
            await supabase
              .from('profiles')
              .update({ plan: 'free' })
              .eq('email', customer.email)

            console.log(`[stripe] Downgraded ${customer.email} to free (${status})`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        const customerRes = await fetch(
          `https://api.stripe.com/v1/customers/${customerId}`,
          {
            headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
          }
        )
        const customer = await customerRes.json()

        if (customer.email) {
          await supabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('email', customer.email)

          console.log(`[stripe] Cancelled ${customer.email} — downgraded to free`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerEmail = invoice.customer_email
        if (customerEmail) {
          console.warn(`[stripe] Payment failed for ${customerEmail}`)
        }
        break
      }

      default:
        // Unhandled event type
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[stripe webhook] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Verify Stripe webhook signature without the stripe npm package
async function verifyAndParseWebhook(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<any | null> {
  try {
    // Parse the signature header
    const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part) => {
      const [key, value] = part.split('=')
      acc[key.trim()] = value
      return acc
    }, {})

    const timestamp = parts['t']
    const signature = parts['v1']

    if (!timestamp || !signature) return null

    // Check timestamp tolerance (5 minutes)
    const timestampMs = parseInt(timestamp) * 1000
    if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return null

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSig !== signature) return null

    return JSON.parse(payload)
  } catch {
    return null
  }
}
