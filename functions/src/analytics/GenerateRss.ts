import * as functions from "firebase-functions";
import cors from "cors";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import AnalyticsUrlRequestDto from "../types/request/AnalyticsUrlRequestDto";
import axios from "axios";

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "att_",
};
const parser = new XMLParser(options);
const builder = new XMLBuilder(options);

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
        // Extract the data from the request query
        const requestDto: AnalyticsUrlRequestDto = {
          rssUrl: request.query.rss as string,
          userId: request.query.uid as string,
          seriesId: request.query.sid as string,
        };

        // Then check all the info
        if (!requestDto.rssUrl || !requestDto.userId || !requestDto.seriesId) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }
        let data = "";
        try {
          // Get the Rss data
          const rssResponse = await axios.get(requestDto.rssUrl);

          // Check the response code
          if (rssResponse.status >= 400) {
            functions.logger.debug("Invalid response from the rss url");
            throw new functions.https.HttpsError(
              "internal",
              "unable to extract rss info from the rss feed"
            );
          }

          // Extract the data from the rss feed
          const rssXmlObject = parser.parse(rssResponse.data);
          rssXmlObject.rss.channel.item.map(
            (
              each: any // eslint-disable-line
            ) =>
              each.enclosure.att_url
                ? (each.enclosure.att_url =
                    process.env.BASE_URL_AUDIO_REDIRECT +
                    "?uid=" +
                    requestDto.userId +
                    "&sid=" +
                    requestDto.seriesId +
                    "&rss=" +
                    each.enclosure.att_url)
                : undefined
          );
          // Build the new url the client should could to have TSE reward
          const newUrl = builder.build(rssXmlObject);
          response
            .set("Content-Type", "text/xml; charset=utf8")
            .set("Cache-Control", "public, max-age=600, s-maxage=1200") // Cached for 20min on CDN and 10min on client
            .status(200)
            .send(newUrl);
        } catch (error) {
          response.status(500).send(error);
        }
      });
    });
