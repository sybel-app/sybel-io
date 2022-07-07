import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";
import AnalyticsUrlRequestDto from "./types/request/AnalyticsUrlRequestDto";
import ListenAnalyticsDbDto from "./types/db/ListenAnalyticsDbDto";
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
          ownerId: request.query.oid as string,
          seriesId: request.query.sid as string,
        };

        // Check that we got all of our param
        if (
          !requestDto.rssUrl ||
          !requestDto.userId ||
          !requestDto.ownerId ||
          !requestDto.seriesId
        ) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }
        // If we got the user agent defined keep going
        // TODO : Why we need it ??
        if (request.headers["user-agent"]) {
          try {
            // Access our db and prepare the batch we will use to save inside it
            const collection = db.collection("listeningAnalytics");
            const batch = db.batch();
            // Create the new listen object we will store in our database
            const newListen: ListenAnalyticsDbDto = {
              userId: requestDto.userId,
              seriesId: requestDto.seriesId,
              givenToUser: false,
              date: FirebaseFirestore.Timestamp.fromDate(new Date()),
            };
            // Store it inside our db
            batch.set(collection.doc(), newListen);
            batch.commit();
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
