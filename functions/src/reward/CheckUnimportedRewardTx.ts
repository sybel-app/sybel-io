import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { provider } from "../utils/Contract";
import ListenAnalyticsDbDto from "../types/db/ListenAnalyticsDbDto";

/*
 * Check the unimported reward tx
 */
export default () =>
  functions
    .region("europe-west3")
    .runWith({
      timeoutSeconds: 540,
    })
    .pubsub.schedule("5,35 * * * *") // Run every 30min
    .onRun(async () => {
      functions.logger.info(
        "Started the check of all the unimported reward transaction"
      );

      // Ensure this podcast wasn't previously minted
      const listeningCollection = admin
        .firestore()
        .collection("listeningAnalytics");
      const unimportedListeningSnapshot = await listeningCollection
        .where("rewardTxHash", "!=", null)
        .where("txBlockHash", "==", null)
        .get();

      const unimportedListeningDocs: admin.firestore.QueryDocumentSnapshot[] =
        [];
      // Map them to our dto
      unimportedListeningSnapshot.forEach((doc) =>
        unimportedListeningDocs.push(doc)
      );
      functions.logger.info(
        `Found ${unimportedListeningDocs.length} unimported reward tx`
      );

      // Iterate over each one of them
      for (const unimportedListeningDoc of unimportedListeningDocs) {
        try {
          const unimportedListening =
            unimportedListeningDoc.data() as ListenAnalyticsDbDto;
          if (!unimportedListening.rewardTxHash) {
            functions.logger.debug(
              "Unable to find the tx hash for this listening, aborting"
            );
            continue;
          }
          // Get the tx
          const transaction = await provider.getTransaction(
            unimportedListening.rewardTxHash
          );

          // If the transaction isn't mined yet, jump to the next iteration
          if (!transaction.blockHash) {
            functions.logger.debug(
              `The tx ${transaction.hash} isn't mined yet, aborting the import`
            );
            continue;
          }

          functions.logger.debug(
            `The tx for the reward have been mined on the block ${transaction.blockHash}`
          );

          // Update the doc
          await unimportedListeningDoc.ref.update({
            txBlockNumber: transaction.blockNumber,
            txBlockHash: transaction.blockHash,
            givenToUser: true,
          });
        } catch (exception: unknown) {
          functions.logger.warn(
            "An error occured while handling a freshly rewarded listening",
            exception
          );
        }
      }

      functions.logger.info(
        "Finished the check of all the unimported reward transaction"
      );
    });
