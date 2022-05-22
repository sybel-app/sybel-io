import * as functions from "firebase-functions";
import cors from "cors";
import * as admin from "firebase-admin";
import Wallet from "./model/Wallet";

const db = admin.firestore();

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () => functions
    .region("europe-west3")
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        if (!request.body.id) {
          response.status(500).send({error: "missing arguments"});
        } else {
          const id = request.body.id;
          try {
            const collection = db.collection("wallet");
            const document: Wallet[] = [];
            const snapshot = await collection
                .where("id", "==", id)
                .limit(1)
                .get();
            snapshot.forEach((doc) => document.push(doc.data() as Wallet));
            if (document.length>=1) {
              response.status(200).send(document[0]);
            } else {
              response.status(404).send({error: "no wallet found"});
            }
          } catch (error) {
            response.status(500).send(error);
          }
        }
      });
    });
