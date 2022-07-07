import * as admin from "firebase-admin";
admin.initializeApp();
import getOrCreateWalletFunction from "./GetOrCreateWallet";
import getWalletFunction from "./GetWallet";
import getBalanceFunction from "./GetTseBalance";
import generateRssFunction from "./GenerateRss";
import analyticsUrlFunction from "./AnalyticsUrl";
import getSeriesFunction from "./ExtractPodcastInfo";
import refreshUserBalanceFunction from "./RefreshUserBalance";
import launchPodcastMint from "./LaunchPodcastMint";
import getPodcastMint from "./GetPodcastMint";
import importSybelListenEventCron from "./cron/ImportSybelListenEvent";
import computeMintingBadgeCron from "./cron/ComputeMintingBadge";
import computePodcastBadgeCron from "./cron/ComputePodcastBadge";
import cleanUnimporedListenEventCron from "./cron/CleanUnimportedListenEvent";
import checkUnimportedPodcastMintCron from "./cron/CheckUnimportedPodcastMint";
import checkUnimportedRewardCron from "./cron/CheckUnimportedRewardTx";

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
