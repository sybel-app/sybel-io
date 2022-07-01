import * as functions from "firebase-functions";
import {
  minter,
  fractionCostBadges,
  internalTokens,
  fractionCostBadgesConnected,
} from "./utils/Contract";
import { buildFractionId, BUYABLE_TOKEN_TYPES } from "./utils/SybelMath";
import { BigNumber } from "ethers";
import { SuplyUpdatedEvent } from "./generated-types/SybelInternalTokens";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("0 0 * * 1") // Run every week on monday
    .onRun(async () => {
      // Get our connected badges contract
      const connectedBadgesContract = await fractionCostBadgesConnected();

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

      // Find all the supply updated
      const supplyUpdatedEventFilter = internalTokens.filters.SuplyUpdated();
      const supplyUpdateEvents = await internalTokens.queryFilter(
        supplyUpdatedEventFilter
      );

      // Get the day we will use to compute our period
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
      const podcastMintEvents = await minter.queryFilter(podcastEventFilter);
      for (const mintEvent of podcastMintEvents) {
        const podcastId = mintEvent.args.baseId;
        const timestamp = (await mintEvent.getBlock()).timestamp;

        // Get the difference between the mint date and the current date in day
        const dateDifference = currentDayTimestamp - timestamp;
        const dayDiff = Math.floor(dateDifference / 24 / 60 / 60);

        // Exit if the podcast was minted less than a week ago
        if (dayDiff < 7) {
          functions.logger.debug(
            "The podcast was minted less than a week ago, don't compute his badge"
          );
          continue;
        }

        // Iterate over each buyable fraction type to compute their cost
        for (const tokenType of BUYABLE_TOKEN_TYPES) {
          const fractionId = buildFractionId(podcastId, tokenType);
          functions.logger.debug("Checking the fraction id " + fractionId);

          // Get the current fraction cost
          const currentFractionCost = await fractionCostBadges.getBadge(
            fractionId
          );

          // Filter the supply update event
          const filteredSupplyEvent = supplyUpdateEvents.filter((supplyEvent) =>
            supplyEvent.args.id.eq(fractionId)
          );

          // Filter the minted fraction for the podcast we want
          const filteredFractionMintEvent = fractionMintedEvent.filter(
            (transferEvent) => transferEvent.args.id.eq(fractionId)
          );

          if (filteredFractionMintEvent.length == 0) {
            // If not minted event found, just exit the badge calculation function
            functions.logger.debug(
              "No mint event found for this fraction, don't recompute it's badge"
            );
            continue;
          }

          functions.logger.debug("Finding the block timestamp");
          const mintedFractionCountToTimestampAsync =
            filteredFractionMintEvent.map(
              async (transferEvent) =>
                new FractionCountToTimestamp(
                  transferEvent.args.value,
                  (await transferEvent.getBlock()).timestamp
                )
            );
          functions.logger.debug("Finished to search for the block timestamp");

          const mintedFractionCountToTimestamp = await Promise.all(
            mintedFractionCountToTimestampAsync
          );

          // Extract all the data we need to perform the computation
          const currentWeekFractionMint = countFractionForPeriod(
            mintedFractionCountToTimestamp,
            oneWeekAgoTimestamp,
            currentDayTimestamp
          ).toNumber();
          const oneWeekAgoFractionMint = countFractionForPeriod(
            mintedFractionCountToTimestamp,
            twoWeekAgoTimestamp,
            oneWeekAgoTimestamp
          ).toNumber();
          const twoWeekAgoFractionMint = countFractionForPeriod(
            mintedFractionCountToTimestamp,
            threeWeekAgoTimestamp,
            twoWeekAgoTimestamp
          ).toNumber();
          const currentWeekSuppliedFraction = (
            await countSupplyGivenForPeriod(
              filteredSupplyEvent,
              oneWeekAgoTimestamp,
              currentDayTimestamp
            )
          ).toNumber();

          // Compute the new badge from all the info we gathered
          const newBadge = computeNewBadge(
            currentFractionCost,
            currentWeekFractionMint,
            currentWeekSuppliedFraction,
            oneWeekAgoFractionMint,
            twoWeekAgoFractionMint
          );

          // Send this new badge to the contracts
          const updateTx = await connectedBadgesContract.updateBadge(
            fractionId,
            newBadge
          );
          const updateTxReceipt = await updateTx.wait();
          functions.logger.debug(
            "The badge of the fraction " +
              fractionId +
              " evolved from " +
              currentFractionCost.toNumber() / 1e6 +
              "TSE to " +
              newBadge.toNumber() / 1e6 +
              "TSE, on tx : " +
              updateTxReceipt.blockHash
          );
        }
      }
      functions.logger.info("Finished the podcast badges update");
    });

/**
 * Simple class helping us to check the transfer event fraction per timestamp
 */
class FractionCountToTimestamp {
  /**
   * Constructor
   */
  constructor(readonly count: BigNumber, readonly timestampInSec: number) {}
}

/**
 * Count the number of fraction emitted during the given period
 * @param {FractionCountToTimestamp} fractionToTimestamp The array oto filter
 * @param {number} initialPeriod The initial period
 * @param {number} lastPeriod The last period
 * @return {BigNumber} The number of fraction minted
 */
function countFractionForPeriod(
  fractionToTimestamp: FractionCountToTimestamp[],
  initialPeriod: number,
  lastPeriod: number
): BigNumber {
  const fractionInPeriod = fractionToTimestamp.filter((fractionToTimestamp) =>
    isInPeriod(fractionToTimestamp.timestampInSec, initialPeriod, lastPeriod)
  );
  const fractionMintedInPeriod = fractionInPeriod
    // Then reduce to get the total count
    .reduce(
      (acc, fractionToTimestamp) => acc.add(fractionToTimestamp.count),
      BigNumber.from(0)
    );
  return fractionMintedInPeriod;
}

/**
 * Count the number of fraction emitted during the given period
 * @param {SuplyUpdatedEvent[]} supplyUpdatedEvents The array of supply updated event to check for
 * @param {number} initialPeriod The initial period
 * @param {number} lastPeriod The last period
 * @return {BigNumber} The number of token supplied
 */
async function countSupplyGivenForPeriod(
  supplyUpdatedEvents: SuplyUpdatedEvent[],
  initialPeriod: number,
  lastPeriod: number
): Promise<BigNumber> {
  let freshSupply = BigNumber.from(0);
  for (const supplyUpdatedEvent of supplyUpdatedEvents) {
    const timestamp = (await supplyUpdatedEvent.getBlock()).timestamp;
    if (isInPeriod(timestamp, initialPeriod, lastPeriod)) {
      freshSupply = freshSupply.add(supplyUpdatedEvent.args.supply);
    }
  }

  return freshSupply;
}

/**
 * Check if the given timestamp is in the given period
 * @param {number} timestamp the timestamp to check
 * @param {number} initialPeriod the start of the period to check for
 * @param {number} lastPeriod the end of the period to check for
 * @return {boolean} if the given timestamp is in the period
 */
function isInPeriod(
  timestamp: number,
  initialPeriod: number,
  lastPeriod: number
): boolean {
  return timestamp >= initialPeriod && timestamp < lastPeriod;
}

/**
 * Compute the new cost badge from all the required parameter
 * @param {BigNumber} previousBadgeCost
 * @param {BigNumber} thisWeekMintAmount
 * @param {BigNumber} thisWeekSuppliedAmount
 * @param {BigNumber} oneWeekAgoMintAmount
 * @param {BigNumber} twoWeekAgoMintAmount
 * @return  {BigNumber} The new cost badge
 */
function computeNewBadge(
  previousBadgeCost: BigNumber,
  thisWeekMintAmount: number,
  thisWeekSuppliedAmount: number,
  oneWeekAgoMintAmount: number,
  twoWeekAgoMintAmount: number
): BigNumber {
  let exponentPart = 0.3;
  if (oneWeekAgoMintAmount > 0 && twoWeekAgoMintAmount > 0) {
    exponentPart = exponentPart + oneWeekAgoMintAmount / twoWeekAgoMintAmount;
  }
  functions.logger.info("exponent is " + exponentPart);

  let multiplicationPart = 0.5;
  if (thisWeekMintAmount > 0 && thisWeekSuppliedAmount > 0) {
    multiplicationPart =
      multiplicationPart + thisWeekMintAmount / thisWeekSuppliedAmount;
  }
  functions.logger.info("multiplier is " + multiplicationPart);

  return BigNumber.from(
    Math.floor(
      previousBadgeCost.toNumber() * Math.pow(multiplicationPart, exponentPart)
    )
  );
}
