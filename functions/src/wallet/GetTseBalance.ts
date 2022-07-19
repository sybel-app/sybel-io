import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import BaseRequestDto from "../types/request/BaseRequestDto";
import { tseToken } from "../utils/Contract";
import { checkCallData } from "../utils/Security";
import { getWalletForUser } from "../utils/UserUtils";
import WalletDbDto from "../types/db/WalletDbDto";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onCall(async (data): Promise<unknown> => {
      checkCallData(data);
      // Extract the user id from the request param
      const userId = data.id;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      let forceRefresh: boolean;
      if (data.forceRefresh) {
        forceRefresh = data.forceRefresh;
      } else {
        forceRefresh = false;
      }

      try {
        // Find the wallet of our user
        const db = admin.firestore();
        const walletCollection = db.collection("wallet");

        const walletDocs: admin.firestore.QueryDocumentSnapshot[] = [];
        // Execute the query
        const snapshot = await walletCollection
          .where("id", "==", userId)
          .limit(1)
          .get();
        // Find document and map it
        snapshot.forEach((doc) => {
          walletDocs.push(doc);
        });
        if (walletDocs.length <= 0) {
          throw new functions.https.HttpsError("not-found", "no wallet found");
        }
        const walletDoc = walletDocs[0];
        // Get the balance of TSE on our contract
        const wallet = walletDoc.data() as WalletDbDto;
        if (!wallet) {
          throw new functions.https.HttpsError("not-found", "no wallet found");
        }

        // Check if the wallet already have a balance
        let userBalance: number;
        if (forceRefresh || !wallet.tseBalance) {
          // If we asked for a force refresh, or if the balance isn't known, fetch it and return it
          const balance = await tseToken.balanceOf(wallet.address);
          userBalance = balance.toNumber() / 1e6;
          // Update the user balance
          await walletDoc.ref.update({
            tseBalance: userBalance,
          });
        } else {
          // Otherwise, return the info we got on the db
          userBalance = wallet.tseBalance;
        }
        // And send the response
        return {
          address: wallet.address,
          balance: userBalance,
        };
      } catch (error) {
        functions.logger.debug(
          "An error occured while fetching the tse balance of the user",
          error
        );
        throw new functions.https.HttpsError("internal", "unknown", error);
      }
    });
