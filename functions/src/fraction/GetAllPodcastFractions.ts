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

      // Get all the minted podcast
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const mintedPodcastDocsSnapshot = await mintCollection
        .where("fractionBaseId", "!=", null)
        .get();
      const mintedPodcasts: MintedPodcastDbDto[] = [];
      mintedPodcastDocsSnapshot.forEach((mintedPodcastDoc) =>
        mintedPodcasts.push(mintedPodcastDoc.data() as MintedPodcastDbDto)
      );

      // Then, for each minted podcast, find the buyable fractions and their costs
      const filledPodcastsAsyncs = mintedPodcasts.map(async (mintedPodcast) => {
        // Get te fractions supply and cost
        const fractionsAsync = BUYABLE_TOKEN_TYPES.map(async (tokenType) => {
          const fractionId = buildFractionId(
            BigNumber.from(mintedPodcast.fractionBaseId),
            tokenType
          );
          const remainingSupply = await internalTokens.supplyOf(fractionId);
          const rawCost = await fractionCostBadges.getBadge(fractionId);
          return {
            id: fractionId,
            type: tokenType,
            supply: remainingSupply,
            cost: rawCost.toNumber() / 1e6,
          };
        });
        const fractions = await Promise.all(fractionsAsync);

        // Then return an object with the podcast info and the fractions
        return {
          ...mintedPodcast,
          fractions: fractions,
        };
      });

      const filledPodcasts = await Promise.all(filledPodcastsAsyncs);

      // Return our freshly built object
      return filledPodcasts;
    });
