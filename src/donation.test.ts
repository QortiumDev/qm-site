import { describe, expect, it } from 'vitest';
import {
  SUPPORT_DONATIONS,
  atomicFeePerByteToCoinString,
  getDefaultFeeAtomsPerByte,
  truncateDonationAddress,
  validateDonationAmount,
  validateDonationFeeAtomsPerByte,
} from './donation';

describe('support donation configuration', () => {
  it('lists the requested support coins in order', () => {
    expect(SUPPORT_DONATIONS.map((donation) => donation.coin)).toEqual([
      'BTC',
      'LTC',
      'DOGE',
      'DGB',
      'RVN',
      'DASH',
      'NMC',
      'FIRO',
    ]);
  });

  it('uses the requested support addresses', () => {
    expect(SUPPORT_DONATIONS).toMatchObject([
      { address: '1NxmYAMYbXUmZixWLnFg2Pq4k2hoKkPg5V', coin: 'BTC' },
      { address: 'LP5aH6vqJq13nbRKXyfVDrsPLdtw7saHki', coin: 'LTC' },
      { address: 'DNX9uBhZiHDrYm1M9DaEiVkDK2sfDJBo2B', coin: 'DOGE' },
      { address: 'DHNkBzyydv1UNUSS3KwKEdQKrFP1eZt9Go', coin: 'DGB' },
      { address: 'RFNfhkMQNYWQyPoZ2N67TcSfv4ArXQ8yEF', coin: 'RVN' },
      { address: 'Xk3LSCDp4EXAVkLtdYGKd63Zmjn6zT7M7a', coin: 'DASH' },
      { address: 'NJGFddaYPmRzotQ8NNFc1v8xfozFseEZuY', coin: 'NMC' },
      { address: 'aNoM4oDed75jQJ2sL8wVqSKSSj7M7QJtmr', coin: 'FIRO' },
    ]);
  });

  it('does not include the old QORT donation address', () => {
    expect(JSON.stringify(SUPPORT_DONATIONS)).not.toContain('QT4zHex8JEULmBhYmKd5UhpiNA46T5wUko');
    expect(SUPPORT_DONATIONS.some((donation) => String(donation.coin) === 'QORT')).toBe(false);
  });

  it('truncates long addresses for compact cards', () => {
    expect(truncateDonationAddress('1NxmYAMYbXUmZixWLnFg2Pq4k2hoKkPg5V')).toBe('1NxmYA...KkPg5V');
    expect(truncateDonationAddress('short')).toBe('short');
  });

  it('keeps expected default fee rates in atomic units per byte', () => {
    expect(getDefaultFeeAtomsPerByte('BTC')).toBe(100);
    expect(getDefaultFeeAtomsPerByte('LTC')).toBe(30);
    expect(getDefaultFeeAtomsPerByte('DOGE')).toBe(1000);
    expect(getDefaultFeeAtomsPerByte('DGB')).toBe(10);
    expect(getDefaultFeeAtomsPerByte('RVN')).toBe(1500);
    expect(getDefaultFeeAtomsPerByte('DASH')).toBe(10);
    expect(getDefaultFeeAtomsPerByte('NMC')).toBe(100);
    expect(getDefaultFeeAtomsPerByte('FIRO')).toBe(10);
  });

  it('validates send amounts and converts atomic fee rates for Home SEND_COIN', () => {
    expect(validateDonationAmount('1.25')).toEqual({ amount: '1.25', ok: true });
    expect(validateDonationAmount('')).toMatchObject({ ok: false });
    expect(validateDonationAmount('0')).toMatchObject({ ok: false });
    expect(validateDonationAmount('-1')).toMatchObject({ ok: false });

    expect(atomicFeePerByteToCoinString(100)).toBe('0.00000100');
    expect(validateDonationFeeAtomsPerByte('100')).toEqual({ feePerByte: '0.00000100', ok: true });
    expect(validateDonationFeeAtomsPerByte('')).toEqual({ feePerByte: undefined, ok: true });
    expect(validateDonationFeeAtomsPerByte('0')).toEqual({ feePerByte: undefined, ok: true });
    expect(validateDonationFeeAtomsPerByte('-1')).toMatchObject({ ok: false });
    expect(validateDonationFeeAtomsPerByte('abc')).toMatchObject({ ok: false });
  });
});
