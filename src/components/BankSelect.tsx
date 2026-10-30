'use client';
import { useState } from 'react';
export default function BankSelect({ banks }: { banks: { name: string; code: string }[] }) {
  const [code, setCode] = useState('');
  return (
    <div className="field">
      <label htmlFor="bank">Bank</label>
      <select id="bank" name="bank_code" required value={code} onChange={(e) => setCode(e.target.value)}>
        <option value="">Choose your bank</option>
        {banks.map((b) => <option key={b.code + b.name} value={b.code}>{b.name}</option>)}
      </select>
      <input type="hidden" name="bank_name" value={banks.find((b) => b.code === code)?.name || ''} />
    </div>
  );
}
