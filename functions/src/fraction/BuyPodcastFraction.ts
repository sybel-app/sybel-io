import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MintedPodcastDbDto from "../types/db/MintedPodcastDbDto";
import { checkCallData } from "../utils/Security";
import { buildFractionId } from "../utils/SybelMath";
import { minterConnected } from "../utils/Contract";
import { BigNumber } from "ethers";
import BuyPodcastFractionRequestDto from "../types/request/BuyPodcastFractionRequestDto";
import WalletDbDto, { OwnedFraction } from "../types/db/WalletDbDto";

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
      async (request: BuyPodcastFractionRequestDto): Promise<unknown> => {
        checkCallData(request);

        if (!request.seriesId || !request.count || !request.tokenType) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "No series id, token type or count passed as param"
          );
        }

        // Get the minted podcast matching the series id
        const mintCollection = admin.firestore().collection("mintedPodcast");
        const mintedPodcastDocsSnapshot = await mintCollection
          .where("fractionBaseId", "!=", null)
          .where("seriesId", "==", request.seriesId)
          .get();
        if (mintedPodcastDocsSnapshot.empty) {
          throw new functions.https.HttpsError(
            "not-found",
            `Unable to found a minted podcast for the id ${request.seriesId}`
          );
        }
        // Extract it from our db snapshot
        const mintedPodcasts: MintedPodcastDbDto[] = [];
        mintedPodcastDocsSnapshot.forEach((mintedPodcastDoc) =>
          mintedPodcasts.push(mintedPodcastDoc.data() as MintedPodcastDbDto)
        );
        const mintedPodcast: MintedPodcastDbDto = mintedPodcasts[0];
        if (!mintedPodcast) {
          throw new functions.https.HttpsError(
            "not-found",
            `Unable to found a minted podcast for the id ${request.seriesId}`
          );
        }

        // Get the user wallet
        const walletCollection = admin.firestore().collection("wallet");
        const walletDocs: admin.firestore.QueryDocumentSnapshot[] = [];
        const walletSnapshots = await walletCollection
          .where("id", "==", request.id)
          .limit(1)
          .get();
        // Find document and map it
        walletSnapshots.forEach((doc) => {
          walletDocs.push(doc);
        });
        if (walletDocs.length <= 0) {
          throw new functions.https.HttpsError("not-found", "no wallet found");
        }
        const walletDoc = walletDocs[0];
        const wallet = walletDoc.data() as WalletDbDto;

        // Then, launch the payment tx
        const fractionId = buildFractionId(
          BigNumber.from(mintedPodcast.fractionBaseId),
          request.tokenType
        );
        const minter = await minterConnected();
        const mintFractionTx = await minter.mintFraction(
          fractionId,
          wallet.address,
          request.count
        );
        functions.logger.debug(
          `Minting the user fraction on the tx ${mintFractionTx}`
        );

        // And finally update the user wallet (append him the fraction with the associated tx)
        let newUserFractions: OwnedFraction[];
        const newFraction = {
          seriesId: request.seriesId,
          tokenType: request.tokenType,
          count: request.count,
          txHash: mintFractionTx.hash,
        };
        if (wallet.fractions) {
          const actualFractions = wallet.fractions;
          actualFractions.push(newFraction);
          newUserFractions = actualFractions;
        } else {
          newUserFractions = [newFraction];
        }
        await walletDoc.ref.update({
          fractions: newUserFractions,
        });

        // Return the tx on which the buy was done
        return mintFractionTx.hash;
      }
    );
