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
        // Check the parameter
        if (!request.body.id) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        // Get
        const id = request.body.id;
        logger.debug(`Will refresh the user balance ${id}`);

        try {
          const userWallet = await getWalletForUser(id);
          if (!userWallet) {
            logger.debug("Unable to find the user wallet, can't pay him");
            return;
          }

          // Update the owner and the user amounts
          await countListenAndPayWallet(userWallet, "ownerId", "givenToOwner");
          await countListenAndPayWallet(userWallet, "userId", "givenToUser");

          // Send the response
          response.status(200);
        } catch (error) {
          logger.warn("Unable refresh the amount for the user " + id, error);
          response.status(500).send(error);
        }
      });
    });
