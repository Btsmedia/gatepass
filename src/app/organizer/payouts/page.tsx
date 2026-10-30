import { requireUser, getOrganizer } from '@/lib/auth';
import { listBanks } from '@/lib/paystack';
import { saveBank } from '../actions';
import BankSelect from '@/components/BankSelect';

export const dynamic = 'force-dynamic';

// Only messages the app itself sends are shown, so a crafted link can't put other text on this page.
const PAYOUT_ERRORS = ['Too many attempts. Try again in an hour.', 'Choose your bank.', 'Account numbers are 10 digits.', 'We couldn’t verify that account. Check the bank and number.'];

export default async function Payouts(props: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser('/organizer/payouts');
  const org = await getOrganizer(user.id);
  const banks = await listBanks().catch(() => []);
  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 640 }}>
      <h1 style={{ fontSize: 40 }}>Payouts</h1>
      <p className="muted">Paystack splits every payment: your ticket price goes straight to your bank account (usually the next business day) and the booking fee stays with Gatepass.</p>
      {org?.paystack_subaccount_code && <div className="panel"><p className="eyebrow">Paid to</p><p style={{ fontSize: 18 }}><b>{org.bank_name} ••{org.account_last4}</b> · {org.account_name}</p></div>}
      {searchParams.saved && <div className="notice" style={{ background: 'var(--good-soft)' }}>Bank account verified and saved.</div>}
      {searchParams.error && PAYOUT_ERRORS.includes(searchParams.error) && <div className="notice" role="alert" style={{ background: 'var(--bad-soft)' }}>{searchParams.error}</div>}
      {!org ? <div className="panel"><p>Create your first event to set up payouts.</p></div> : (
        <form action={saveBank} className="panel stack">
          <h2 style={{ fontSize: 20 }}>{org.paystack_subaccount_code ? 'Change bank account' : 'Add your bank account'}</h2>
          <BankSelect banks={banks} />
          <div className="field"><label htmlFor="acct">Account number</label><input id="acct" name="account_number" inputMode="numeric" maxLength={10} required /></div>
          <p className="muted" style={{ fontSize: 13 }}>We check the account name with your bank before saving.</p>
          <button className="btn primary">Verify and save</button>
        </form>
      )}
    </div>
  );
}
