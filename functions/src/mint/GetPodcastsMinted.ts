import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { checkCallData } from "../utils/Security";

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onCall(async (request): Promise<unknown> => {
      checkCallData(request);

      // Build the initial query
      const mintCollection = admin.firestore().collection("mintedPodcast");
      let mintedPodcastQuery = mintCollection.where(
        "fractionBaseId",
        "!=",
        null
      );

      // Filter on the series id if needed
      if (request.seriesId) {
        mintedPodcastQuery = mintedPodcastQuery.where(
          "seriesId",
          "==",
          request.seriesId
        );
      }

      // Get the light type for our output
      type LightPodcast = Omit<MintedPodcastDbDto, "previousCostUpdate">;

      // Get the minted podcast
      const mintedPodcastDocsSnapshot = await mintedPodcastQuery.get();
      const mintedPodcasts: LightPodcast[] = [];
      mintedPodcastDocsSnapshot.forEach((mintedPodcastDoc) => {
        if (mintedPodcastDoc.exists) {
          mintedPodcasts.push(mintedPodcastDoc.data() as LightPodcast);
        }
      });

      // Return our freshly built object
      return mintedPodcasts;
    });
