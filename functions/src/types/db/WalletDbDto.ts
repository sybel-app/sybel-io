interface WalletDbDto {
  readonly address: string;
  readonly encryptedWallet: string;
  readonly id: string;
  readonly tseBalance?: number;
  readonly fractions?: OwnedFraction[];
}

export interface OwnedFraction {
  readonly seriesId: string;
  readonly tokenType: number;
  readonly count: number;
  readonly txHash: string;
}

export default WalletDbDto;
