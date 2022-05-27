import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";

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
          logger.info(`Will refresh the amount for the user ${id}`)


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
            logger.error("Unable refresh the amount for the user " + id, error)
            response.status(500).send(error);
          }
        }
      });
    });


// Query our big query database to get all the Sybel listen event's for each user
async function importSybelListenEvent() {
  logger.info("Starting to import the sybel listen event")

  // Build our big query connection
  const projectId = 'sybel-bigquery'
  const keyFilename = 'sybel-bigquery-3694f3cffbbb.json'
  const bigquery = new BigQuery({ projectId, keyFilename });

  // Build the query that will fetch all the data from the big query table
  const query = `SELECT data.timestamp, data.user_id, data.series_id, owner_id.owner_id, 
              FROM \`sybel-bigquery.prod_data_studio.prod_union_acpm\` AS data
              INNER JOIN \`sybel-bigquery.prod_server_api.dev_seriesid_ownerid\` as owner_id
              ON owner_id.series_id = data.series_id
              WHERE owner_id.owner_id IS NOT NULL
              LIMIT 5`;
  try {
    const options = { query: query, location: 'EU' };

    // Create the job that will run the query and execute it
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    // Map each one of our row into new listen object
    rows.map((row: any) => {
      return {
        rssUrl: null,
        userId: row.user_id,
        ownerId: row.owner_id,
        seriesId: row.series_id,
        givenToOwner: false,
        givenToUser: false,
        date: row.timestamp,
      };
    }).forEach((newListen: any) => {
      logger.info("Created a new listen object for user " + newListen.userId)
    });
  } catch (e) {
    logger.error("Unable to import the sybel listen event's", e)
  }
}