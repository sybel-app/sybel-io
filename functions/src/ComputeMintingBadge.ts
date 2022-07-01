import * as functions from "firebase-functions";
import {
  minter,
  fractionCostBadges,
  internalTokens,
  fractionCostBadgesConnected,
} from "./utils/Contract";
import { buildFractionId, BUYABLE_TOKEN_TYPES } from "./utils/SybelMath";
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
      const currentWeekPeriod = new TimestampPeriod(
        oneWeekAgoTimestamp,
        currentDayTimestamp
      );
      const lastWeekPeriod = new TimestampPeriod(
        twoWeekAgoTimestamp,
        oneWeekAgoTimestamp
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

          // TODO : Should store the block number each time we perform this cron, this will prevent multiple call on getBlock().timestamp that is resources effective, and permit us to save on firebase cost and on infura cost
          // Map each mint event to it's event with a timestamp
          const mintedFractionCountToTimestampAsync =
            filteredFractionMintEvent.map(
              async (transferEvent) =>
                new FractionCountToTimestamp(
                  transferEvent.args.value,
                  (await transferEvent.getBlock()).timestamp
                )
            );

          const mintedFractionCountToTimestamp = await Promise.all(
            mintedFractionCountToTimestampAsync
          );

          // Extract all the data we need to perform the computation
          const fractionMintedForCostBadges = countFractionForPeriod(
            mintedFractionCountToTimestamp,
            currentWeekPeriod,
            lastWeekPeriod
          );
          const totalFractionSuppliedAmount = filteredSupplyEvent.reduce(
            (acc, supplyEvent) => acc + supplyEvent.args.supply.toNumber(),
            0
          );

          // Compute the new badge from all the info we gathered
          const newBadge = computeNewBadge(
            currentFractionCost,
            totalFractionSuppliedAmount,
            fractionMintedForCostBadges
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
 * Simple class helping us to check for a timestamp period
 */
class TimestampPeriod {
  /**
   * Constructor
   */
  constructor(readonly start: number, readonly end: number) {}

  /**
   * Check if a timestamp is in the given period
   * @param {number} timestamp
   * @return {boolean}
   */
  isInPeriod(timestamp: number): boolean {
    return timestamp >= this.start && timestamp < this.end;
  }
}

/**
 * Get the number of fraction minted for the cost badges, with the total, the one for the current and last week
 */
class FractionMintedForCostBadges {
  /**
   * Constructor
   */
  constructor(
    readonly total: number,
    readonly currentWeek: number,
    readonly lastWeek: number
  ) {}
}

/**
 * Count the number of fraction emitted during the given period
 * @param {FractionCountToTimestamp} fractionToTimestamps The array oto filter
 * @param {TimestampPeriod} currenWeekPeriod The initial period
 * @param {TimestampPeriod} lastWeekPeriod The last period
 * @return {FractionMintedForCostBadges} The number of fraction minted
 */
function countFractionForPeriod(
  fractionToTimestamps: FractionCountToTimestamp[],
  currenWeekPeriod: TimestampPeriod,
  lastWeekPeriod: TimestampPeriod
): FractionMintedForCostBadges {
  let totalAcc = 0;
  let currentWeekAcc = 0;
  let lastWeekAcc = 0;

  for (const fractionToTimestamp of fractionToTimestamps) {
    totalAcc += fractionToTimestamp.count.toNumber();
    if (currenWeekPeriod.isInPeriod(fractionToTimestamp.timestampInSec)) {
      currentWeekAcc += fractionToTimestamp.count.toNumber();
    } else if (lastWeekPeriod.isInPeriod(fractionToTimestamp.timestampInSec)) {
      lastWeekAcc += fractionToTimestamp.count.toNumber();
    }
  }

  return new FractionMintedForCostBadges(totalAcc, currentWeekAcc, lastWeekAcc);
}

/**
 * Compute the new cost badge from all the required parameter
 * @param {BigNumber} previousBadgeCost
 * @param {BigNumber} totalSuppliedAmount
 * @param {FractionMintedForCostBadges} fractionMintedForCostBadges
 * @return  {BigNumber} The new cost badge
 */
function computeNewBadge(
  previousBadgeCost: BigNumber,
  totalSuppliedAmount: number,
  fractionMintedForCostBadges: FractionMintedForCostBadges
): BigNumber {
  let exponentPart = 0.3;
  if (
    fractionMintedForCostBadges.currentWeek > 0 &&
    fractionMintedForCostBadges.lastWeek > 0
  ) {
    exponentPart +=
      fractionMintedForCostBadges.currentWeek /
      fractionMintedForCostBadges.lastWeek;
  }

  let multiplicationPart = 0.5;
  if (fractionMintedForCostBadges.total > 0 && totalSuppliedAmount > 0) {
    multiplicationPart +=
      fractionMintedForCostBadges.total / totalSuppliedAmount;
  }

  return BigNumber.from(
    Math.floor(
      previousBadgeCost.toNumber() * Math.pow(multiplicationPart, exponentPart)
    )
  );
}
