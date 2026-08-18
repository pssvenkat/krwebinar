/**
 * Email Templates — Phase 6
 *
 * All HTML is inline-styled for maximum email client compatibility.
 * Each template returns { subject, html, text } so the caller
 * can send both parts (html + plain-text fallback).
 */

export interface EmailPayload {
  subject: string
  html: string
  text: string
}

// ── Shared helpers ────────────────────────────────────────────────

/** Format "2025-09-01" + "10:00" + "Asia/Kolkata" → human string */
function formatDateTime(date: string, time: string, tz: string): string {
  try {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, min] = time.split(':').map(Number)
    const d = new Date(Date.UTC(year, month - 1, day, hour - 5, min - 30)) // approx IST offset
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: tz,
    }).format(d)
  } catch {
    return `${date} at ${time} (${tz})`
  }
}

/** Wrap content in the standard email shell */
function layout(brandName: string, content: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr><td style="background:#4f46e5;padding:28px 32px;">
          <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">🌱 ${brandName}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            You received this email because you registered for a webinar on <strong>${brandName}</strong>.
            ${unsubscribeUrl ? `<br/>Don't want future emails? <a href="${unsubscribeUrl}" style="color:#4f46e5;">Unsubscribe here</a>.` : ''}
            <br/>This is an automated message — please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">${label}</a>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.02em;">${text}</h1>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#374151;">${text}</p>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>`
}

function infoBox(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#6b7280;font-weight:500;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${value}</td>
  </tr>`
}

// ── 1. Registration Confirmation ──────────────────────────────────

export interface ConfirmationData {
  attendeeName: string
  webinarTitle: string
  webinarDate: string
  webinarTime: string
  webinarTimezone: string
  hostName: string
  attendUrl: string
  unsubscribeUrl: string
  brandName: string
}

export function buildConfirmationEmail(d: ConfirmationData): EmailPayload {
  const datetime = formatDateTime(d.webinarDate, d.webinarTime, d.webinarTimezone)

  const content = `
    ${h1(`You're registered! 🎉`)}
    ${p(`Hi ${d.attendeeName}, your spot for <strong>${d.webinarTitle}</strong> is confirmed.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      ${infoBox('📅 Date & Time', datetime)}
      ${infoBox('🎙️ Host', d.hostName)}
    </table>
    ${p('Keep your unique attend link handy — you\'ll need it to join:')}
    ${btn('Join the Webinar', d.attendUrl)}
    ${divider()}
    ${p('<small>This link is personal to you. Do not share it — it controls your attendance record.</small>')}
  `

  const text = `
Hi ${d.attendeeName},

You're registered for "${d.webinarTitle}"!

Date & Time: ${datetime}
Host: ${d.hostName}
Your attend link: ${d.attendUrl}

See you there!
— ${d.brandName}

Unsubscribe: ${d.unsubscribeUrl}
  `.trim()

  return {
    subject: `You're registered: ${d.webinarTitle}`,
    html: layout(d.brandName, content, d.unsubscribeUrl),
    text,
  }
}

// ── 2. Going-Live Notification ────────────────────────────────────

export interface LiveNotificationData {
  attendeeName: string
  webinarTitle: string
  attendUrl: string
  unsubscribeUrl: string
  brandName: string
}

export function buildLiveNotificationEmail(d: LiveNotificationData): EmailPayload {
  const content = `
    ${h1('🔴 Your webinar is LIVE!')}
    ${p(`Hi ${d.attendeeName}, <strong>${d.webinarTitle}</strong> is happening right now.`)}
    ${p('Click below to join — your host is waiting!')}
    ${btn('Join Now →', d.attendUrl)}
  `

  const text = `
Hi ${d.attendeeName},

"${d.webinarTitle}" is LIVE right now!

Join here: ${d.attendUrl}

— ${d.brandName}

Unsubscribe: ${d.unsubscribeUrl}
  `.trim()

  return {
    subject: `🔴 Live Now: ${d.webinarTitle}`,
    html: layout(d.brandName, content, d.unsubscribeUrl),
    text,
  }
}

// ── 3. 30-Minute Reminder ─────────────────────────────────────────

export interface ReminderData {
  attendeeName: string
  webinarTitle: string
  webinarDate: string
  webinarTime: string
  webinarTimezone: string
  attendUrl: string
  unsubscribeUrl: string
  brandName: string
}

export function buildReminderEmail(d: ReminderData): EmailPayload {
  const datetime = formatDateTime(d.webinarDate, d.webinarTime, d.webinarTimezone)

  const content = `
    ${h1('⏰ Starting in 30 minutes!')}
    ${p(`Hi ${d.attendeeName}, <strong>${d.webinarTitle}</strong> starts at ${d.webinarTime} ${d.webinarTimezone} — that\'s in about 30 minutes.`)}
    ${p('Get ready and join using your personal link below:')}
    ${btn('Join the Webinar', d.attendUrl)}
    ${divider()}
    ${p(`<small>Scheduled: ${datetime}</small>`)}
  `

  const text = `
Hi ${d.attendeeName},

Reminder: "${d.webinarTitle}" starts in 30 minutes (${datetime}).

Your attend link: ${d.attendUrl}

— ${d.brandName}

Unsubscribe: ${d.unsubscribeUrl}
  `.trim()

  return {
    subject: `⏰ Starting soon: ${d.webinarTitle} (30 min)`,
    html: layout(d.brandName, content, d.unsubscribeUrl),
    text,
  }
}

// ── 4. Feedback Request ───────────────────────────────────────────

export interface FeedbackRequestData {
  attendeeName: string
  webinarTitle: string
  feedbackUrl: string
  unsubscribeUrl: string
  brandName: string
}

export function buildFeedbackRequestEmail(d: FeedbackRequestData): EmailPayload {
  const content = `
    ${h1('How was the webinar? 🌟')}
    ${p(`Hi ${d.attendeeName}, thanks for attending <strong>${d.webinarTitle}</strong>!`)}
    ${p('We\'d love to hear your thoughts — it only takes 60 seconds.')}
    ${btn('Share Feedback', d.feedbackUrl)}
    ${divider()}
    ${p('<small>Your feedback helps us improve every session.</small>')}
  `

  const text = `
Hi ${d.attendeeName},

Thanks for attending "${d.webinarTitle}"! How was it?

Share your feedback: ${d.feedbackUrl}

— ${d.brandName}

Unsubscribe: ${d.unsubscribeUrl}
  `.trim()

  return {
    subject: `How was "${d.webinarTitle}"? Share your thoughts 🌟`,
    html: layout(d.brandName, content, d.unsubscribeUrl),
    text,
  }
}

// ── 5. Vendor Admin — New Registration Alert ──────────────────────

export interface VendorAlertData {
  adminEmail: string
  attendeeName: string
  attendeeEmail: string
  attendeeCountry: string | null
  webinarTitle: string
  webinarDate: string
  webinarTime: string
  webinarTimezone: string
  totalRegistrations: number
  brandName: string
  adminUrl: string
}

export function buildVendorAlertEmail(d: VendorAlertData): EmailPayload {
  const datetime = formatDateTime(d.webinarDate, d.webinarTime, d.webinarTimezone)

  const content = `
    ${h1('New Registration 🎯')}
    ${p(`<strong>${d.attendeeName}</strong> just registered for <strong>${d.webinarTitle}</strong>.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      ${infoBox('👤 Name', d.attendeeName)}
      ${infoBox('📧 Email', d.attendeeEmail)}
      ${infoBox('🌍 Country', d.attendeeCountry ?? 'Not specified')}
      ${infoBox('📅 Webinar', `${d.webinarTitle} (${datetime})`)}
      ${infoBox('📊 Total Registrations', String(d.totalRegistrations))}
    </table>
    ${btn('View in Admin', d.adminUrl)}
  `

  const text = `
New registration for "${d.webinarTitle}"

Name: ${d.attendeeName}
Email: ${d.attendeeEmail}
Country: ${d.attendeeCountry ?? 'Not specified'}
Total registrations: ${d.totalRegistrations}

View in admin: ${d.adminUrl}
  `.trim()

  return {
    subject: `New registration: ${d.attendeeName} → ${d.webinarTitle}`,
    html: layout(d.brandName, content),
    text,
  }
}
