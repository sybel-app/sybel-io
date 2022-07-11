import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import WalletDbDto from "../types/db/WalletDbDto";
import { rewarder, rewarderConnected } from "./Contract";
import ListenAnalyticsDbDto from "../types/db/ListenAnalyticsDbDto";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { DocumentData } from "@firebase/firestore";

// Firebase logger
const logger = functions.logger;

// Access our database
const db = admin.firestore();
const analyticsCollection = db.collection("listeningAnalytics");
const mintedPodactCollection = db.collection("mintedPodcast");

/**
 * Count the number of listen for a given wallet, matching the db properties
 * @param {WalletDbDto} wallet The wallet to count listen and pay
 * @param {string} paymentProperties The payment boolean properties to check in database
 */
export async function countListenAndPayWallet(
  wallet: WalletDbDto
): Promise<string | null> {
  // Get all the listen perform by this user and not payed
  const userListenQuerySnapshot = await analyticsCollection
    .where("userId", "==", wallet.id)
    .where("givenToUser", "!=", true) // Reward not handled yet
    .where("rewardTxHash", "==", null) // And tx not sent
    .get();
  const userListenDocuments: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>[] =
    [];
  userListenQuerySnapshot.forEach((doc) => {
    userListenDocuments.push(doc);
  });
  logger.debug(
    `Found ${userListenDocuments.length} listen not yet payed for the user ${wallet.id}`
  );

  // If the user havn't perform any listen operation, exit directly
  if (userListenDocuments.length == 0) {
    return null;
  }

  // Get the list of all the known minted podcast
  const allMintedPodcastSnapshot = await mintedPodactCollection.get();
  const mintedPodcasts: MintedPodcastDbDto[] = [];
  allMintedPodcastSnapshot.forEach((doc) => {
    mintedPodcasts.push(doc.data() as MintedPodcastDbDto);
  });
  logger.debug(`Found ${mintedPodcasts.length} minted podcasts`);

  // Save an array of all the document we handled
  const handledDocument: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>[] =
    [];

  // Reduce it to extract only a map of series id to listen count
  const podcastIdToListenCountMap = userListenDocuments.reduce((acc, value) => {
    const listenAnalitycs = value.data() as ListenAnalyticsDbDto;
    // Check if that podcast is minted or not (if not, don't count his listen)
    const matchingMintedPodcast = mintedPodcasts.find(
      (mintedPodcast) => mintedPodcast.seriesId == listenAnalitycs.seriesId
    );
    if (!matchingMintedPodcast || !matchingMintedPodcast.fractionBaseId) {
      // If the podcast wasn't minted, don't include it in our map
      return acc;
    }
    // Save the fact that we handled this document
    handledDocument.push(value);

    // Otherwise, increment the current listen count on this podcast
    let currentListenCount = acc.get(matchingMintedPodcast.fractionBaseId);
    if (!currentListenCount) {
      currentListenCount = 0;
    }
    acc.set(matchingMintedPodcast.fractionBaseId, currentListenCount + 1);
    return acc;
  }, new Map<number, number>());

  // If we didn't found any minted podcast, exit directly
  if (podcastIdToListenCountMap.size <= 0) {
    logger.info("No minted podcast found for the user, exiting directly");
    return null;
  }

  // Build the array we will send to the smart contract
  const podcastIds: number[] = [];
  const listenCounts: number[] = [];
  podcastIdToListenCountMap.forEach((podcastId, listenCount) => {
    podcastIds.push(podcastId);
    listenCounts.push(listenCount);
  });
  logger.debug(
    `Found ${podcastIdToListenCountMap.size} podcast to on which the user perform some listen to be payed`
  );

  // Try to pay him
  try {
    // Launch the transaction and wait for the receipt
    const rewarderSigned = await rewarderConnected();
    const paymentTx = await rewarderSigned.payUser(
      wallet.address,
      podcastIds,
      listenCounts
    );

    logger.debug(
      `Payed the used ${wallet.id} with success, on the tx hash ${paymentTx.hash}`
    );

    // Update all the handled analytics row
    const batch = db.batch();
    handledDocument.map(async (each) => {
      batch.update(each.ref, "rewardTxHash", paymentTx.hash);
    });
    batch.commit();

    // Then send back the payment tx
    return paymentTx.hash;
  } catch (exception: unknown) {
    logger.warn(`Error when paying the user ${wallet.id}`, exception);
    return null;
  }
}
