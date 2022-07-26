import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { checkCallData } from "../utils/Security";
import { buildFractionId, BUYABLE_TOKEN_TYPES } from "../utils/SybelMath";
import { fractionCostBadges, internalTokens } from "../utils/Contract";
import { BigNumber } from "ethers";

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

      // Extract the podcast id
      const podcastId = request.seriesId;
      if (!podcastId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "No series id passed as param, waiting for a 'seriesId'"
        );
      }

      // Get the minted podcast matching the series id
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const mintedPodcastDocsSnapshot = await mintCollection
        .where("fractionBaseId", "!=", null)
        .where("seriesId", "==", podcastId)
        .get();
      if (mintedPodcastDocsSnapshot.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          `Unable to found a minted podcast for the id ${podcastId}`
        );
      }
      // Extract it from our db snapshot
      let mintedPodcast: MintedPodcastDbDto;
      mintedPodcastDocsSnapshot.forEach(
        (mintedPodcastDoc) =>
          (mintedPodcast = mintedPodcastDoc.data() as MintedPodcastDbDto)
      );

      // Get te fractions supply and cost
      const fractionsAsync = BUYABLE_TOKEN_TYPES.map(async (tokenType) => {
        const fractionId = buildFractionId(
          BigNumber.from(mintedPodcast.fractionBaseId),
          tokenType
        );
        const remainingSupply = await internalTokens.supplyOf(fractionId);
        const rawCost = await fractionCostBadges.getBadge(fractionId);
        return {
          id: fractionId.toNumber(),
          type: tokenType,
          supply: remainingSupply.toNumber(),
          cost: rawCost.toNumber() / 1e18,
        };
      });
      const fractions = await Promise.all(fractionsAsync);

      // Return our freshly built object
      return fractions;
    });
