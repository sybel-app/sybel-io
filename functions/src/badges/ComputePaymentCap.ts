import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  ConsumedContentDbDto,
  CcuPerWeek,
} from "../types/db/ConsumedContentDbDto";

// Access our database
const db = admin.firestore();
const ccuCollection = db.collection("consumedContentUnit");

/*
 * Compute a new badge for a podcast

 * Required data : 
  - Total fraction minter par rarete
  - Rarete des fractions 
  - Nbr d'écoute sur une semaine pour user avec wallet -> peut etre a ponderer par rarete de fraction (check si possible de balancer l'event complet)
  - Nbr d'écoute 
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("0 0 * * 1") // Run every week on monday
    .onRun(async () => {
      functions.logger.info("Started the paymant cap computation");
      // Get all the collection that where the current ccu is superior to 0
      const nonZeroCcuDocsSnapshot = await ccuCollection
        .where("currentWeekCcu", ">", 0)
        .get();
      const nonZeroCcuDocs: admin.firestore.QueryDocumentSnapshot[] = [];
      nonZeroCcuDocsSnapshot.forEach((doc) => nonZeroCcuDocs.push(doc));

      // The array of current week ccu per user
      const currentWeekCcus: number[] = [];

      // Get the current date, we will use to archive the ccu of the user
      const currentDate = new Date();

      // Iterate over each one of them to get the top 5%
      for (const ccuDoc of nonZeroCcuDocs) {
        const userCcu = ccuDoc.data() as ConsumedContentDbDto;
        // Build his week ccu and add it to the user object
        const weekCcu: CcuPerWeek = {
          ccuCount: userCcu.currentWeekCcu,
          date: admin.firestore.Timestamp.fromDate(currentDate),
        };
        const userCcuPerWeeks = userCcu.ccuPerWeeks;
        userCcuPerWeeks.push(weekCcu);

        // Push this user ccu to our list
        currentWeekCcus.push(userCcu.currentWeekCcu);

        // Update our user ccu object
        await ccuDoc.ref.update({
          currentWeekCcu: 0,
          ccuPerWeeks: userCcuPerWeeks,
        });
      }

      // Sort the ccu counts desc
      currentWeekCcus.sort((x, y) => y - x);

      // Get the top 5%
      const fivePercentSlice = Math.floor(currentWeekCcus.length * 0.05);
      const top5PercentCcus = currentWeekCcus.slice(0, fivePercentSlice);

      // TODO : We should store this top 5 percent, and then perform a chi squared test on each reward, on the number of ccu to be payed, to ensure it's ok ?

      // based on : https://sybel.gitbook.io/the-sybel-ecosystem-white-paper/the-sybel-ecosystem/earning-model/earning-caps
      functions.logger.info("Finished the payment cap computation");
    });
