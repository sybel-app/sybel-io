import * as functions from "firebase-functions";
import { getWalletForUser } from "../utils/UserUtils";
import { walletToResponse } from "../utils/Mapper";
import BaseRequestDto from "../types/request/BaseRequestDto";
import { checkCallData } from "../utils/Security";

/**
 * Try to find a wallet for the user
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onCall(async (data: BaseRequestDto): Promise<unknown> => {
      checkCallData(data);
      // Ensure we got the right param
      const userId = data.id;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      // Try to find the wallet
      const wallet = await getWalletForUser(userId);
      if (wallet != null) {
        // Send the user id and public address in response
        return walletToResponse(wallet);
      } else {
        throw new functions.https.HttpsError("not-found", "no wallet found");
      }
    });
