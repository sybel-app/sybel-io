import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";
import AnalyticsUrlRequestDto from "../types/request/AnalyticsUrlRequestDto";
import ListenAnalyticsDbDto from "../types/db/ListenAnalyticsDbDto";
import { Timestamp } from "@firebase/firestore";

const db = admin.firestore();

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
        // Extract the data from the request query
        const requestDto: AnalyticsUrlRequestDto = {
          rssUrl: request.query.rss as string,
          userId: request.query.uid as string,
          seriesId: request.query.sid as string,
        };

        // Check that we got all of our param
        if (!requestDto.rssUrl || !requestDto.userId || !requestDto.seriesId) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }
        // If we got the user agent defined keep going
        // TODO : Why we need it ??
        if (request.headers["user-agent"]) {
          try {
            const now = new Date();
            const fiveMinAgoDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              now.getMinutes() - 5
            );

            // Access our db and prepare the batch we will use to save inside it
            const collection = db.collection("listeningAnalytics");
            const lessThan5minSnapshots = await collection
              .where("userId", "==", requestDto)
              .where(
                "date",
                ">=",
                admin.firestore.Timestamp.fromDate(fiveMinAgoDate)
              )
              .get();
            if (lessThan5minSnapshots.size > 0) {
              // If we got listen events in the past 5min, don't register new one
              functions.logger.info(
                `The user ${requestDto.userId} has already perform ${lessThan5minSnapshots.size} listen events in the past 5min, don't register new one`
              );
              // Directly redirect it
              response.redirect(requestDto.rssUrl);
              return;
            }

            // Create the new listen object we will store in our database
            await collection.add({
              userId: requestDto.userId,
              seriesId: requestDto.seriesId,
              givenToUser: false,
              date: admin.firestore.Timestamp.fromDate(now),
            });
            functions.logger.info(
              `Saved a new listen for the user ${requestDto.userId} on the series ${requestDto.seriesId}`
            );
            // Redirect the user
            response.redirect(requestDto.rssUrl);
          } catch (error) {
            response.status(500).send(error);
          }
        } else {
          // Redirect to the rss url
          response.redirect(requestDto.rssUrl);
        }
      });
    });
