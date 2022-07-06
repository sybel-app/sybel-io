import * as functions from "firebase-functions";
import { tseToken } from "./utils/Contract";
import { getWalletForUser } from "./utils/UserUtils";

/**
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
      // Extract the user id from the request param
      const userId = data.id;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      try {
        // Get the balance of TSE on our contract
        const wallet = await getWalletForUser(userId);
        if (!wallet) {
          throw new functions.https.HttpsError("not-found", "no wallet found");
        }
        const balance = await tseToken.balanceOf(wallet.address);
        // And send the response
        return {
          address: wallet.address,
          balance: balance.toNumber() / 1e6,
        };
      } catch (error) {
        functions.logger.debug(
          "An error occured while fetching the tse balance of the user",
          error
        );
        throw new functions.https.HttpsError("internal", "unknown", error);
      }
    });
