import * as functions from "firebase-functions";
import cors from "cors";
import Web3 from "web3";
import {AbiItem} from "web3-utils";
import Transaction from "ethereumjs-tx/dist/transaction";
import Common, {CustomChain} from "@ethereumjs/common";
import abi from "./abi.json";

const web3 = new Web3(process.env.NODE || "http://localhost:3000/");
const common = Common.custom(CustomChain.PolygonMumbai);

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
        if (
          !request.body.to ||
        !request.body.listeningNumber
        ) {
          response.status(500).send({error: "missing arguments"});
        } else {
          const to = request.body.to;
          const listeningNumber = request.body.listeningNumber;
          try {
            const tokenContract = new web3.eth.Contract(
            abi as AbiItem[],
            process.env.SYBEL
            );
            const bufferedPrivateKey = Buffer
                .from(process.env.SYBELPRIVK || "", "hex");
            let count;
            web3.eth
                .getTransactionCount(process.env.SYBELPUBK || "")
                .then(function(c) {
                  count = c;
                  const rawTransaction = {
                    from: process.env.SYBELPUBK,
                    gasPrice: web3.utils.toHex(20 * 1e9),
                    gasLimit: web3.utils.toHex(210000),
                    to: process.env.SYBEL,
                    value: "0x0",
                    data: tokenContract.methods
                        .transferToken(to, listeningNumber)
                        .encodeABI(),
                    nonce: web3.utils.toHex(count),
                  };
                  const transaction = new Transaction(rawTransaction, {
                common: common as any, // eslint-disable-line
                  });
                  transaction.sign(bufferedPrivateKey);
                  web3.eth
                      .sendSignedTransaction(
                          "0x" + transaction.serialize().toString("hex")
                      );
                  response.status(200).send({
                    message:
                  "transaction from " +
                  process.env.SYBELPUBK +
                  " to " +
                  to +
                  " done !",
                    transaction,
                  });
                });
          } catch (error) {
            response.status(500).send({error});
          }
        }
      });
    });
