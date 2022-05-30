import * as functions from "firebase-functions";
import cors from "cors";
import { getWalletForUser } from "./utils/UserUtils";

/**
 * @function Try to find a wallet for the user
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () => functions
  .region("europe-west3")
  .https.onRequest(async (request, response) => {
    cors()(request, response, async () => {
      // Ensure we got the right param
      if (!request.body.id) {
        response.status(500).send({ error: "missing arguments" });
        return
      }
      
      // Extract the id from the request
      const id = request.body.id;

      // Try to find the wallet
      const wallet = await getWalletForUser(id)
      if (wallet != null) {
        response.status(200).send(wallet);
      } else {
        response.status(404).send({ error: "no wallet found" });
      }
    });
  });
