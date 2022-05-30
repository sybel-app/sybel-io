import * as functions from "firebase-functions";
import cors from "cors";
import https from "https";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

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
        if (
          !request.query.rss ||
          !request.query.uid ||
          !request.query.oid ||
          !request.query.sid
        ) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const rssUrl = request.query.rss;
          const userId = request.query.uid;
          const ownerId = request.query.oid;
          const seriesId = request.query.sid;
          let data = "";
          try {
            https.get(rssUrl as string, function (res) {
              if (
                res.statusCode &&
                res.statusCode >= 200 &&
                res.statusCode < 400
              ) {
                res.on("data", function (data_) {
                  data += data_.toString();
                });
                res.on("end", function () {
                  const jObj = parser.parse(data);
                  jObj.rss.channel.item.map(
                    (
                      each: any // eslint-disable-line
                    ) =>
                      each.enclosure.att_url
                        ? (each.enclosure.att_url =
                            process.env.AUDIO +
                            "?uid=" +
                            userId +
                            "&oid=" +
                            ownerId +
                            "&sid=" +
                            seriesId +
                            "&rss=" +
                            each.enclosure.att_url)
                        : undefined
                  );
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
        }
      });
    });
