import * as functions from "firebase-functions";
import cors from "cors";
import { getWalletForUser } from "../utils/UserUtils";
import { walletToResponse } from "../utils/Mapper";

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
    .https.onCall(async (data, context): Promise<unknown> => {
      functions.logger.debug(`app id ${context.app?.appId}`);
      functions.logger.debug(`auth id ${context.auth?.uid}`);
      functions.logger.debug(`instance id token ${context.instanceIdToken}`);
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
