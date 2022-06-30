import * as functions from "firebase-functions";
import cors from "cors";
import {
  tseToken,
  minter,
  fractionCostBadges,
  internalTokens,
} from "./utils/Contract";
import { buildFractionId, BUYABLE_TOKEN_TYPES } from "./utils/SybelMath";
import { ethers, utils } from "ethers";
import { TransferSingleEvent } from "./generated-types/SybelInternalTokens";

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
        // Find all the minted event
        const transferEventFilter = internalTokens.filters.TransferSingle(
          null,
          "0x0000000000000000000000000000000000000000",
          null,
          null,
          null
        );
        const fractionMintedEvent = await internalTokens.queryFilter(
          transferEventFilter
        );

        const currentDayTimestamp = Math.floor(Date.now() / 1000);
        const weekDurationInSec = 7 * 24 * 60 * 60;
        const oneWeekAgoTimestamp = Math.floor(
          currentDayTimestamp - weekDurationInSec
        );
        const twoWeekAgoTimestamp = Math.floor(
          oneWeekAgoTimestamp - weekDurationInSec
        );
        const threeWeekAgoTimestamp = Math.floor(
          twoWeekAgoTimestamp - weekDurationInSec
        );

        // Iterate over each podcast to find the right values for the badges computation
        const podcastEventFilter = minter.filters.PodcastMinted();
        const costUpdaterPromise = (
          await minter.queryFilter(podcastEventFilter)
        ).map(async (mintEvent) => {
          const timestamp = (await mintEvent.getBlock()).timestamp;

          // Get the difference between the mint date and the current date in day
          const dateDifference = currentDayTimestamp - timestamp;
          const dayDiff = Math.floor(dateDifference / 24 / 60 / 60);

          // TODO The diff should be based on the mint or the last badge update event, to create

          // Exit if the podcast was minted less than a week ago
          if (dayDiff < 7) {
            functions.logger.debug(
              "The podcast was minted less than a week ago, don't compute his badge"
            );
            return;
          }

          const podcastId = mintEvent.args.baseId;

          // Iterate over each buyable fraction type to compute their cost
          BUYABLE_TOKEN_TYPES.forEach(async (tokenType) => {
            const fractionId = buildFractionId(podcastId, tokenType);

            // Get the current fraction cost
            const currentFractionCost = await fractionCostBadges.getBadge(
              fractionId
            );
            functions.logger.debug(
              "current fraction cost " + currentFractionCost.toNumber() / 1e6
            );

            // Filter the minted fraction for the podcast we want
            const filteredFractionMintEvent = fractionMintedEvent.filter(
              (transferEvent) => transferEvent.args.id.eq(fractionId)
            );
            functions.logger.debug(
              "Founded " +
                filteredFractionMintEvent.length +
                " mint event on fraction id " +
                fractionId
            );

            if (filteredFractionMintEvent.length == 0) {
              // If not minted event found, just exit the badge calculation function
              return;
            }

            // What param should we get
            // Current price -> Done

            // Number of fraction minted this week
            // Number of fraction minted last week
            // Number of fraction minted last last week

            // Number of fraction supplied this week -> How to find that ? Custom event ? Or check if podcast is freshly minted and base ourseulf on that ?
          });

          // Await for all the cost updated to complete
          await Promise.all(costUpdaterPromise);
          // And send the response
          response.status(200).send();
        });
      });
    });
