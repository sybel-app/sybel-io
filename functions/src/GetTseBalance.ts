import * as functions from "firebase-functions";
import cors from "cors";
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
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        // Extract the user id from the request param
        const userId = request.body.data.id;
        if (!userId) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        try {
          // Get the balance of TSE on our contract
          const wallet = await getWalletForUser(userId);
          if (!wallet) {
            response
              .status(404)
              .send({ error: "no wallet found for the user" });
            return;
          }
          const balance = await tseToken.balanceOf(wallet.address);
          // And send the response
          response.status(200).send({
            address: wallet.address,
            balance: balance.toNumber() / 1e6,
          });
        } catch (error) {
          functions.logger.debug(
            "An error occured while fetching the tse balance of the user",
            error
          );
          response.status(500).send(error);
        }
      });
    });
