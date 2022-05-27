import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";
import SybelDataRefresh from "./model/SybelDataRefresh";
import { Timestamp } from "@firebase/firestore";

const db = admin.firestore();

const { BigQuery } = require('@google-cloud/bigquery');
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
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        if (!request.body.id) {
          response.status(500).send({ error: "missing arguments" });
        } else {

          const id = request.body.id;
          logger.debug(`Will refresh the amount for the user ${id}`)

          try {

            // Try to perform the simple request
            await importSybelListenEvent()

            const collection = db.collection("listeningAnalytics");

            // Update the owner amount
            const ownerLog: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] = [];
            const ownerSnapshot = await collection
              .where("ownerId", "==", id)
              .where("givenToOwner", "!=", true)
              .get();
            ownerSnapshot.forEach((doc) => ownerLog.push(doc));
            ownerLog.map(async (each) => {
              const docRef = db.collection("listeningAnalytics").doc(each.id);
              await docRef.update({ givenToOwner: true });
            });

            // Update the user amount
            const userLog: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] = [];
            const userSnapshot = await collection
              .where("userId", "==", id)
              .where("givenToUser", "!=", true)
              .get();
            userSnapshot.forEach((doc) => userLog.push(doc));
            userLog.map(async (each) => {
              const docRef = db.collection("listeningAnalytics").doc(each.id);
              await docRef.update({ givenToUser: true });
            });

            response.status(200)
              .send({
                ownerAmount: ownerLog.length,
                userAmount: userLog.length
              });
          } catch (error) {
            logger.warn("Unable refresh the amount for the user " + id, error)
            response.status(500).send(error);
          }
        }
      });
    });

// Get the last time the sybel prod data where imported
async function getLastSybelRefreshTimestamp(): Promise<Timestamp> {
  const collection = db.collection("sybelProdctionRefresh");
  const documents: SybelDataRefresh[] = [];
  const snapshot = await collection
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();
  let lastTimestamp: Timestamp
  snapshot.forEach((doc) => documents.push(doc.data() as SybelDataRefresh));
  if (documents.length > 0) {
    const lastDataRefresh = documents[0] as SybelDataRefresh
    lastTimestamp = lastDataRefresh.timestamp
  } else {
    lastTimestamp = new Timestamp(1, 1)
  }

  return lastTimestamp
}


// Query our big query database to get all the Sybel listen event's for each user
async function importSybelListenEvent() {
  logger.debug("Starting to import the sybel listen event")

  // Get the last timestamp used to fetch the prod data
  const lastRefreshedTimestamp = await getLastSybelRefreshTimestamp()

  // Check the difference between the current time and the last time it was refreshed, if that was less than 15min again abort
  const diffInMillis = new Date().getTime() - lastRefreshedTimestamp.toMillis()
  if (diffInMillis < 15 * 60 * 1000) {
    logger.debug("The sybel prod data where refreshed less than 15min again, aborting the refresh")
    return
  }

  // Build our big query connection
  const projectId = 'sybel-bigquery'
  const keyFilename = 'sybel-bigquery-3694f3cffbbb.json'
  const bigquery = new BigQuery({ projectId, keyFilename });


  // Build the query that will fetch all the data from the big query table
  const query = `SELECT UNIX_MILLIS(data.timestamp) AS timestamp, 
              data.user_id, data.series_id, owner_id.owner_id, 
              FROM \`sybel-bigquery.prod_data_studio.prod_union_acpm\` AS data
              INNER JOIN \`sybel-bigquery.prod_server_api.dev_seriesid_ownerid\` AS owner_id
              ON owner_id.series_id = data.series_id
              WHERE UNIX_MILLIS(data.timestamp) > @lastTimestamp `;
  try {
    const options = { query: query, location: 'EU', params: { lastTimestamp: lastRefreshedTimestamp.toMillis } };

    // Create the job that will run the query and execute it
    const [job] = await bigquery.createQueryJob(options);

    // Get the timestamp at wich this query was executed
    const queryTimestamp = admin.firestore.Timestamp.fromDate(new Date())

    const [rows] = await job.getQueryResults();

    // Create the batch for our database operation
    const batch = db.batch();
    const collection = db.collection("listeningAnalyticsTest"); // FIXME : Should be push directly in the real database, wait for PR for that

    // Map each one of our row into new listen object, and then insert them in our database
    logger.info(`Found ${rows.length} new listen event to add in our collection from big query`)
    rows.forEach((row: any) => {
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

      // Add it in our db transaction
      batch.set(collection.doc(), newListen);
    });

    // Then commit our transaction
    await batch.commit();

    // And finally, save this new data import
    await db.collection("sybelProdctionRefresh").add({
      timestamp: queryTimestamp,
      importCount: rows.length
    });
  } catch (e) {
    logger.warn("Unable to import the sybel listen event's", e)
  }
}