import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";
import SybelDataRefresh from "./model/SybelDataRefresh";
import { Timestamp } from "@firebase/firestore";
import { getWalletForUser, sliceIntoChunks } from "./Common";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import Transaction from "ethereumjs-tx/dist/transaction";
import Common, { CustomChain } from "@ethereumjs/common";
import abi from "./abi.json";

const db = admin.firestore();

const { BigQuery } = require("@google-cloud/bigquery");
const logger = functions.logger;

const web3 = new Web3(process.env.NODE || "http://localhost:3000/");
const common = Common.custom(CustomChain.PolygonMumbai);

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
        // Check the parameter
        if (!request.body.id) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        // Get
        const id = request.body.id;
        logger.debug(`Will refresh the user balance ${id}`);

        try {
          // Import sybel listen event in our analytics table
          await importSybelListenEvent();

          const collection = db.collection("listeningAnalytics");

          // Get the owner amount
          const ownerLog: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] =
            [];
          const ownerSnapshot = await collection
            .where("ownerId", "==", id)
            .where("givenToOwner", "!=", true)
            .get();
          ownerSnapshot.forEach((doc) => ownerLog.push(doc));
          // TODO : We should try to pay hime here, and only update the document if the payment was a success
          ownerLog.map(async (each) => {
            const docRef = db.collection("listeningAnalytics").doc(each.id);
            await docRef.update({ givenToOwner: true });
          });

          // Get the user amount
          const userLog: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] =
            [];
          const userSnapshot = await collection
            .where("userId", "==", id)
            .where("givenToUser", "!=", true)
            .get();
          userSnapshot.forEach((doc) => userLog.push(doc));
          // TODO : We should try to pay hime here, and only update the document if the payment was a success
          userLog.map(async (each) => {
            const docRef = db.collection("listeningAnalytics").doc(each.id);
            await docRef.update({ givenToUser: true });
          });

          logger.info(
            `The user ${id} have ${ownerLog.length} listen as owner to be paid, and ${userLog.length} listen as user to be paid`
          );

          // Launch the user payment
          payUser(id, ownerLog.length, userLog.length);

          // Send the response
          response.status(200).send({
            ownerAmount: ownerLog.length,
            userAmount: userLog.length,
          });
        } catch (error) {
          logger.warn("Unable refresh the amount for the user " + id, error);
          response.status(500).send(error);
        }
      });
    });

/**
 * Get the last time the sybel prod data where imported
 * @returns The last timestamp at which the listen data from Sybel where refreshed
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
 * Query our big query database to get all the Sybel listen event's for each user, and import them into firebase
 * @returns nothing
 */
async function importSybelListenEvent() {
  logger.debug("Starting to import the sybel listen event");

  // Get the last timestamp used to fetch the prod data
  const lastRefreshedTimestamp = await getLastSybelRefreshTimestamp();

  // Check the difference between the current time and the last time it was refreshed, if that was less than 15min again abort
  const diffInMillis = new Date().getTime() - lastRefreshedTimestamp.toMillis();
  if (diffInMillis < 15 * 60 * 1000) {
    logger.debug(
      "The sybel prod data where refreshed less than 15min again, aborting the refresh"
    );
    return;
  }

  // Build our big query connection
  const projectId = "sybel-bigquery";
  const keyFilename = "sybel-bigquery-3694f3cffbbb.json";
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

    // Slide into chunk of 500 to prevent transaction overflow from firestore db
    // Await for the transactions to complete to be sure we got the fresh data in our database before computing the new amount
    await Promise.all(
      sliceIntoChunks(rows, 500).map(async (chunkedRows: Array<any>) => {
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
  } catch (e) {
    logger.warn("Unable to import the sybel listen event's", e);
  }
}

/**
 * Pay a user
 * @param userId the user id
 * @param listenAsOwnerCount the number of time the owner podcast where listened
 * @param listenAsUserCount the number of time the user listen to a podcast
 */
async function payUser(
  userId: String,
  listenAsOwnerCount: number,
  listenAsUserCount: number
) {
  const userWallet = await getWalletForUser(userId);
  if (!userWallet) {
    logger.debug("Unable to find the user wallet, can't pay him");
    return;
  }

  if (listenAsOwnerCount > 0) {
    logger.debug(
      `Will pay the user ${userId} for ${listenAsOwnerCount} listen as an owner of podcast`
    );
    payWallet(userWallet.address, listenAsOwnerCount);
  }
  if (listenAsUserCount > 0) {
    logger.debug(
      `Will pay the user ${userId} for ${listenAsOwnerCount} listen as a listener of podcast`
    );
    payWallet(userWallet.address, listenAsUserCount);
  }
}

/**
 * Pay a wallet for a given number of liste,
 * @param walletAddress the wallet address to pay
 * @param listenCount the number of listen to pay
 */
async function payWallet(walletAddress: String, listenCount: number) {
  const tokenContract = new web3.eth.Contract(
    abi as AbiItem[],
    process.env.SYBEL
  );
  const bufferedPrivateKey = Buffer.from(process.env.SYBELPRIVK || "", "hex");
  let count;
  web3.eth.getTransactionCount(process.env.SYBELPUBK || "").then(function (c) {
    count = c;
    const rawTransaction = {
      from: process.env.SYBELPUBK,
      gasPrice: web3.utils.toHex(20 * 1e9),
      gasLimit: web3.utils.toHex(210000),
      to: process.env.SYBEL,
      value: "0x0",
      data: tokenContract.methods
        .transferToken(walletAddress, listenCount)
        .encodeABI(),
      nonce: web3.utils.toHex(count),
    };
    const transaction = new Transaction(rawTransaction, {
      common: common as any, // eslint-disable-line
    });
    transaction.sign(bufferedPrivateKey);
    web3.eth.sendSignedTransaction(
      "0x" + transaction.serialize().toString("hex")
    );
    logger.debug(
      `Tx from ${process.env.SYBELPUBK} to ${walletAddress} done !`,
      transaction
    );
  });
}
