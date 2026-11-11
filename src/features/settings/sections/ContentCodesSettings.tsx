import { useState } from 'react';
import { ACCOUNT_INPUT, ACCOUNT_PILL, AccountField } from '../ui/accountKit';

/**
 * A content code, in the Account area's look (owner, 2026-11-10): one field
 * and its Confirm pill; no teal. Sending a code isn't built yet (no API), so
 * Confirm only clears the field, as before.
 */
export const ContentCodesSettings = () => {
  const [code, setCode] = useState('');

  const handleConfirm = () => {
    if (!code.trim()) return;
    // Submit code to API (not yet implemented)
    setCode('');
  };

  return (
    <div className="flex flex-col gap-[0.455rem]">
      <AccountField label="Code" htmlFor="content-code">
        <input
          id="content-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="A code from a flyer or an email"
          className={ACCOUNT_INPUT}
        />
        <button
          type="button"
          disabled={!code.trim()}
          className={ACCOUNT_PILL}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </AccountField>
      <p className="text-[0.682rem] leading-[0.909rem] text-white/[0.48]">
        Got a discount code instead? Use it when you upgrade.
      </p>
    </div>
  );
};
