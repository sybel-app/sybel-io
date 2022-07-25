import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  fractionCostBadges,
  internalTokens,
  fractionCostBadgesConnected,
} from "../utils/Contract";
import { buildFractionId, BUYABLE_TOKEN_TYPES } from "../utils/SybelMath";
import { BigNumber, ContractTransaction, utils } from "ethers";
import MintedPodcastDbDto, {
  CostBadgeUpdatePeriod,
} from "../types/db/MintedPodcastDbDto";
import { TransferSingleEvent } from "../generated-types/SybelInternalTokens";

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
      functions.logger.info("Started the fraction cost badges update");
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

      // List of transaction we should wait for
      const txToWaitFor: ContractTransaction[] = [];

      // Get the last week date
      const now = new Date();
      const twoWeekAgoDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 14
      );

      // Get all the minted podcast
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const mintedPodcastSnapshot = await mintCollection
        .where(
          "txBlockTimestamp",
          "<=",
          admin.firestore.Timestamp.fromDate(twoWeekAgoDate)
        ) // Get only the podcast minted more than two week ago (otherwise we can't compute properly their badges)
        .get();
      const mintedPodcastDocs: admin.firestore.QueryDocumentSnapshot[] = [];
      mintedPodcastSnapshot.forEach((doc) => mintedPodcastDocs.push(doc));

      // Iterate over each podcast to find the right values for the badges computation
      for (const mintedPodcastDoc of mintedPodcastDocs) {
        // Extract podcast info and podcast id
        const mintedPodcast: MintedPodcastDbDto =
          mintedPodcastDoc.data() as MintedPodcastDbDto;

        const podcastId = mintedPodcast.fractionBaseId;
        if (!podcastId) {
          continue;
        }

        // Get the period for this podcast (can be null if not minted before and if first run)
        let lastWeekBlockPeriod: BlockPeriod | undefined;
        let currentWeekBlockPeriod: BlockPeriod | undefined;
        if (mintedPodcast.previousCostUpdate) {
          lastWeekBlockPeriod = {
            start:
              mintedPodcast.previousCostUpdate.period.currentWeekBlockStart,
            end: mintedPodcast.previousCostUpdate.period.currentWeekBlockEnd,
          };
          currentWeekBlockPeriod = {
            start: mintedPodcast.previousCostUpdate.period.currentWeekBlockEnd,
          };
        }

        // List of transaction we should wait for
        const podcastTx: ContractTransaction[] = [];

        // Iterate over each buyable fraction type to compute their cost
        for (const tokenType of BUYABLE_TOKEN_TYPES) {
          const fractionId = buildFractionId(
            BigNumber.from(podcastId),
            tokenType
          );
          functions.logger.debug(
            `Checking the fraction id ${fractionId} of the podcast ${mintedPodcast.seriesId}`
          );

          // Get the current fraction cost
          const currentFractionCost = await fractionCostBadges.getBadge(
            fractionId
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

          let fractionMintedForCostBadges: FractionMintedForCostBadges;
          if (lastWeekBlockPeriod && currentWeekBlockPeriod) {
            // In the case this cost badge was already minted, base ourself on the block numbers
            fractionMintedForCostBadges = countFractionForBlockPeriod(
              filteredFractionMintEvent,
              lastWeekBlockPeriod,
              currentWeekBlockPeriod
            );
          } else {
            // Otherwise, we will need the timestamp of each block, so fetch them
            const mintedFractionCountToTimestampAsync =
              filteredFractionMintEvent.map(async (transferEvent) => {
                return {
                  count: transferEvent.args.value,
                  timestampInSec: (await transferEvent.getBlock()).timestamp,
                  blockNumber: transferEvent.blockNumber,
                };
              });
            const mintedFractionCountToTimestamp = await Promise.all(
              mintedFractionCountToTimestampAsync
            );

            // And save the count
            fractionMintedForCostBadges = countFractionForPeriod(
              mintedFractionCountToTimestamp,
              currentWeekPeriod,
              lastWeekPeriod
            );
          }

          // Get the number of supply of this fraction
          const totalFractionSuppliedAmount = await internalTokens.supplyOf(
            fractionId
          );

          // Compute the new badge from all the info we gathered
          const newBadge = computeNewBadge(
            currentFractionCost,
            totalFractionSuppliedAmount.toNumber(),
            fractionMintedForCostBadges
          );

          // Update the block period used for this podcast
          lastWeekBlockPeriod = {
            start: fractionMintedForCostBadges.period.lastWeekBlockStart,
            end: fractionMintedForCostBadges.period.currentWeekBlockStart,
          };
          currentWeekBlockPeriod = {
            start: fractionMintedForCostBadges.period.currentWeekBlockStart,
            end: fractionMintedForCostBadges.period.currentWeekBlockEnd,
          };

          // Send this new badge to the contracts
          const updateTx = await connectedBadgesContract.updateBadge(
            fractionId,
            newBadge
          );
          txToWaitFor.push(updateTx);
          utils.formatEther;
          functions.logger.debug(
            "The badge of the fraction " +
              fractionId +
              " evolved from " +
              currentFractionCost.toNumber() / 1e18 +
              "TSE to " +
              newBadge.toNumber() / 1e18 +
              "TSE on the tx " +
              updateTx.hash
          );
          // We should update our cost update object to save the block number and the tx hash
        }

        // Update the minted podcast db dto to store the period
        if (lastWeekBlockPeriod && currentWeekBlockPeriod) {
          await mintedPodcastDoc.ref.update({
            previousCostUpdate: {
              period: {
                lastWeekBlockStart: lastWeekBlockPeriod.start,
                currentWeekBlockStart: currentWeekBlockPeriod.start,
                currentWeekBlockEnd: currentWeekBlockPeriod.end,
              },
              txHashes: podcastTx.map((tx) => tx.hash),
            },
          });
        }
      }

      // Wait for all the tx to be done
      const txPromises = txToWaitFor.map(async (contractTx) => {
        const txReceipt = await contractTx.wait();
        functions.logger.debug(
          `Tx ${txReceipt.blockHash} mined with success on the block ${txReceipt.blockHash}`
        );
      });
      await Promise.all(txPromises);

      functions.logger.info("Finished the fraction cost badges update");
    });

/**
 * Simple class helping us to check the transfer event fraction per timestamp
 */
interface FractionCountToTimestamp {
  readonly count: BigNumber;
  readonly timestampInSec: number;
  readonly blockNumber: number;
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

interface BlockPeriod {
  readonly start: number;
  readonly end?: number;
}

/**
 * Check if the given block number is inside the given block period
 * @param {BlockPeriod} blockPeriod
 * @param {number} block
 * @return {boolean}
 */
function isInBlockPeriod(blockPeriod: BlockPeriod, block: number): boolean {
  if (blockPeriod.end) {
    return block >= blockPeriod.start && block < blockPeriod.end;
  } else {
    return block >= blockPeriod.start;
  }
}

/**
 * Get the number of fraction minted for the cost badges, with the total, the one for the current and last week
 */
interface FractionMintedForCostBadges {
  readonly total: number;
  readonly currentWeek: number;
  readonly lastWeek: number;
  readonly period: CostBadgeUpdatePeriod;
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

  const lastWeekBlockNumbers: number[] = [];
  const currentWeekBlockNumbers: number[] = [];

  // Compute the accumulation and find the block numbers
  for (const fractionToTimestamp of fractionToTimestamps) {
    totalAcc += fractionToTimestamp.count.toNumber();
    if (currenWeekPeriod.isInPeriod(fractionToTimestamp.timestampInSec)) {
      currentWeekAcc += fractionToTimestamp.count.toNumber();
      currentWeekBlockNumbers.push(fractionToTimestamp.blockNumber);
    } else if (lastWeekPeriod.isInPeriod(fractionToTimestamp.timestampInSec)) {
      lastWeekAcc += fractionToTimestamp.count.toNumber();
      lastWeekBlockNumbers.push(fractionToTimestamp.blockNumber);
    }
  }

  // Ensure we got some values in our arrays
  if (lastWeekBlockNumbers.length == 0) {
    lastWeekBlockNumbers.push(0);
  }
  if (currentWeekBlockNumbers.length == 0 && lastWeekBlockNumbers.length != 0) {
    currentWeekBlockNumbers.push(Math.max(...lastWeekBlockNumbers));
  } else if (currentWeekBlockNumbers.length == 0) {
    currentWeekBlockNumbers.push(0);
  }

  return {
    total: totalAcc,
    currentWeek: currentWeekAcc,
    lastWeek: lastWeekAcc,
    period: {
      lastWeekBlockStart: Math.min(...lastWeekBlockNumbers),
      currentWeekBlockStart: Math.min(...currentWeekBlockNumbers),
      currentWeekBlockEnd: Math.max(...currentWeekBlockNumbers),
    },
  };
}

/**
 * Count the number of fraction emitted during the given period
 * @param {FractionCountToTimestamp} fractionToTimestamps The array oto filter
 * @param {TimestampPeriod} currenWeekPeriod The initial period
 * @param {TimestampPeriod} lastWeekPeriod The last period
 * @return {FractionMintedForCostBadges} The number of fraction minted
 */
function countFractionForBlockPeriod(
  fractionToTimestamps: TransferSingleEvent[],
  currenWeekPeriod: BlockPeriod,
  lastWeekPeriod: BlockPeriod
): FractionMintedForCostBadges {
  let totalAcc = 0;
  let currentWeekAcc = 0;
  let lastWeekAcc = 0;

  const lastWeekBlockNumbers: number[] = [];
  const currentWeekBlockNumbers: number[] = [];

  for (const fractionToTimestamp of fractionToTimestamps) {
    totalAcc += fractionToTimestamp.args.value.toNumber();
    if (isInBlockPeriod(currenWeekPeriod, fractionToTimestamp.blockNumber)) {
      currentWeekAcc += fractionToTimestamp.args.value.toNumber();
      currentWeekBlockNumbers.push(fractionToTimestamp.blockNumber);
    } else if (
      isInBlockPeriod(lastWeekPeriod, fractionToTimestamp.blockNumber)
    ) {
      lastWeekAcc += fractionToTimestamp.args.value.toNumber();
      lastWeekBlockNumbers.push(fractionToTimestamp.blockNumber);
    }
  }

  // Ensure we got some values in our arrays
  if (lastWeekBlockNumbers.length == 0) {
    lastWeekBlockNumbers.push(currenWeekPeriod.start);
  }
  if (currentWeekBlockNumbers.length == 0 && lastWeekBlockNumbers.length != 0) {
    currentWeekBlockNumbers.push(Math.max(...lastWeekBlockNumbers));
  } else if (currentWeekBlockNumbers.length == 0) {
    currentWeekBlockNumbers.push(currenWeekPeriod.start);
  }

  return {
    total: totalAcc,
    currentWeek: currentWeekAcc,
    lastWeek: lastWeekAcc,
    period: {
      lastWeekBlockStart: Math.min(...lastWeekBlockNumbers),
      currentWeekBlockStart: Math.min(...currentWeekBlockNumbers),
      currentWeekBlockEnd: Math.max(...currentWeekBlockNumbers),
    },
  };
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
