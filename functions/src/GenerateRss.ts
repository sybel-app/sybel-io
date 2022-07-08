import * as functions from "firebase-functions";
import cors from "cors";
import https from "https";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import GenerateRssRequestDto from "./types/request/GenerateRssRequestDto";

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
 *
 * TODO : Switch back to https function, like analytics and
 * TODO : Setup caching
 */
export default () =>
  functions
    .region("europe-west3")
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        // Extract the info from the request body
        const requestDto: GenerateRssRequestDto = request.body.data;

        // Then check all the info
        if (
          !requestDto.rss ||
          !requestDto.uid ||
          !requestDto.oid ||
          !requestDto.sid
        ) {
          response.status(500).send({ error: "missing arguments" });
          return;
        }
        let data = "";
        try {
          // Request the rss url to extract some info
          https.get(requestDto.rss, function (res) {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 400
            ) {
              // Save this rss data
              res.on("data", function (data_) {
                data += data_.toString();
              });
              // Once we reached the end of the data, parse the object and build the new url
              res.on("end", function () {
                const jObj = parser.parse(data);
                jObj.rss.channel.item.map(
                  (
                    each: any // eslint-disable-line
                  ) =>
                    each.enclosure.att_url
                      ? (each.enclosure.att_url =
                          process.env.BASE_URL_AUDIO_REDIRECT +
                          "?uid=" +
                          requestDto.uid +
                          "&oid=" +
                          requestDto.oid +
                          "&sid=" +
                          requestDto.sid +
                          "&rss=" +
                          each.enclosure.att_url)
                      : undefined
                );
                // Build the new url the client should could to have TSE reward
                const newUrl = builder.build(jObj);
                response
                  .set("Content-Type", "text/xml; charset=utf8")
                  .status(200)
                  .send(newUrl);
              });
            }
          });
        } catch (error) {
          response.status(500).send(error);
        }
      });
    });
