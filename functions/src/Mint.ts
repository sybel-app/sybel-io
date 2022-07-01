import * as functions from "firebase-functions";
import cors from "cors";
import { buildFractionId, tokenTypesData } from "./utils/SybelMath";
import { Storage } from "@google-cloud/storage";
import { getMinterConnected } from "./utils/Contract";
import { NftJson } from "./utils/GenerateJson";
import { getWalletForUser } from "./utils/UserUtils";

const storage = new Storage();
const bucket = storage.bucket("gs://sybel-io.appspot.com");

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
          !request.body.id ||
          !request.body.supply ||
          !request.body.rss ||
          request.body.supply.length != 4
        ) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const id: string = request.body.id;
          const creatorWallet = await getWalletForUser(id);
          if (!creatorWallet) {
            response.status(404).send({ error: "Can't access to the wallet" });
          }
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
            const minterConnected = getMinterConnected();
            const podcastMintedFilter = minterConnected.filters.PodcastMinted();
            // Podcast Minted
            await minterConnected.addPodcast(
              supply[0],
              supply[1],
              supply[2],
              supply[3],
              creatorWallet!.address
            );
            const filteredEvents = await minterConnected.queryFilter(
              podcastMintedFilter
            );
            // Generation of 4 JSON per podcast
            Promise.all(
              tokenTypesData.map(async (eachTokenType) => {
                // finding id of the nft fraction
                const fractionId = buildFractionId(
                  filteredEvents[filteredEvents.length - 1].args[3],
                  eachTokenType.rarityNumber
                ).toNumber();
                const fnft = new NftJson(
                  fractionId,
                  image,
                  name,
                  description,
                  background_color,
                  eachTokenType.rarity
                );
                await uploadFile(
                  fnft.toJson(),
                  fractionId + "_" + eachTokenType.rarityNumber
                );
              })
            ).then(() =>
              response.json({
                transactionHash:
                  filteredEvents[filteredEvents.length - 1].transactionHash,
                from: filteredEvents[filteredEvents.length - 1].args[1],
                to: filteredEvents[filteredEvents.length - 1].args[2],
              })
            );
          } catch (error) {
            response.status(500).send({ error });
          }
        }
      });
    });
