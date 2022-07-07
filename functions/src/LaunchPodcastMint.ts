import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getWalletForUser } from "./utils/UserUtils";
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
    .runWith({
      // Timeout of 540min, since it's the max allowed by firebase function
      timeoutSeconds: 540,
    })
    .https.onCall(
      async (request: MintPodcastRequestDto, context): Promise<unknown> => {
        functions.logger.debug(`app id ${context.app?.appId}`);
        functions.logger.debug(`auth id ${context.auth?.uid}`);
        functions.logger.debug(`instance id token ${context.instanceIdToken}`);

        // Our route require the from address and the info required for the
        //  and rss informations to generate the json
        if (!request.id || !request.podcastInfo || !request.seriesId) {
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

        // Ensure this podcast wasn't previously minted
        const mintCollection = admin.firestore().collection("mintedPodcast");
        const mintedPodcastWithSameId = await mintCollection
          .where("series", "==", request.seriesId)
          .get();
        if (mintedPodcastWithSameId.size > 0) {
          throw new functions.https.HttpsError(
            "already-exists",
            `The podcast with id ${request.seriesId} is already minted / waiting to be minted`
          );
        }

        try {
          // Get our minter contract, connected via the sybel wallet
          const minter = await minterConnected();
          functions.logger.debug(`Minter addr ${minter.address}`);
          // Try to mint a new podcast
          const mintPodcastTx = await minter.addPodcast(creatorWallet.address);
          functions.logger.debug(
            `Minting the podcast on tx ${mintPodcastTx.hash} `
          );

          // Create the object we will store in our database, and save it
          const pendingPodcastMint: MintedPodcastDbDto = {
            seriesId: request.seriesId, // TODO : this is the user id
            txHash: mintPodcastTx.hash,
            podcastInfo: request.podcastInfo,
            fractionBaseId: null,
            txBlockHash: null,
            txBlockNumber: null,
            uploadedMetadatas: null,
          };
          await mintCollection.add(pendingPodcastMint);

          // Then send our response
          return {
            transactionHash: mintPodcastTx.hash,
            seriesId: request.seriesId,
            operator: mintPodcastTx.from,
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
