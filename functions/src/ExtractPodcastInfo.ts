import * as functions from "firebase-functions";
import { XMLParser } from "fast-xml-parser";
import Vibrant from "node-vibrant";
import { RuntimeOptions } from "firebase-functions";
import axios from "axios";

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "att_",
};
const parser = new XMLParser(options);

const runtimeOpts: RuntimeOptions = {
  memory: "2GB",
  timeoutSeconds: 540,
};

/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */
export default () =>
  functions
    .runWith(runtimeOpts)
    .region("europe-west3")
    .https.onCall(async (data, context): Promise<unknown> => {
      for (const header of context.rawRequest.rawHeaders) {
        functions.logger.debug(`header ${header}`);
      }

      functions.logger.debug(`app id ${context.app?.appId}`);
      functions.logger.debug(`auth id ${context.auth?.uid}`);
      functions.logger.debug(`instance id token ${context.instanceIdToken}`);

      // Check that we got a rss url as a string
      const rssUrl = data.rss as string;
      if (!rssUrl) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "missing arguments"
        );
      }

      try {
        // Get the rss url info
        const response = await axios.get(rssUrl);

        // Check the response code
        if (response.status >= 400) {
          functions.logger.debug("Invalid response from the rss url");
          throw new functions.https.HttpsError(
            "internal",
            "unable to extract podcast info from the rss feed"
          );
        }

        // Extract the data from the response
        const xmlObject = parser.parse(response.data);
        const image = xmlObject.rss.channel.image.url;
        const paletteData = await Vibrant.from(image).getPalette();
        const title = xmlObject.rss.channel.title;
        const description = xmlObject.rss.channel.description;
        const author = xmlObject.rss.channel["itunes:author"];
        const background = `linear-gradient(rgb(${
          paletteData.DarkMuted ? paletteData.DarkMuted.rgb[0] : "#fff"
        }, ${paletteData.DarkMuted ? paletteData.DarkMuted.rgb[1] : "#fff"}, ${
          paletteData.DarkMuted ? paletteData.DarkMuted.rgb[2] : "#fff"
        }), rgb(${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[0] : "#fff"
        },${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[1] : "#fff"
        }, ${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[2] : "#fff"
        }), rgb(${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[0] : "#fff"
        },${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[1] : "#fff"
        }, ${
          paletteData.DarkVibrant ? paletteData.DarkVibrant.rgb[2] : "#fff"
        }))`;
        const mainColor = `rgb(${
          paletteData.Vibrant ? paletteData.Vibrant.rgb[0] : "0"
        },${paletteData.Vibrant ? paletteData.Vibrant.rgb[1] : "0"},${
          paletteData.Vibrant ? paletteData.Vibrant.rgb[2] : "0"
        })`;

        return {
          title,
          background,
          mainColor,
          author,
          image,
          description,
        };
      } catch (error) {
        functions.logger.debug(
          "An error occured while fetching the series info",
          error
        );
        throw new functions.https.HttpsError("internal", "unknown", error);
      }
    });
