import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import Wallet from "../model/Wallet";

const db = admin.firestore();
const logger = functions.logger;

/**
 * Get the wallet (or null if not found) for the given user
 * @param {string} userId The user for which we are searching the wallet
 * @return {Wallet | null} The wallet found or null
 */
export async function getWalletForUser(userId: string): Promise<Wallet | null> {
  try {
    logger.debug(`Try to get the wallet for the user ${userId}`);
    // Access our wallet collection
    const collection = db.collection("wallet");
    const document: Wallet[] = [];
    // Execute the query
    const snapshot = await collection.where("id", "==", userId).limit(1).get();
    // Find document and map it
    // TODO : Better way to do that ?
    snapshot.forEach((doc) => document.push(doc.data() as Wallet));
    if (document.length >= 1) {
      return document[0];
    } else {
      return null;
    }
  } catch (exception) {
    logger.warn("Error when searching for the user wallet", exception);
    return null;
  }
}

/**
 * Get the wallet's for all the given users
 * @param {Set<string>} userIdSet The list of id for which we want the wallet's
 * @return {Set<Wallet>} all the wallet found
 */
export async function getWalletForUserSet(
  userIdSet: Set<string>
): Promise<Set<Wallet>> {
  try {
    logger.debug(`Try to get the wallet's for the user ${userIdSet}`);
    // Access our wallet collection
    const collection = db.collection("wallet");
    const foundWallets = new Set<Wallet>();
    // Execute the query
    const snapshot = await collection
      .where("id", "in", Array.from(userIdSet))
      .limit(1)
      .get();
    // Find document and map them
    snapshot.forEach((doc) => foundWallets.add(doc.data() as Wallet));
    return foundWallets;
  } catch (exception) {
    logger.warn("Error when searching for the user wallet", exception);
    return new Set();
  }
}
