import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { buildFractionId, allTokenTypesToRarity } from "./utils/SybelMath";
import { Storage } from "@google-cloud/storage";
import { Event } from "ethers";
import { NftMetadata } from "./model/NftMetadata";
import { getWalletForUser } from "./utils/UserUtils";
import { PodcastMintedEvent } from "./generated-types/Minter";
import { minterConnected } from "./utils/Contract";
import MintedPodcastDbDto from "./types/db/MintedPodcastDbDto";
import MintPodcastRequestDto from "./types/request/MintPodcastRequestDto";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onCall(
      async (request: MintPodcastRequestDto, context): Promise<unknown> => {
        functions.logger.debug(`app id ${context.app?.appId}`);
        functions.logger.debug(`auth id ${context.auth?.uid}`);
        functions.logger.debug(`instance id token ${context.instanceIdToken}`);

        // Our route require the from address and the info required for the
        //  and rss informations to generate the json
        if (!request.id || !request.podcastInfo) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "missing arguments"
          );
        }

        // Find the wallet of the creator of this podcast
        const creatorWallet = await getWalletForUser(request.id);
        if (!creatorWallet) {
          throw new functions.https.HttpsError(
            "not-found",
            "no creator wallet found"
          );
        }

        try {
          // Get our minter contract, connected via the sybel wallet
          const minter = await minterConnected();
          // Try to mint a new podcast
          const mintPodcastTx = await minter.addPodcast(creatorWallet.address);
          // Await that the transaction pass on the blockchain
          const mintPodcastTxReceipt = await mintPodcastTx.wait();
          const mintPodcastEvents = mintPodcastTxReceipt.events?.filter(
            (event: Event): event is PodcastMintedEvent =>
              event.args?.baseId != null
          );
          // If we are unable to extract the mint event, exit directly
          if (!mintPodcastEvents) {
            throw new functions.https.HttpsError(
              "internal",
              `Unable to find the mind podcast event, you should check it manually, tx hash ${mintPodcastTxReceipt.blockHash}`
            );
          }
          // Otherwise, extract the mint event, and use it to generate metadata
          const mintPodcastEvent = mintPodcastEvents[0];
          functions.logger.debug(
            `Found the mint podcast event from the tx ${mintPodcastTxReceipt.blockHash}, with podcast id ${mintPodcastEvent.args.baseId}  `
          );
          // Create the object we will store in our database, and save it
          const mintedPodcast: MintedPodcastDbDto = {
            seriesId: request.id,
            fractionBaseId: mintPodcastEvent.args.baseId.toNumber(),
            txBlockNumber: mintPodcastTxReceipt.blockNumber,
            txBlockHash: mintPodcastTxReceipt.blockHash,
          };
          const collection = admin.firestore().collection("mintedPodcast");
          await collection.add(mintedPodcast);

          // Generate all of required JSON
          const uploadedFiles = await Promise.all(
            allTokenTypesToRarity.map(async (tokenTypeToRarity) => {
              // Find the id of the generated fraction
              const fractionId = buildFractionId(
                mintPodcastEvent.args.baseId,
                tokenTypeToRarity.tokenTypes
              ).toNumber();
              functions.logger.debug(
                `Build the fraction id ${fractionId} from base id ${mintPodcastEvent.args.baseId} and token type ${tokenTypeToRarity.tokenTypes}`
              );
              // Build the json metadata we will upload
              const nftMetadata = new NftMetadata(
                fractionId,
                request.podcastInfo.image,
                request.podcastInfo.name,
                request.podcastInfo.description,
                request.podcastInfo.background_color,
                tokenTypeToRarity.rarity
              );
              // Then upload the built metadata
              return await uploadFile(nftMetadata.toJson(), fractionId);
            })
          );
          // Then send our response
          return {
            transactionHash: mintPodcastEvent.transactionHash,
            podcastId: mintPodcastEvent.args.baseId,
            owner: mintPodcastEvent.args.owner,
            operator: mintPodcastTxReceipt.from,
            metadataGenerated: uploadedFiles,
          };
        } catch (error) {
          functions.logger.debug(
            "An error occured while minting the podcast",
            error
          );
          throw new functions.https.HttpsError("internal", "unknown", error);
        }
      }
    );

/**
 * Upload a given json into our bucket
 * @param {string} json
 * @param {string} fractionId
 * @return {void}
 */
async function uploadFile(json: string, fractionId: number): Promise<string> {
  const storage = new Storage();
  // Upload our file
  const file = storage
    .bucket("gs://sybel-io.appspot.com")
    .file(`json/${fractionId}.json`);
  // Upload the json and make it public
  await file.save(json);
  await file.makePublic();
  // Return the public url of this file
  return file.publicUrl();
}
