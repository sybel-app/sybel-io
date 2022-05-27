import Wallet from "./model/Wallet";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const db = admin.firestore();
const logger = functions.logger;

/**
 * Get the wallet (or null if not found) for the given user
 * @param userId The user for which we are searching the wallet
 * @returns The wallet found or null
 */
export async function getWalletForUser(userId: String): Promise<Wallet | null> {
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

// Chunk an array into a given size (so for [1, 2, 3, 4] chunked by 2 it will give us [[1, 2], [3, 4]])
export function sliceIntoChunks(arr: Array<any>, chunkSize: number) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}
