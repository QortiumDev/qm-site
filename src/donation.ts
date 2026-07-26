export type DonationCoin = 'BTC' | 'LTC' | 'DOGE' | 'DGB' | 'RVN' | 'DASH' | 'NMC' | 'FIRO';

export type DonationAddress = {
  address: string;
  coin: DonationCoin;
  label: string;
};

export type DonationAmountValidation =
  | {
      amount: string;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export type DonationFeeValidation =
  | {
      feePerByte: string | undefined;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export const DEFAULT_FEE_ATOMS_PER_BYTE: Record<DonationCoin, number> = {
  BTC: 100,
  DASH: 10,
  DGB: 10,
  DOGE: 1000,
  FIRO: 10,
  LTC: 30,
  NMC: 100,
  RVN: 1500,
};

export const SUPPORT_DONATIONS: DonationAddress[] = [
  {
    address: '1NxmYAMYbXUmZixWLnFg2Pq4k2hoKkPg5V',
    coin: 'BTC',
    label: 'Bitcoin',
  },
  {
    address: 'LP5aH6vqJq13nbRKXyfVDrsPLdtw7saHki',
    coin: 'LTC',
    label: 'Litecoin',
  },
  {
    address: 'DNX9uBhZiHDrYm1M9DaEiVkDK2sfDJBo2B',
    coin: 'DOGE',
    label: 'Dogecoin',
  },
  {
    address: 'DHNkBzyydv1UNUSS3KwKEdQKrFP1eZt9Go',
    coin: 'DGB',
    label: 'DigiByte',
  },
  {
    address: 'RFNfhkMQNYWQyPoZ2N67TcSfv4ArXQ8yEF',
    coin: 'RVN',
    label: 'Ravencoin',
  },
  {
    address: 'Xk3LSCDp4EXAVkLtdYGKd63Zmjn6zT7M7a',
    coin: 'DASH',
    label: 'Dash',
  },
  {
    address: 'NJGFddaYPmRzotQ8NNFc1v8xfozFseEZuY',
    coin: 'NMC',
    label: 'Namecoin',
  },
  {
    address: 'aNoM4oDed75jQJ2sL8wVqSKSSj7M7QJtmr',
    coin: 'FIRO',
    label: 'Firo',
  },
];

// Display/copy-only: a Qortal-mainnet address. It must stay out of
// SUPPORT_DONATIONS so the Home SEND_COIN flow (Qortium bridge, fee-per-byte
// UTXO coins) can never target it.
export const QORT_DONATION = {
  address: 'QT4zHex8JEULmBhYmKd5UhpiNA46T5wUko',
  coin: 'QORT',
  label: 'Qortal mainnet',
} as const;

export function truncateDonationAddress(address: string, edge = 6) {
  const safeEdge = Math.max(2, Math.floor(edge));

  if (address.length <= safeEdge * 2 + 3) {
    return address;
  }

  return `${address.slice(0, safeEdge)}...${address.slice(-safeEdge)}`;
}

export function getDefaultFeeAtomsPerByte(coin: DonationCoin) {
  return DEFAULT_FEE_ATOMS_PER_BYTE[coin];
}

export function validateDonationAmount(
  value: string,
  balanceAtoms?: bigint | null,
): DonationAmountValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return { error: 'Enter an amount.', ok: false };
  }

  if (/^(?:0|[1-9]\d*)\.\d{9,}$/.test(trimmed)) {
    return { error: 'Use at most 8 decimal places.', ok: false };
  }

  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(trimmed)) {
    return { error: 'Enter a valid amount.', ok: false };
  }

  const atoms = coinStringToAtoms(trimmed);

  if (atoms === null) {
    return { error: 'Enter a valid amount.', ok: false };
  }

  if (atoms <= 0n) {
    return { error: 'Amount must be greater than zero.', ok: false };
  }

  if (balanceAtoms !== null && balanceAtoms !== undefined && atoms > balanceAtoms) {
    return { error: 'Amount exceeds the available balance.', ok: false };
  }

  return { amount: trimmed, ok: true };
}

export function atomicToCoinString(value: string | number | bigint): string {
  const atoms = BigInt(value);
  const whole = atoms / 100_000_000n;
  const fraction = atoms % 100_000_000n;
  const fractionLabel = fraction.toString().padStart(8, '0').replace(/0+$/, '');

  return fractionLabel ? `${whole}.${fractionLabel}` : whole.toString();
}

export function coinStringToAtoms(value: string): bigint | null {
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(8, '0'));

  return whole * 100_000_000n + fraction;
}

export function atomicFeePerByteToCoinString(atomsPerByte: number) {
  return (atomsPerByte / 100_000_000).toFixed(8);
}

export function validateDonationFeeAtomsPerByte(value: string): DonationFeeValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return { feePerByte: undefined, ok: true };
  }

  if (!/^(?:0|[1-9]\d*)$/.test(trimmed)) {
    return { error: 'Fee rate must be a whole number of atomic units per byte.', ok: false };
  }

  const atomsPerByte = Number(trimmed);

  if (!Number.isFinite(atomsPerByte)) {
    return { error: 'Enter a valid fee rate.', ok: false };
  }

  if (atomsPerByte === 0) {
    return { feePerByte: undefined, ok: true };
  }

  if (atomsPerByte > 1_000_000) {
    return { error: 'Fee rate is unreasonably high.', ok: false };
  }

  return { feePerByte: atomicFeePerByteToCoinString(atomsPerByte), ok: true };
}
