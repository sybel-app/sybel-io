import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { minter, provider } from "../utils/Contract";
import { allTokenTypesToRarity, buildFractionId } from "../utils/SybelMath";
import { NftMetadata } from "./model/NftMetadata";
import { Storage } from "@google-cloud/storage";

/*
 * Check the unimported podcast mint
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("0,30 * * * *") // Run every 30min
    .onRun(async () => {
      functions.logger.info(
        "Started the check of all the unimported podcast mint"
      );

      // Ensure this podcast wasn't previously minted
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const unimportedPodcastMintSnapshot = await mintCollection
        .where("fractionBaseId", "==", null)
        .get();

      const unimportedPodcastMintDocs: admin.firestore.QueryDocumentSnapshot[] =
        [];
      // Map them to our dto
      unimportedPodcastMintSnapshot.forEach((doc) =>
        unimportedPodcastMintDocs.push(doc)
      );
      functions.logger.info(
        `Found ${unimportedPodcastMintDocs.length} unimported podcast mint`
      );

      // Iterate over each one of them
      for (const unimportedPodcastMintDoc of unimportedPodcastMintDocs) {
        try {
          const unimportedPodcastMint =
            unimportedPodcastMintDoc.data() as MintedPodcastDbDto;
          // Get the tx
          const transaction = await provider.getTransaction(
            unimportedPodcastMint.txHash
          );

          // If the transaction isn't mined yet, jump to the next iteration
          if (!transaction.blockHash || !transaction.timestamp) {
            functions.logger.debug(
              `The tx ${transaction.hash} isn't minted yet, aborting the import`
            );
            continue;
          }

          // Get all the PodcastMinted events of this blocks
          const events = await minter.queryFilter(
            minter.filters.PodcastMinted(),
            transaction.blockHash
          );
          // Then filter to get only the event of this transaction
          const txEvents = events.filter(
            (event) => event.transactionHash == transaction.hash
          );

          // Exit if we can't find it
          if (txEvents.length <= 0) {
            functions.logger.debug(
              `Unable to find the mint event on the tx ${transaction.hash} on the block ${transaction.blockHash}`
            );
            continue;
          }

          // Otherwise, extract the mint event, and use it to generate metadata
          const mintPodcastEvent = txEvents[0];
          functions.logger.debug(
            `Found the mint podcast event from the tx ${transaction.blockHash}, with podcast id ${mintPodcastEvent.args.baseId}  `
          );

          // Append the block info and fraction base id
          await unimportedPodcastMintDoc.ref.update({
            fractionBaseId: mintPodcastEvent.args.baseId.toNumber(),
            txBlockNumber: transaction.blockNumber,
            txBlockHash: transaction.blockHash,
            txBlockTimestamp: admin.firestore.Timestamp.fromMillis(
              transaction.timestamp * 1000
            ),
          });

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
                unimportedPodcastMint.podcastInfo.image,
                unimportedPodcastMint.podcastInfo.name,
                unimportedPodcastMint.podcastInfo.description,
                unimportedPodcastMint.podcastInfo.background_color,
                tokenTypeToRarity.rarity
              );
              // Then upload the built metadata
              return await uploadFile(nftMetadata.toJson(), fractionId);
            })
          );

          // Append the list of uploaded files
          await unimportedPodcastMintDoc.ref.update({
            uploadedMetadatas: uploadedFiles,
          });
          functions.logger.debug(
            `Generated ${uploadedFiles.length} metadata files for the podcast id ${unimportedPodcastMint.seriesId}`
          );
        } catch (exception: unknown) {
          functions.logger.warn(
            "An error occured while handling a freshly minted podcast",
            exception
          );
        }
      }

      functions.logger.info(
        "Finished the check of all the unimported podcast mint"
      );
    });

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
