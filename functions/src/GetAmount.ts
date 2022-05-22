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
          if (!request.body.id) {
            response.status(500).send({error: "missing arguments"});
          } else {
            const id = request.body.id;
            try {
              const collection = db.collection("listeningAnalytics");
              const ownerLog: admin.firestore.
            QueryDocumentSnapshot<admin.firestore.DocumentData>[] =
              [];
              const ownerSnapshot = await collection
                  .where("ownerId", "==", id)
                  .where("givenToOwner", "!=", true)
                  .get();
              ownerSnapshot.forEach((doc) => ownerLog.push(doc));
              ownerLog.map(async (each) => {
                const docRef = db.collection("listeningAnalytics")
                    .doc(each.id);
                await docRef.update({
                  givenToOwner: true,
                });
              });
              const userLog: admin.firestore.
            QueryDocumentSnapshot<admin.firestore.DocumentData>[] =
              [];
              const userSnapshot = await collection
                  .where("userId", "==", id)
                  .where("givenToUser", "!=", true)
                  .get();
              userSnapshot.forEach((doc) => userLog.push(doc));
              userLog.map(async (each) => {
                const docRef = db.collection("listeningAnalytics")
                    .doc(each.id);
                await docRef.update({
                  givenToUser: true,
                });
              });
              response.status(200)
                  .send({ownerAmount: ownerLog.length,
                    userAmount: userLog.length});
            } catch (error) {
              response.status(500).send(error);
            }
          }
        });
      });
