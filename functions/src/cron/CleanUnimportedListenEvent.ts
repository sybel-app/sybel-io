import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { collection } from "@firebase/firestore";
import { chunk } from "lodash";

/*
 * Clean all the unimported event
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("0 0 * * 1") // Run every week on monday
    .onRun(async () => {
      functions.logger.info(
        "Started the cleanup of all the unimported listen event"
      );

      // Access our database
      const db = admin.firestore();
      const analyticsCollection = db.collection("listeningAnalytics");

      // Get the timestamp of last month
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthTimestamp =
        FirebaseFirestore.Timestamp.fromDate(lastMonthDate);

      // Get all the listen perform by this user and not payed
      const listenToCleanup = await analyticsCollection
        .where("givenToUser", "!=", true)
        .where("date", "<", lastMonthTimestamp)
        .get();

      // Extract all the references we want to clean
      const references: FirebaseFirestore.DocumentReference[] = [];
      listenToCleanup.forEach((snapshot) => {
        references.push(snapshot.ref);
      });

      functions.logger.debug(
        `Will cleanup ${references.length} listen unpayed from last month`
      );

      // Chunk the list to create batch per 500
      const deleteAllPromise = chunk(references, 500).map(
        async (referencesChunked) => {
          const batch = db.batch();
          referencesChunked.forEach((ref) => {
            batch.delete(ref);
          });
          await batch.commit();
        }
      );

      functions.logger.debug(
        `Successfully cleanup ${references.length} listen unpayed from last month`
      );

      await Promise.all(deleteAllPromise);
      functions.logger.info(
        "Finished the cleanup of all the unimported listen event"
      );
    });
