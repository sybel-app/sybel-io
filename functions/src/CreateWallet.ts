import * as functions from "firebase-functions";
import cors from "cors";
import { ethers } from "ethers";
import * as admin from "firebase-admin";
import { getWalletForUser } from "./utils/UserUtils";

const db = admin.firestore();

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
        functions.logger.debug(
          "Starting up the create wallet process with as param : " +
            JSON.stringify(request.body),
          request.body
        );

        if (!request.body.id) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        const id = request.body.id;
        try {
          // Check if the user already have a wallet
          const currentWallet = await getWalletForUser(id);
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
          const newWallet = ethers.Wallet.createRandom();
          // Encrypt it and save it
          const encryptedWallet = await newWallet.encrypt(
            process.env.SYBEL_ENCRYPTION_KEY as string
          );
          // Build the dto we will stor ein firebase
          const newWalletDto = {
            id,
            encryptedWallet: encryptedWallet,
            address: newWallet.address,
          };

          // Save the fresh wallet in our database and send it back
          await db.collection("wallet").add(newWalletDto);
          response.status(200).send(newWalletDto);
        } catch (error) {
          functions.logger.debug(
            "An error occured while creating the user wallet : " +
              JSON.stringify(error),
            error
          );
          response.status(500).send(error);
        }
      });
    });
