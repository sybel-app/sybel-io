import * as functions from "firebase-functions";
import cors from "cors";
import { tseToken } from "./utils/Contract";

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
        if (!request.body.address) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const address = request.body.address;
          try {
            // Get the balance of TSE on our contract
            const balance = await tseToken.balanceOf(address);
            // And send the response
            response.status(200).send({
              address: address,
              balance: balance.toNumber() / 1e6,
            });
          } catch (error) {
            response.status(500).send(error);
          }
        }
      });
    });
