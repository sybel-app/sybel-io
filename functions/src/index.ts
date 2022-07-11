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
