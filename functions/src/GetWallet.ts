import * as functions from "firebase-functions";
import cors from "cors";
import { getWalletForUser } from "./utils/UserUtils";
import { walletToResponse } from "./utils/Mapper";

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
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        // Ensure we got the right param
        const userId = request.body.data.id;
        if (!userId) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        // Try to find the wallet
        const wallet = await getWalletForUser(userId);
        if (wallet != null) {
          // Send the user id and public address in response
          response.status(200).send(walletToResponse(wallet));
        } else {
          response.status(404).send({ error: "no wallet found" });
        }
      });
    });
