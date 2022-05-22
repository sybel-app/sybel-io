import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";

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
          const batch = db.batch();
          const collection = db.collection("listeningAnalytics");
          if (
            !request.query.rss ||
          !request.query.uid ||
          !request.query.oid ||
          !request.query.sid
          ) {
            response.status(500).send({error: "missing arguments"});
          } else {
            const rssUrl = request.query.rss;
            const userId = request.query.uid;
            const ownerId = request.query.oid;
            const seriesId = request.query.sid;

            /* Apple Podcast User-Agent */
            console.log({socket: request.socket,

              subdomains: request.subdomains,
              res: request.res,
              originalUrl: request.originalUrl});
            if (
              request.headers["user-agent"]
            ) {
              try {
                const newListen = {
                  rssUrl,
                  userId,
                  ownerId,
                  seriesId,
                  givenToOwner: false,
                  givenToUser: false,
                  date: admin.firestore.Timestamp.fromDate(new Date()),
                };
                batch.set(collection.doc(), newListen);
                batch.commit();
                response.redirect(rssUrl as string);
              } catch (error) {
                response.status(500).send(error);
              }
            } else {
              response.redirect(rssUrl as string);
            }
          }
        });
      });
