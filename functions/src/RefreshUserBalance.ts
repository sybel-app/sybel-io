import * as functions from "firebase-functions";
import cors from "cors";
import { getWalletForUser } from "./utils/UserUtils";
import { countListenAndPayWallet } from "./utils/PaymentUtils";

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
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        // Extract the user id from the request param
        const userId = request.body.data.id;
        if (!userId) {
          response.status(500).send({ error: "missing arguments" });
          return;
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
          logger.debug(
            "Found the user wallet, starting to fetch all his listen"
          );
          await countListenAndPayWallet(userWallet);

          // Send the response
          response.status(200);
        } catch (error) {
          logger.warn(
            "Unable refresh the amount for the user " + userId,
            error
          );
          response.status(500).send(error);
        }
      });
    });
