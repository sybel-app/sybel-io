import * as functions from "firebase-functions";
import cors from "cors";
import Web3 from "web3";
import * as admin from "firebase-admin";
import { getWalletForUser } from "./utils/UserUtils";

const db = admin.firestore();
const web3 = new Web3(process.env.NODE || "http://localhost:3000/");

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
        if (!request.body.id) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        const id = request.body.id;
        try {
          // Check if the user already have a wallet
          const currentWallet = getWalletForUser(id);
          if (currentWallet != null) {
            functions.logger.debug(
              "The user already have a wallet, don't create a new one"
            );
            response.status(200).send(currentWallet);
            return;
          }

          // If needed, create the new wallet
          functions.logger.debug(
            "The user havn't got a wallet yet, create him new one"
          );
          const newWallet = web3.eth.accounts.create();
          const newWalletDto = {
            id,
            address: newWallet.address,
            privateKey: newWallet.privateKey,
          };

          // Save the fresh wallet in our database and send it back
          await db.collection("wallet").add(newWalletDto);
          response.status(200).send(newWalletDto);
        } catch (error) {
          response.status(500).send(error);
        }
      });
    });
