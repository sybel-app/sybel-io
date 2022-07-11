import * as functions from "firebase-functions";
import cors from "cors";
import { ethers } from "ethers";
import * as admin from "firebase-admin";
import { getWalletForUser } from "../utils/UserUtils";
import { walletToResponse } from "../utils/Mapper";
import WalletDbDto from "../types/db/WalletDbDto";

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
    .https.onCall(async (data, context): Promise<unknown> => {
      functions.logger.debug(`app id ${context.app?.appId}`);
      functions.logger.debug(`auth id ${context.auth?.uid}`);
      functions.logger.debug(`instance id token ${context.instanceIdToken}`);
      // Ensure that this function is called from a known app with the right instance token
      /*if (!context.app) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "The function need to be called from a known app"
        );
      }*/

      // Extract the user id from the request param
      const userId = data.id;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      try {
        // Check if the user already have a wallet
        const currentWallet = await getWalletForUser(userId);
        if (currentWallet != null) {
          functions.logger.debug(
            "The user already have a wallet, don't create a new one"
          );

          return walletToResponse(currentWallet);
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
        const walletDbDto: WalletDbDto = {
          id: userId,
          encryptedWallet: encryptedWallet,
          address: newWallet.address,
        };
        await db.collection("wallet").add(walletDbDto);
        // Send the user id and public address in response
        return walletToResponse(walletDbDto);
      } catch (error) {
        functions.logger.debug(
          "An error occured while creating the user wallet",
          error
        );
        throw new functions.https.HttpsError("internal", "unknown", error);
      }
    });
