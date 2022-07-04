import * as functions from "firebase-functions";
import cors from "cors";
import { buildFractionId, allTokenTypesToRarity } from "./utils/SybelMath";
import { Storage } from "@google-cloud/storage";
import { getMinterConnected } from "./utils/Contract";
import { NftMetadata } from "./utils/NftMetadata";
import { getWalletForUser } from "./utils/UserUtils";

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
        // Extract variable from the request
        const requestDto: MintPodcastRequestDto = request.body.data;

        // Our route require the from address, the supply of different rarity token,
        //  and rss informations to generate the json
        if (
          !requestDto.id ||
          !requestDto.supply ||
          !requestDto.podcastInfo ||
          requestDto.supply.length != 4
        ) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }

        // Find the wallet of the creator of this podcast
        const creatorWallet = await getWalletForUser(requestDto.id);
        if (!creatorWallet) {
          response
            .status(404)
            .send({ error: "Unable to find the wallet of the owner" });
          return;
        }

        try {
          // Get our minter contract, connected via the sybel wallet
          const minterConnected = getMinterConnected();
          const podcastMintedFilter = minterConnected.filters.PodcastMinted();
          // Try to mint a new podcast
          await minterConnected.addPodcast(
            requestDto.supply[0],
            requestDto.supply[1],
            requestDto.supply[2],
            requestDto.supply[3],
            creatorWallet.address
          );
          const filteredEvents = await minterConnected.queryFilter(
            podcastMintedFilter
          );
          // Generate all of required JSON
          await Promise.all(
            allTokenTypesToRarity.map(async (tokenTypeToRarity) => {
              // Find the id of the generated fraction
              const fractionId = buildFractionId(
                filteredEvents[filteredEvents.length - 1].args[3],
                tokenTypeToRarity.tokenTypes
              ).toNumber();
              // Build the json metadata we will upload
              const nftMetadata = new NftMetadata(
                fractionId,
                requestDto.podcastInfo.image,
                requestDto.podcastInfo.name,
                requestDto.podcastInfo.description,
                requestDto.podcastInfo.background_color,
                tokenTypeToRarity.rarity
              );
              // Then upload the built metadata
              await uploadFile(nftMetadata.toJson(), fractionId.toString());
            })
          ).then(() =>
            // Build our response
            response.status(200).json({
              transactionHash:
                filteredEvents[filteredEvents.length - 1].transactionHash,
              from: filteredEvents[filteredEvents.length - 1].args[1],
              to: filteredEvents[filteredEvents.length - 1].args[2],
            })
          );
        } catch (error) {
          functions.logger.debug(
            "An error occured while minting the podcast",
            error
          );
          response.status(500).send({ error });
        }
      });
    });

// Define the function that will upload a file on our bucket
async function uploadFile(json: string, filename: string) {
  const storage = new Storage();
  const bucket = storage.bucket("gs://sybel-io.appspot.com");
  const file = bucket.file("json/" + filename + ".json");
  return await file.save(json);
}
