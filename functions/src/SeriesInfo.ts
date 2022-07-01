import * as functions from "firebase-functions";
import cors from "cors";
import https from "https";
import { XMLParser } from "fast-xml-parser";
import Vibrant from "node-vibrant";
import { RuntimeOptions } from "firebase-functions";

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "att_",
};
const parser = new XMLParser(options);
/**
 * @function
 * @param {functions.https.Request} request
 * @param {functions.Response<any>} response
 * @return {void}
 */

const runtimeOpts: RuntimeOptions = {
  memory: "2GB",
  timeoutSeconds: 540,
};

export default () =>
  functions
    .runWith(runtimeOpts)
    .region("europe-west3")
    .https.onRequest(async (request, response) => {
      cors()(request, response, async () => {
        if (!request.body.rss) {
          response.status(500).send({ error: "missing arguments" });
        } else {
          const rssUrl = request.body.rss;
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
                res.on("end", async function () {
                  const jObj = parser.parse(data);
                  const image = jObj.rss.channel.image.url;
                  const paletteData = await Vibrant.from(image).getPalette();
                  const title = jObj.rss.channel.title;
                  const description = jObj.rss.channel.description;
                  const author = jObj.rss.channel["itunes:author"];
                  const background = `linear-gradient(rgb(${
                    paletteData.DarkMuted
                      ? paletteData.DarkMuted.rgb[0]
                      : "#fff"
                  }, ${
                    paletteData.DarkMuted
                      ? paletteData.DarkMuted.rgb[1]
                      : "#fff"
                  }, ${
                    paletteData.DarkMuted
                      ? paletteData.DarkMuted.rgb[2]
                      : "#fff"
                  }), rgb(${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[0]
                      : "#fff"
                  },${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[1]
                      : "#fff"
                  }, ${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[2]
                      : "#fff"
                  }), rgb(${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[0]
                      : "#fff"
                  },${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[1]
                      : "#fff"
                  }, ${
                    paletteData.DarkVibrant
                      ? paletteData.DarkVibrant.rgb[2]
                      : "#fff"
                  }))`;
                  const mainColor = `rgb(${
                    paletteData.Vibrant ? paletteData.Vibrant.rgb[0] : "0"
                  },${
                    paletteData.Vibrant ? paletteData.Vibrant.rgb[1] : "0"
                  },${
                    paletteData.Vibrant ? paletteData.Vibrant.rgb[2] : "0"
                  })`;
                  response
                    .status(200)
                    .send({ title, background, mainColor, author, image, description });
                });
              }
            });
          } catch (error) {
            response.status(500).send(error);
          }
        }
      });
    });
