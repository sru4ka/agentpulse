// Email notification service
// Uses nodemailer with SMTP (works with any provider: SendGrid, SES, Mailgun, etc.)
// Set these env vars:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[email] SMTP not configured — skipping email send')
    return false
  }

  try {
    // Use fetch to call a simple SMTP relay, or use the built-in
    // Next.js API route approach. For maximum compatibility without
    // adding nodemailer as a dependency, we use the Resend HTTP API
    // if RESEND_API_KEY is set, otherwise fall back to SMTP via fetch.
    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: SMTP_FROM || 'AgentPulse <alerts@agentpulses.com>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[email] Resend API error:', err)
        return false
      }
      return true
    }

    // Fallback: use SMTP via a POST to our own internal endpoint
    // This requires nodemailer to be installed — for now log and skip
    console.warn('[email] No RESEND_API_KEY set. Email not sent:', options.subject)
    console.log('[email] Would send to:', options.to)
    console.log('[email] Subject:', options.subject)
    return false
  } catch (err) {
    console.error('[email] Failed to send:', err)
    return false
  }
}

export async function sendAlertEmail(
  to: string,
  alertType: string,
  threshold: number,
  currentValue: number,
  agentName?: string
): Promise<boolean> {
  const typeLabels: Record<string, string> = {
    daily_cost_limit: 'Daily Cost Limit',
    consecutive_failures: 'Consecutive Failures',
    rate_limit_threshold: 'Rate Limit Threshold',
  }

  const typeDescriptions: Record<string, string> = {
    daily_cost_limit: `Your daily spend has reached <strong>$${currentValue.toFixed(2)}</strong>, exceeding your $${threshold.toFixed(2)} limit.`,
    consecutive_failures: `There have been <strong>${currentValue}</strong> consecutive failures, exceeding your threshold of ${threshold}.`,
    rate_limit_threshold: `There have been <strong>${currentValue}</strong> rate-limited requests this hour, exceeding your threshold of ${threshold}.`,
  }

  const subject = `[AgentPulse] Alert: ${typeLabels[alertType] || alertType} exceeded${agentName ? ` — ${agentName}` : ''}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #141415; border: 1px solid #2A2A2D; border-radius: 12px; padding: 24px; color: #FAFAFA;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #EF4444;">
          Alert Triggered: ${typeLabels[alertType] || alertType}
        </h2>
        ${agentName ? `<p style="color: #A1A1AA; font-size: 14px; margin: 0 0 12px;">Agent: <strong style="color: #FAFAFA;">${agentName}</strong></p>` : ''}
        <p style="color: #A1A1AA; font-size: 14px; margin: 0 0 16px;">
          ${typeDescriptions[alertType] || `Current value (${currentValue}) exceeded threshold (${threshold}).`}
        </p>
        <a href="https://agentpulses.com/dashboard/alerts"
           style="display: inline-block; background: #7C3AED; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          View Dashboard
        </a>
      </div>
      <p style="color: #71717A; font-size: 12px; text-align: center; margin-top: 16px;">
        You're receiving this because you set up an alert on AgentPulse.
      </p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

export async function sendPaymentConfirmationEmail(
  to: string,
  plan: string,
  amount: number,
  txHash?: string
): Promise<boolean> {
  const subject = `[AgentPulse] Payment Confirmed — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Activated`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #141415; border: 1px solid #2A2A2D; border-radius: 12px; padding: 24px; color: #FAFAFA;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #10B981;">
          Payment Confirmed
        </h2>
        <p style="color: #A1A1AA; font-size: 14px; margin: 0 0 8px;">
          Your <strong style="color: #FAFAFA;">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan is now active.
        </p>
        <p style="color: #A1A1AA; font-size: 14px; margin: 0 0 16px;">
          Amount: <strong style="color: #FAFAFA;">$${amount}</strong>
        </p>
        ${txHash ? `<p style="color: #71717A; font-size: 12px; word-break: break-all; margin: 0 0 16px;">TX: ${txHash}</p>` : ''}
        <a href="https://agentpulses.com/dashboard"
           style="display: inline-block; background: #7C3AED; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Go to Dashboard
        </a>
      </div>
    </div>
  `

  return sendEmail({ to, subject, html })
}
