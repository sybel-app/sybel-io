import WalletDbDto from "../types/db/WalletDbDto";

/**
 * Map a db wallet into a web service response
 * @param {WalletDbDto} wallet
 * @return {unknown}
 */
export function walletToResponse(wallet: WalletDbDto) {
  return {
    id: wallet.id,
    address: wallet.address,
  };
}
