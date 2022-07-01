import * as functions from "firebase-functions";
import cors from "cors";
import { ethers } from "ethers";
import { minterAddr } from "./utils/addresses.json";
import { Minter__factory as MinterFactory } from "./generated-types";
import { buildFractionId } from "./utils/SybelMath";
import { Storage } from "@google-cloud/storage";
import rgb2hex from "rgb2hex";

const storage = new Storage();
const bucket = storage.bucket("gs://sybel-io.appspot.com");

// Finding Minter Contract
async function findContract() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.HARDHAT_LOCAL_NODE
  );
  const wallet = new ethers.Wallet(
    process.env.HARDHAT_LOCAL_TEST_WALLET!,
    provider
  );
  const minterContract = MinterFactory.connect(minterAddr, wallet);
  return minterContract;
}
//Generate the JSON
const generateJson = (
  id: number,
  image: string,
  name: string,
  description: string,
  background_color: string,
  index: number
) => {
  return {
    id,
    image,
    name,
    description,
    background_color: rgb2hex(background_color).hex,
    attributes: [
      {
        trait_type: "Rarity",
        value:
          index === 0
            ? "Standart"
            : index === 1
            ? "Common"
            : index === 2
            ? "Rare"
            : index === 3
            ? "Epic"
            : index === 4
            ? "Legendary"
            : "X",
      },
      { trait_type: "Type", value: "Podcast" },
    ],
  };
};

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
        async function uploadFile(json: string, filename: string) {
          const file = bucket.file("json/" + filename + ".json");
          return await file.save(json);
        }
        // Our route require the from address, the supply of different rarity token,
        //  and rss informations to generate the json
        if (
          !request.body.from ||
          !request.body.supply ||
          !request.body.rss ||
          request.body.supply.length != 5
        ) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const from: string = request.body.from;
          const supply: number[] = request.body.supply;
          const {
            image,
            name,
            description,
            background_color,
          }: {
            image: string;
            name: string;
            description: string;
            background_color: string;
          } = request.body.rss;
          try {
            const minter = await findContract();
            const filter = minter.filters.PodcastMinted();
            await minter.queryFilter(filter);
            // Podcast Minted
            await minter.addPodcast(
              supply[1],
              supply[2],
              supply[3],
              supply[4],
              from
            );
            const result = await minter.queryFilter(filter);
            // Generation of 4 JSON per podcast
            supply.map(async (each, index) => {
              // finding id of the nft fraction
              const id = buildFractionId(
                result[result.length - 1].args[3],
                index + 2
              );
              if (!!each) {
                const fnft = generateJson(
                  id.toNumber(),
                  image,
                  name,
                  description,
                  background_color,
                  index
                );
                const json = JSON.stringify(fnft);
                await uploadFile(json, id.toNumber() + "_" + (index + 2));
              }
            });
            response.json({
              transactionHash: result[result.length - 1].transactionHash,
              from: result[result.length - 1].args[1],
              to: result[result.length - 1].args[2],
            });
          } catch (error) {
            response.status(500).send({ error });
          }
        }
      });
    });
