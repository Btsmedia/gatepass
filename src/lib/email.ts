import 'server-only';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { fmtDay, fmtTime } from './money';

const site = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function client() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendTicketsEmail(to: string, name: string, event: any, tickets: { code: string; type: string }[]) {
  const r = client(); if (!r) return;
  const attachments = await Promise.all(tickets.map(async (t) => ({
    filename: `${t.code}.png`,
    content: (await QRCode.toBuffer(t.code, { width: 480, margin: 2 })).toString('base64'),
  })));
  const list = tickets.map((t) => `<li><b>${esc(t.type)}</b> · <a href="${site()}/t/${t.code}">${t.code}</a></li>`).join('');
  await r.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Your tickets: ${event.title}`,
    html: `<p>Hi ${esc(name.split(' ')[0])},</p><p>You're going to <b>${esc(event.title)}</b> on ${fmtDay(event.starts_at)}, doors ${fmtTime(event.starts_at)} at ${esc(event.venue)}.</p>
      <ul>${list}</ul><p>Open a ticket link at the door, or show the attached QR code. Each code works once.</p>`,
    attachments,
  });
}

export async function sendInviteEmail(to: string, invite: any, event: any, priceLabel: string) {
  const r = client(); if (!r) return;
  await r.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `${invite.from_name} invited you to ${event.title}`,
    html: `<p>${esc(invite.from_name)} invited you to <b>${esc(event.title)}</b> on ${fmtDay(event.starts_at)} at ${esc(event.venue)}.</p>
      ${invite.note ? `<blockquote>${esc(invite.note)}</blockquote>` : ''}
      <p>You only pay (${esc(priceLabel)}) if you accept.</p>
      <p><a href="${site()}/invite/${invite.id}">Accept or decline</a></p>`,
  });
}
