import { describe, expect, it } from 'vitest';
import {
  QORT_DONATION,
  SUPPORT_DONATIONS,
  atomicFeePerByteToCoinString,
  atomicToCoinString,
  coinStringToAtoms,
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

  it('keeps QORT out of the sendable donation list', () => {
    expect(JSON.stringify(SUPPORT_DONATIONS)).not.toContain(QORT_DONATION.address);
    expect(SUPPORT_DONATIONS.some((donation) => String(donation.coin) === 'QORT')).toBe(false);
  });

  it('exposes the QORT address as display-only (reintroduced 2026-07-25 by owner request)', () => {
    expect(QORT_DONATION.address).toBe('QT4zHex8JEULmBhYmKd5UhpiNA46T5wUko');
    expect(QORT_DONATION.coin).toBe('QORT');
    expect(QORT_DONATION.label).toBe('Qortal mainnet');
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
    expect(validateDonationAmount('1.123456789')).toEqual({
      error: 'Use at most 8 decimal places.',
      ok: false,
    });
    expect(validateDonationAmount('1.00000001', 100_000_000n)).toEqual({
      error: 'Amount exceeds the available balance.',
      ok: false,
    });

    expect(atomicFeePerByteToCoinString(100)).toBe('0.00000100');
    expect(validateDonationFeeAtomsPerByte('100')).toEqual({ feePerByte: '0.00000100', ok: true });
    expect(validateDonationFeeAtomsPerByte('')).toEqual({ feePerByte: undefined, ok: true });
    expect(validateDonationFeeAtomsPerByte('0')).toEqual({ feePerByte: undefined, ok: true });
    expect(validateDonationFeeAtomsPerByte('-1')).toMatchObject({ ok: false });
    expect(validateDonationFeeAtomsPerByte('1.5')).toEqual({
      error: 'Fee rate must be a whole number of atomic units per byte.',
      ok: false,
    });
    expect(validateDonationFeeAtomsPerByte('1000001')).toEqual({
      error: 'Fee rate is unreasonably high.',
      ok: false,
    });
    expect(validateDonationFeeAtomsPerByte('abc')).toMatchObject({ ok: false });
  });

  it('converts between atomic units and decimal coin strings', () => {
    expect(atomicToCoinString('100002')).toBe('0.00100002');
    expect(atomicToCoinString(100_000_000n)).toBe('1');
    expect(atomicToCoinString(123_450_000n)).toBe('1.2345');

    expect(coinStringToAtoms('0.00100002')).toBe(100002n);
    expect(coinStringToAtoms('1')).toBe(100_000_000n);
    expect(coinStringToAtoms('1.2345')).toBe(123_450_000n);
    expect(coinStringToAtoms(atomicToCoinString('100002'))).toBe(100002n);
    expect(coinStringToAtoms('1.123456789')).toBeNull();
    expect(coinStringToAtoms('abc')).toBeNull();
  });
});
