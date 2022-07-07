import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import SybelDataRefreshDbDto from "./types/db/SybelDataRefreshDbDto";
import { Timestamp } from "@firebase/firestore";
import { getWalletForUserSet } from "./utils/UserUtils";
import { countListenAndPayWallet } from "./utils/PaymentUtils";
import { chunk } from "lodash";

const db = admin.firestore();

import { BigQuery } from "@google-cloud/bigquery";
import ListenAnalyticsDbDto from "../types/db/ListenAnalyticsDbDto";
const logger = functions.logger;

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("20 * * * *")
    .onRun(async () => {
      logger.debug("Starting to import the sybel listen event");

      // Get the last timestamp used to fetch the prod data
      let lastRefreshedTimestamp = await getLastSybelRefreshTimestamp();
      if (lastRefreshedTimestamp) {
        // Check the difference between the current time and the last time it was refreshed, if that was less than 15min again abort
        const diffInMillis =
          new Date().getTime() - lastRefreshedTimestamp.toMillis();
        if (diffInMillis < 15 * 60 * 1000) {
          logger.debug(
            "The sybel prod data where refreshed less than 15min again, aborting the refresh"
          );
          return null;
        }
      } else {
        lastRefreshedTimestamp = Timestamp.fromDate(new Date());
      }

      // Import sybel listen event in our analytics table
      const userIdSet = await importSybelListenEvent(lastRefreshedTimestamp);

      // Directly pay the user updated
      const userWallets = await getWalletForUserSet(userIdSet);
      for (const userWallet of userWallets) {
        await countListenAndPayWallet(userWallet);
      }

      return null;
    });

/**
 * Get the last time the sybel prod data where imported
 * @return {void} The last timestamp at which the listen data from Sybel where refreshed
 */
async function getLastSybelRefreshTimestamp(): Promise<Timestamp | null> {
  const collection = db.collection("sybelProdctionRefresh");
  const documents: SybelDataRefreshDbDto[] = [];
  const snapshot = await collection.orderBy("timestamp", "desc").limit(1).get();
  snapshot.forEach((doc) =>
    documents.push(doc.data() as SybelDataRefreshDbDto)
  );
  if (documents.length > 0) {
    const lastDataRefresh = documents[0] as SybelDataRefreshDbDto;
    return lastDataRefresh.timestamp;
  }

  return null;
}

/**
 * Query our big query database to get all the Sybel listen
 * event's for each user, and import them into firebase
 * @param {Timestamp} lastRefreshedTimestamp
 * @return {void} nothing
 */
async function importSybelListenEvent(
  lastRefreshedTimestamp: Timestamp
): Promise<Set<string>> {
  // Build our big query connection
  const projectId = "sybel-bigquery";
  const keyFilename = "sybel-bigquery.json";
  const bigquery = new BigQuery({ projectId, keyFilename });

  // Build the query that will fetch all the data from the big query table
  logger.debug(
    `Will import all the listen event after timestamp ${lastRefreshedTimestamp.toMillis()}`
  );
  const query = `SELECT UNIX_MILLIS(data.timestamp) AS timestamp, 
              data.user_id, data.series_id, 
              FROM \`sybel-bigquery.prod_data_studio.prod_union_acpm\` AS data
              WHERE UNIX_MILLIS(data.timestamp) > @lastTimestamp 
              ORDER BY data.timestamp`;
  try {
    const options = {
      query: query,
      location: "EU",
      params: { lastTimestamp: lastRefreshedTimestamp.toMillis() },
    };

    // Create the job that will run the query and execute it
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    // Exit recitly if we didn't found any new row
    if (rows.length <= 0) {
      logger.debug("No listen action found, aborting the import process");
      await db.collection("sybelProdctionRefresh").add({
        timestamp: admin.firestore.Timestamp.fromMillis(
          lastRefreshedTimestamp.toMillis()
        ),
        importCount: rows.length,
      });
      return new Set();
    }

    // Create the batch for our database operation
    const collection = db.collection("listeningAnalytics");

    // Map each one of our row into new listen object, and then insert them in our database
    logger.info(
      `Found ${rows.length} new listen event to add in our collection from big query`
    );

    // Build the set of owner and user id set we updated
    const userIdSet = new Set<string>();

    // Slide into chunk of 500 to prevent transaction overflow from firestore db
    // eslint-disable-next-line max-len
    // Await for the transactions to complete to be sure we got the fresh data in our database before computing the new amount
    await Promise.all(
      chunk(rows, 500).map(async (chunkedRows) => {
        const batch = db.batch();

        chunkedRows.forEach((row: any) => {
          // Build the new listen obj
          const newListen: ListenAnalyticsDbDto = {
            userId: row.user_id,
            seriesId: row.series_id,
            givenToUser: false,
            date: FirebaseFirestore.Timestamp.fromMillis(row.timestamp),
          };

          // Add the user id into our set
          userIdSet.add(newListen.userId);

          // Add it in our db transaction
          batch.set(collection.doc(), newListen);
        });
        // Then commit our transaction
        await batch.commit();
      })
    );

    // Find the last timestamp we fetched
    const lastTimestampFetched = rows[rows.length - 1].timestamp;

    // And finally, save this new data import
    await db.collection("sybelProdctionRefresh").add({
      timestamp: admin.firestore.Timestamp.fromMillis(lastTimestampFetched),
      importCount: rows.length,
    });

    // Then, return the set of user's imported
    return userIdSet;
  } catch (e) {
    logger.warn("Unable to import the sybel listen event's", e);
    return new Set();
  }
}
