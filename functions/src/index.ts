import * as admin from "firebase-admin";
admin.initializeApp();
import getOrCreateWalletFunction from "./GetOrCreateWallet";
import getWalletFunction from "./GetWallet";
import getBalanceFunction from "./GetTseBalance";
import generateRssFunction from "./GenerateRss";
import analyticsUrlFunction from "./AnalyticsUrl";
import getSeriesFunction from "./ExtractPodcastInfo";
import refreshUserBalanceFunction from "./RefreshUserBalance";
import mintPodcast from "./MintPodcast";
import importSybelListenEventCron from "./cron/ImportSybelListenEvent";
import computeMintingBadgeCron from "./cron/ComputeMintingBadge";
import computePodcastBadgeCron from "./cron/ComputePodcastBadge";
import cleanUnimporedListenEventCron from "./cron/CleanUnimportedListenEvent";

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
export const mint = mintPodcast();

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
