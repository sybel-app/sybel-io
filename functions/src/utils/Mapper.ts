import { Wallet } from "ethers";
import WalletDbDto from "../types/db/WalletDbDto";

/**
 * Map a db wallet into a web service response
 * @param {WalletDbDto} wallet
 * @return
 */
export function walletToResponse(wallet: WalletDbDto) {
  return {
    data: {
      id: wallet.id,
      address: wallet.address,
    },
  };
}
