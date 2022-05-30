import * as functions from "firebase-functions";
import cors from "cors";
import Web3 from "web3";
import abi from "./abi.json";
import { AbiItem } from "web3-utils";

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
      cors()(request, response, async () => {
        if (!request.body.address) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const address = request.body.address;
          try {
            const contract = new web3.eth.Contract(
              abi as AbiItem[],
              process.env.SYBEL
            );
            const balance = await contract.methods.balanceOf(address).call();
            response.status(200).send({
              address: address,
              balance: balance / 1e18,
            });
          } catch (error) {
            response.status(500).send(error);
          }
        }
      });
    });
