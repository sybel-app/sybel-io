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

      // Get all the minted podcast
      const mintCollection = admin.firestore().collection("mintedPodcast");
      const mintedPodcastDocsSnapshot = await mintCollection
        .where("fractionBaseId", "!=", null)
        .get();
      const mintedPodcasts: MintedPodcastDbDto[] = [];
      mintedPodcastDocsSnapshot.forEach((mintedPodcastDoc) =>
        mintedPodcasts.push(mintedPodcastDoc.data() as MintedPodcastDbDto)
      );

      // Return our freshly built object
      return mintedPodcasts;
    });
