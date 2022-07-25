import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getWalletForUser } from "../utils/UserUtils";
import { minterConnected } from "../utils/Contract";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import sybelSeriesList from "../utils/sybel_series.json";
import PodcastInfo from "../types/request/PodcastInfo";

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
    .https.onCall(async (): Promise<unknown> => {
      // Access our minted podcast collection
      const mintCollection = admin.firestore().collection("mintedPodcast");

      // Get our minter contract, connected via the sybel wallet
      const minter = await minterConnected();

      const filteredSybelSeries = sybelSeriesList.filter(
        (sybelSeries) => sybelSeries.ownerId == "VVxJTWzCps"
      );
      const ownerWallet = await getWalletForUser("VVxJTWzCps");
      // Check if we know the owner (if we don't just exit this iteration)
      if (!ownerWallet || ownerWallet == null) {
        return;
      }

      for (const sybelSeries of filteredSybelSeries) {
        // Ensure this owner is the right one
        if (sybelSeries.ownerId != ownerWallet.id) {
          continue;
        }

        // Check if the series isn't imported yet
        const mintedPodcastWithSameId = await mintCollection
          .where("seriesId", "==", sybelSeries._id)
          .get();
        if (!mintedPodcastWithSameId.empty) {
          continue;
        }

        try {
          // Try to mint a new podcast
          const mintPodcastTx = await minter.addPodcast(ownerWallet.address);
          functions.logger.debug(
            `Minting the podcast on tx ${mintPodcastTx.hash} `
          );

          const podcastInfo: PodcastInfo = {
            image: sybelSeries.image[0].url,
            name: sybelSeries.info.title,
            description: sybelSeries.info.details,
            background_color: "#F23568",
          };

          // Create the object we will store in our database, and save it
          const pendingPodcastMint: MintedPodcastDbDto = {
            seriesId: sybelSeries._id,
            txHash: mintPodcastTx.hash,
            podcastInfo: podcastInfo,
            fractionBaseId: null,
            txBlockHash: null,
            txBlockNumber: null,
            uploadedMetadatas: null,
            txBlockTimestamp: null,
          };
          await mintCollection.add(pendingPodcastMint);
        } catch (exception) {
          functions.logger.warn(
            "An error occured while minting the podcast",
            exception
          );
        }
      }
      // Owner to update :
      // Le grele
      // Sucré salé
      // la petite sirene
      // noises

      return;
    });
