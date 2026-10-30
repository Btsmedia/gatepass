import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { verifyTransaction } from './paystack';
import { sendTicketsEmail } from './email';

// Confirms a Paystack payment and issues tickets. Safe to call from both the
// redirect page and the webhook: only the first successful call sends the email.
export async function fulfilByReference(reference: string) {
  const db = supabaseAdmin();
  const { data: order } = await db.from('orders').select('*').eq('paystack_reference', reference).maybeSingle();
  if (!order) return { ok: false, reason: 'no_order' as const };
  if (order.status === 'paid') return { ok: true, order };
  const tx = await verifyTransaction(reference);
  if (tx.status !== 'success') return { ok: false, reason: 'not_paid' as const, order };
  if (tx.reference !== reference || (tx as any).currency !== 'NGN' || tx.amount < order.total_kobo) return { ok: false, reason: 'amount_mismatch' as const, order };
  return issue(order.id, reference);
}

export async function issue(orderId: string, reference: string | null) {
  const db = supabaseAdmin();
  const { data: before } = await db.from('orders').select('status').eq('id', orderId).single();
  const { data: tickets, error } = await db.rpc('fulfil_order', { p_order: orderId, p_reference: reference });
  if (error) return { ok: false, reason: error.message as any };
  const { data: order } = await db.from('orders').select('*, events(*)').eq('id', orderId).single();
  if (before?.status !== 'paid' && order) {
    const { data: types } = await db.from('ticket_types').select('id, name').eq('event_id', order.event_id);
    const name = (id: string) => types?.find((t) => t.id === id)?.name || 'Ticket';
    await sendTicketsEmail(order.buyer_email, order.buyer_name, order.events, (tickets || []).map((t: any) => ({ code: t.code, type: name(t.ticket_type_id) }))).catch(() => {});
  }
  return { ok: true, order };
}
