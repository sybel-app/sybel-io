import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { checkCallData } from "../utils/Security";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onCall(async (request): Promise<unknown> => {
      checkCallData(request);

      // Extract the param and ensure we got it
      const seriesId = request.seriesId;
      if (!seriesId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      // Ensure this podcast wasn't previously minted
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const mintedPodcastWithSameId = await mintCollection
        .where("series", "==", request.seriesId)
        .get();
      if (mintedPodcastWithSameId.size <= 0) {
        throw new functions.https.HttpsError(
          "not-found",
          `The podcast with id ${request.seriesId} wasn't minted yet`
        );
      }

      const mintedPodcast =
        mintedPodcastWithSameId.docs[0].data() as MintedPodcastDbDto;

      return {
        transactionHash: mintedPodcast.txHash,
        blockHash: mintedPodcast.txBlockHash,
        blockNumber: mintedPodcast.txBlockNumber,
        mintId: mintedPodcast.fractionBaseId,
        metadatas: mintedPodcast.uploadedMetadatas,
      };
    });
