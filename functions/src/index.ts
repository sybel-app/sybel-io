import * as admin from "firebase-admin";
admin.initializeApp();
import payUserFunction from "./PayUser";
import createWalletFunction from "./CreateWallet";
import getWalletFunction from "./GetWallet";
import getBalanceFunction from "./GetBalance";
import generateRssFunction from "./GenerateRss";
import analyticsUrlFunction from "./AnalyticsUrl";
import getAmountFunction from "./GetAmount";
import getSeriesFunction from "./SeriesInfo";
import refreshUserBalanceFunction from "./RefreshUserBalance";
import importSybelListenEventCron from "./ImportSybelListenEvent";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const createWallet = createWalletFunction();
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
export const payUser = payUserFunction();
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
export const getAmount = getAmountFunction();
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @returns {void}
 */
export const getSeries = getSeriesFunction();

/**
 * Refresh the user balance function
 */
export const refreshBalance = refreshUserBalanceFunction();

/**
 * Import the sybel listen event cron
 */
export const importSybelListenEvent = importSybelListenEventCron();
