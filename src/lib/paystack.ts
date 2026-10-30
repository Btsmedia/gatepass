import 'server-only';
import crypto from 'crypto';

const BASE = 'https://api.paystack.co';
const key = () => {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return k;
};

async function ps<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || json.status === false) throw new Error(json.message || `Paystack error ${res.status}`);
  return json.data as T;
}

// Starts a payment. If the organizer has a subaccount, Paystack splits the money:
// the organizer gets the ticket price, the platform keeps the booking fee (and bears Paystack's fee).
export function initializeTransaction(input: {
  email: string; amountKobo: number; reference: string; callbackUrl: string;
  subaccount?: string | null; platformShareKobo?: number; metadata?: Record<string, unknown>;
}) {
  const body: Record<string, unknown> = {
    email: input.email,
    amount: input.amountKobo,
    reference: input.reference,
    callback_url: input.callbackUrl,
    currency: 'NGN',
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
    metadata: input.metadata,
  };
  if (input.subaccount) {
    body.subaccount = input.subaccount;
    body.transaction_charge = input.platformShareKobo ?? 0; // flat amount the platform keeps
    body.bearer = 'account'; // the platform (main account) pays Paystack's fee
  }
  return ps<{ authorization_url: string; reference: string }>('/transaction/initialize', { method: 'POST', body: JSON.stringify(body) });
}

export const verifyTransaction = (reference: string) =>
  ps<{ status: string; amount: number; reference: string; metadata: any }>(`/transaction/verify/${encodeURIComponent(reference)}`);

export const refundTransaction = (reference: string, amountKobo?: number) =>
  ps('/refund', { method: 'POST', body: JSON.stringify({ transaction: reference, ...(amountKobo ? { amount: amountKobo } : {}) }) });

export const listBanks = () => ps<{ name: string; code: string }[]>('/bank?country=nigeria&perPage=100');

export const resolveAccount = (accountNumber: string, bankCode: string) =>
  ps<{ account_name: string; account_number: string }>(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);

// percentage_charge is the platform's percentage cut of each split; 0 because we use a flat transaction_charge per payment.
export const createSubaccount = (input: { businessName: string; bankCode: string; accountNumber: string }) =>
  ps<{ subaccount_code: string }>('/subaccount', {
    method: 'POST',
    body: JSON.stringify({ business_name: input.businessName, settlement_bank: input.bankCode, account_number: input.accountNumber, percentage_charge: 0 }),
  });

// Webhook signature check: HMAC SHA512 of the raw body with your secret key.
export function validSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const hash = crypto.createHmac('sha512', key()).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature)); } catch { return false; }
}
