import * as functions from "firebase-functions";
import { getWalletForUser } from "../utils/UserUtils";
import { countListenAndPayWallet } from "../utils/PaymentUtils";
import { checkCallData } from "../utils/Security";
import BaseRequestDto from "../types/request/BaseRequestDto";

const logger = functions.logger;

/**
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
      // Extract the user id from the request param
      const userId = data.id;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }
      logger.debug(`Will refresh the user balance ${userId}`);

      try {
        // Find the wallet for the user id
        const userWallet = await getWalletForUser(userId);
        if (!userWallet) {
          logger.debug("Unable to find the user wallet, can't pay him");
          return;
        }

        // Update the owner and the user amounts
        logger.debug("Found the user wallet, starting to fetch all his listen");
        const rewardTxHash = await countListenAndPayWallet(userWallet);

        // Send the response
        return {
          txHash: rewardTxHash,
        };
      } catch (error) {
        logger.warn("Unable refresh the amount for the user " + userId, error);
        throw new functions.https.HttpsError("internal", "unknown", error);
      }
    });
