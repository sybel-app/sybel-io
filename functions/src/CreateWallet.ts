import * as functions from "firebase-functions";
import cors from "cors";
import Web3 from "web3";
import * as admin from "firebase-admin";

const db = admin.firestore();
const web3 = new Web3(process.env.NODE || "http://localhost:3000/");

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
        cors()(request, response, () => {
          const batch = db.batch();
          const collection = db.collection("wallet");
          if (!request.body.id) {
            response.status(500).send({error: "missing arguments"});
          } else {
            const id = request.body.id;
            try {
              const newWallet = web3.eth.accounts.create();
              const newWalletInFirebase = {
                id,
                address: newWallet.address,
                privateKey: newWallet.privateKey,
              };
              batch.set(collection.doc(), newWalletInFirebase);
              batch.commit();
              response.status(200).send({
                id,
                address: newWallet.address,
                privateKey: newWallet.privateKey,
              });
            } catch (error) {
              response.status(500).send(error);
            }
          }
        });
      });
