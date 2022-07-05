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
        // Extract the user id from the request param
        const userId = request.body.data.id;
        if (!userId) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        try {
          // Check if the user already have a wallet
          const currentWallet = await getWalletForUser(userId);
          if (currentWallet != null) {
            functions.logger.debug(
              "The user already have a wallet, don't create a new one"
            );
            response.status(200).send({
              data: {
                id: userId,
                address: currentWallet.address,
              },
            });
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

          // Save the fresh wallet in our database
          await db.collection("wallet").add({
            userId,
            encryptedWallet: encryptedWallet,
            address: newWallet.address,
          });
          // Send the user id and public address in response
          response.status(200).send({
            data: {
              id: userId,
              address: newWallet.address,
            },
          });
        } catch (error) {
          functions.logger.debug(
            "An error occured while creating the user wallet",
            error
          );
          response.status(500).send(error);
        }
      });
    });
