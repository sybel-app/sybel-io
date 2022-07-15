import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import WalletDbDto from "../types/db/WalletDbDto";
import { rewarderConnected } from "./Contract";
import ListenAnalyticsDbDto from "../types/db/ListenAnalyticsDbDto";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { DocumentData } from "@firebase/firestore";
import { ConsumedContentDbDto } from "../types/db/ConsumedContentDbDto";

// Firebase logger
const logger = functions.logger;

// Access our database
const db = admin.firestore();
const analyticsCollection = db.collection("listeningAnalytics");
const mintedPodactCollection = db.collection("mintedPodcast");
const ccuCollection = db.collection("consumedContentUnit");

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

  // Save an array of all the document we handled
  const handledDocument: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>[] =
    [];

  // Reduce it to extract only a map of series id to listen count
  let minTimestamp = 0;
  let maxTimestamp = 0;
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

    // Check the timestamp
    if (!minTimestamp || listenAnalitycs.date.toMillis() < minTimestamp) {
      minTimestamp = listenAnalitycs.date.toMillis();
    }
    if (!maxTimestamp || listenAnalitycs.date.toMillis() > maxTimestamp) {
      maxTimestamp = listenAnalitycs.date.toMillis();
    }

    // Otherwise, increment the current listen count on this podcast
    let currentListenCount = acc.get(matchingMintedPodcast.fractionBaseId);
    if (!currentListenCount) {
      currentListenCount = 0;
    }
    acc.set(matchingMintedPodcast.fractionBaseId, currentListenCount + 1);
    return acc;
  }, new Map<number, number>());

  // Build the array we will send to the smart contract
  const podcastIds: number[] = [];
  const listenCounts: number[] = [];
  podcastIdToListenCountMap.forEach((listenCount, podcastId) => {
    podcastIds.push(podcastId);
    listenCounts.push(listenCount);
  });
  logger.debug(
    `Found ${podcastIdToListenCountMap.size} podcast to on which the user perform some listen to be payed`
  );

  // If we didn't found any minted podcast, exit directly
  if (podcastIds.length <= 0) {
    logger.info("No minted podcast found for the user, exiting directly");
    return null;
  }

  // Try to pay him
  try {
    // Launch the transaction and wait for the receipt
    const rewarderSigned = await rewarderConnected();
    logger.debug(
      `Paying the user ${wallet.id} on the address ${wallet.address} for the podcast ids ${podcastIds} for listens ${listenCounts}`,
      podcastIds,
      listenCounts
    );

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

    // Save the number of consumed content for this user
    const totalListenCount = listenCounts.reduce(
      (acc, value) => (acc += value)
    );
    // Increment the ccu for this user
    const userCcu = await ccuCollection.where("userId", "==", wallet.id).get();
    if (userCcu.empty) {
      // Build the initial ccu for this user
      await ccuCollection.add({
        userId: wallet.id,
        currentWeekCcu: totalListenCount,
        ccuPerWeeks: [],
      });
    } else {
      // Otherwise, update it
      const currentCcuDoc = userCcu.docs[0];
      const currentCcu = currentCcuDoc.data() as ConsumedContentDbDto;
      await currentCcuDoc.ref.update({
        currentWeekCcu: currentCcu.currentWeekCcu + totalListenCount,
      });
    }

    // Then send back the payment tx
    return paymentTx.hash;
  } catch (exception: unknown) {
    logger.warn(`Error when paying the user ${wallet.id}`, exception);
    return null;
  }
}
