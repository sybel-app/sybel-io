import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import SybelDataRefresh from "./model/SybelDataRefresh";
import { Timestamp } from "@firebase/firestore";
import { UsersImported } from "./model/UsersImported";
import { getWalletForUserSet } from "./utils/UserUtils";
import { countListenAndPayWallet } from "./utils/PaymentUtils";
import { chunk } from "lodash";

const db = admin.firestore();

import { BigQuery } from "@google-cloud/bigquery";
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
      const lastRefreshedTimestamp = await getLastSybelRefreshTimestamp();

      // Check the difference between the current time and the last time it was refreshed, if that was less than 15min again abort
      const diffInMillis =
        new Date().getTime() - lastRefreshedTimestamp.toMillis();
      if (diffInMillis < 15 * 60 * 1000) {
        logger.debug(
          "The sybel prod data where refreshed less than 15min again, aborting the refresh"
        );
        return null;
      }

      // Import sybel listen event in our analytics table
      const usersImported = await importSybelListenEvent(
        lastRefreshedTimestamp
      );

      // WARN ! The count and payment are all in async, so we will reach the end of this function before the owner and user have been paied, be sure it's not a proble, otherwise encapsulate in a map and Promise all
      // Directly pay the owner updated
      const ownerWallets = await getWalletForUserSet(usersImported.ownerIdSet);
      logger.debug("Found " + ownerWallets.size + " wallets of owner to add");
      ownerWallets.forEach(async (wallet) => {
        await countListenAndPayWallet(wallet, "ownerId", "givenToOwner");
      });

      // Directly pay the ownuserer updated
      const userWallets = await getWalletForUserSet(usersImported.userIdSet);
      userWallets.forEach(async (wallet) => {
        await countListenAndPayWallet(wallet, "userId", "givenToUser");
      });

      return null;
    });

/**
 * Get the last time the sybel prod data where imported
 * @return {void} The last timestamp at which the listen data from Sybel where refreshed
 */
async function getLastSybelRefreshTimestamp(): Promise<Timestamp> {
  const collection = db.collection("sybelProdctionRefresh");
  const documents: SybelDataRefresh[] = [];
  const snapshot = await collection.orderBy("timestamp", "desc").limit(1).get();
  let lastTimestamp: Timestamp;
  snapshot.forEach((doc) => documents.push(doc.data() as SybelDataRefresh));
  if (documents.length > 0) {
    const lastDataRefresh = documents[0] as SybelDataRefresh;
    lastTimestamp = lastDataRefresh.timestamp;
  } else {
    lastTimestamp = new Timestamp(1, 1);
  }

  return lastTimestamp;
}

/**
 * Query our big query database to get all the Sybel listen
 * event's for each user, and import them into firebase
 * @param {Timestamp} lastRefreshedTimestamp
 * @return {void} nothing
 */
async function importSybelListenEvent(
  lastRefreshedTimestamp: Timestamp
): Promise<UsersImported> {
  // Build our big query connection
  const projectId = "sybel-bigquery";
  const keyFilename = "sybel-bigquery-prod.json";
  const bigquery = new BigQuery({ projectId, keyFilename });

  // Build the query that will fetch all the data from the big query table
  const query = `SELECT UNIX_MILLIS(data.timestamp) AS timestamp, 
              data.user_id, data.series_id, owner_id.owner_id, 
              FROM \`sybel-bigquery.prod_data_studio.prod_union_acpm\` AS data
              INNER JOIN \`sybel-bigquery.prod_server_api.dev_seriesid_ownerid\` AS owner_id
              ON owner_id.series_id = data.series_id
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

    // Create the batch for our database operation
    const collection = db.collection("listeningAnalyticsTest");

    // Map each one of our row into new listen object, and then insert them in our database
    logger.info(
      `Found ${rows.length} new listen event to add in our collection from big query`
    );

    // Build the set of owner and user id set we updated
    const ownerIdSet = new Set<string>();
    const userIdSet = new Set<string>();

    // Slide into chunk of 500 to prevent transaction overflow from firestore db
    // eslint-disable-next-line max-len
    // Await for the transactions to complete to be sure we got the fresh data in our database before computing the new amount
    await Promise.all(
      chunk(rows, 500).map(async (chunkedRows) => {
        const batch = db.batch();

        chunkedRows.forEach((row: any) => {
          // Build the new listen obj
          const newListen = {
            rssUrl: null,
            userId: row.user_id,
            ownerId: row.owner_id,
            seriesId: row.series_id,
            givenToOwner: false,
            givenToUser: false,
            date: admin.firestore.Timestamp.fromMillis(row.timestamp),
          };

          // Add the user and owner id into our set
          ownerIdSet.add(newListen.ownerId);
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
      timestamp: lastTimestampFetched,
      importCount: rows.length,
    });

    // Then, return the set of user's imported
    return new UsersImported(ownerIdSet, userIdSet);
  } catch (e) {
    logger.warn("Unable to import the sybel listen event's", e);
    return new UsersImported(new Set(), new Set());
  }
}
