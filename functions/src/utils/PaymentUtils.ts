import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ethers } from "ethers";
import { Rewarder__factory } from "../generated-types";
import Wallet from "../model/Wallet";

// Firebase logger
const logger = functions.logger;

// Access our database
const db = admin.firestore();
const analyticsCollection = db.collection("listeningAnalytics");

/**
 * Pay a wallet for a given number of liste,
 * @param {string} walletAddress the wallet address to pay
 * @param {number} listenCount the number of listen to pay
 * @return {boolean} true if the payment was a success, false otherwise
 */
export async function payWallet(
  walletAddress: string,
  listenCount: number
): Promise<boolean> {
  if (listenCount <= 0) {
    logger.debug("No listen perform, so no payment to be done");
    return false;
  }
  try {
    // Build our provider
    const provider = new ethers.providers.JsonRpcProvider(process.env.SYBEL);
    // Find our rewarder contract
    const rewarderContract = Rewarder__factory.connect("address", provider);
    // Ask him to pay the user
    // TODO : Should have listener id, list of podcast id and listen of listen count
    // TODO : Should have the sybel priv key account to perform the signing
    const paymentTx = await rewarderContract.payUser(walletAddress, [], []);

    logger.debug(
      `Payment transaction for user ${walletAddress} done, payment data ${paymentTx.data} on block  ${paymentTx.blockNumber} : ${paymentTx.blockHash} !`,
      paymentTx
    );

    return true;
  } catch (exception) {
    logger.warn("Error when paying the wallet " + walletAddress, exception);
    return false;
  }
}

/**
 * Count the number of listen for a given wallet, matching the db properties
 * @param {Wallet} wallet The wallet to count listen and pay
 * @param {string} idProperties The wallet id properties to check for in the database
 * @param {string} paymentProperties The payment boolean properties to check in database
 */
export async function countListenAndPayWallet(
  wallet: Wallet,
  idProperties: string,
  paymentProperties: string
) {
  // Count the number of wallet for this owner
  const countSnapshot = await analyticsCollection
    .where(idProperties, "==", wallet.id)
    .where(paymentProperties, "!=", true)
    .get();
  const countLog: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] =
    [];
  countSnapshot.forEach((doc) => countLog.push(doc));

  // Pay him
  const isPaymentsuccess = await payWallet(wallet.address, countLog.length);

  // If the payment was a success, update his pending owner transaction
  if (isPaymentsuccess) {
    logger.debug(
      `Payed the used ${wallet.id} for props ${idProperties} with success, update all his analytics row`
    );
    // Update all the row we counted
    const batch = db.batch();
    countLog.map(async (each) => {
      batch.update(each.ref, paymentProperties, true);
    });
    batch.commit();
  } else {
    logger.debug(`Unable to pay the owner ${wallet.id}`);
  }
}
