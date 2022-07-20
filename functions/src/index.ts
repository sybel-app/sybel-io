import * as admin from "firebase-admin";
admin.initializeApp();
import getOrCreateWalletFunction from "./wallet/GetOrCreateWallet";
import getWalletFunction from "./wallet/GetWallet";
import getBalanceFunction from "./wallet/GetTseBalance";
import generateRssFunction from "./analytics/GenerateRss";
import analyticsUrlFunction from "./analytics/AnalyticsUrl";
import getSeriesFunction from "./analytics/ExtractPodcastInfo";
import refreshUserBalanceFunction from "./reward/RefreshUserBalance";
import launchPodcastMint from "./mint/LaunchPodcastMint";
import getPodcastMint from "./mint/GetPodcastMint";
import getPodcastsMintedCall from "./mint/GetPodcastsMinted";
import getPodcastFractionsCall from "./fraction/GetPodcastFractions";
import buyPodcastFractionCall from "./fraction/BuyPodcastFraction";
import mintPodcastFromJsonCall from "./mint/MintPodcastFromJson";
import importSybelListenEventCron from "./analytics/ImportSybelListenEvent";
import computeMintingBadgeCron from "./badges/ComputeMintingBadge";
import computePodcastBadgeCron from "./badges/ComputePodcastBadge";
import cleanUnimporedListenEventCron from "./analytics/CleanUnimportedListenEvent";
import checkUnimportedPodcastMintCron from "./mint/CheckUnimportedPodcastMint";
import checkUnimportedRewardCron from "./reward/CheckUnimportedRewardTx";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getOrCreateWallet = getOrCreateWalletFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getWallet = getWalletFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getBalance = getBalanceFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const generate = generateRssFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const analytics = analyticsUrlFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getSeries = getSeriesFunction();

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const launchMint = launchPodcastMint();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getMint = getPodcastMint();

/**
 * Refresh the user balance function
 */
export const refreshBalance = refreshUserBalanceFunction();

/**
 * List all the podcast minted
 */
export const getPodcastsMinted = getPodcastsMintedCall();

/**
 * List all the fractions for a giben podcasts
 */
export const getPodcastFractions = getPodcastFractionsCall();

/**
 * Mint all the podcast from a sybel db export
 */
export const mintPodcastFromSybelExport = mintPodcastFromJsonCall();

/**
 * Buy the given podcast fraction
 */
export const buyPodcastFraction = buyPodcastFractionCall();

/*
 * ===== BATCH =====
 */

/**
 * Import the sybel listen event cron
 */
export const importSybelListenEvent = importSybelListenEventCron();

/**
 * Compute the fraction cost badge of each token fraction
 */
export const computeMintingBadge = computeMintingBadgeCron();

/**
 * Compute the podcast badge of each token fraction
 */
export const computePodcastBadge = computePodcastBadgeCron();

/**
 * Clean all the unimported listen event
 */
export const cleanUnimportedListenEvent = cleanUnimporedListenEventCron();

/**
 * Check all the unimported podcast mint
 */
export const checkUnimportedPodcastMint = checkUnimportedPodcastMintCron();

/**
 * Check all the unimported user reward
 */
export const checkUnimportedReward = checkUnimportedRewardCron();
