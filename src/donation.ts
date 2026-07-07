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

export function validateDonationAmount(value: string): DonationAmountValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return { error: 'Enter an amount.', ok: false };
  }

  const amount = Number(trimmed);

  if (!Number.isFinite(amount)) {
    return { error: 'Enter a valid number.', ok: false };
  }

  if (amount <= 0) {
    return { error: 'Amount must be greater than zero.', ok: false };
  }

  return { amount: trimmed, ok: true };
}

export function atomicFeePerByteToCoinString(atomsPerByte: number) {
  return (atomsPerByte / 100_000_000).toFixed(8);
}

export function validateDonationFeeAtomsPerByte(value: string): DonationFeeValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return { feePerByte: undefined, ok: true };
  }

  const atomsPerByte = Number(trimmed);

  if (!Number.isFinite(atomsPerByte)) {
    return { error: 'Enter a valid fee rate.', ok: false };
  }

  if (atomsPerByte < 0) {
    return { error: 'Fee rate cannot be negative.', ok: false };
  }

  if (atomsPerByte === 0) {
    return { feePerByte: undefined, ok: true };
  }

  return { feePerByte: atomicFeePerByteToCoinString(atomsPerByte), ok: true };
}
