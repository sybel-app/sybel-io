import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import Transaction from "ethereumjs-tx/dist/transaction";
import Common, { CustomChain } from "@ethereumjs/common";
import abi from "../abi.json";
import Wallet from "../model/Wallet";

// Import web3
const web3 = new Web3(process.env.NODE || "http://localhost:3000/");
const common = Common.custom(CustomChain.PolygonMumbai);

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
  try {
    const tokenContract = new web3.eth.Contract(
      abi as AbiItem[],
      process.env.SYBEL
    );
    const bufferedPrivateKey = Buffer.from(process.env.SYBELPRIVK || "", "hex");
    const count = await web3.eth.getTransactionCount(
      process.env.SYBELPUBK || ""
    );
    // Create the transaction
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

    // Build the transaction object and sign it
    const transaction = new Transaction(rawTransaction, {
      common: common as any, // eslint-disable-line
    });
    transaction.sign(bufferedPrivateKey);

    // Send it to the blockchain and wait for the receipt
    const receipt = await web3.eth.sendSignedTransaction(
      "0x" + transaction.serialize().toString("hex")
    );
    logger.debug(
      `Tx from ${process.env.SYBELPUBK} to ${walletAddress} done !`,
      transaction,
      receipt
    );

    // Return the status of the transaction
    return receipt.status;
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
