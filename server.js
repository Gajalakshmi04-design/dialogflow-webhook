import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------
//  STATIC HOSTING FOR AUDIO FILES
// -------------------------------
app.use("/audio", express.static(path.join(__dirname, "audio")));

// -------------------------------
//      AZURE CONFIG
// -------------------------------
const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

// -------------------------------
//      MAIN DIALOGFLOW WEBHOOK
// -------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const text =
      req.body.queryResult.fulfillmentText ||
      req.body.queryResult.queryText ||
      "नमस्ते, मैं आपकी कैसे मदद कर सकती हूँ?";

    // ----------- SLOWER, NATURAL AARTI VOICE ------------
    const ssml = `
      <speak version="1.0" xml:lang="hi-IN">
        <voice name="hi-IN-AartiNeural">
          <prosody rate="0.85">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    // ----------- CALL AZURE TTS ------------
    const ttsResponse = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
      },
      body: ssml
    });

    if (!ttsResponse.ok) {
      console.log("Azure Error:", await ttsResponse.text());
      return res.json({ fulfillmentText: "Azure TTS error" });
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // ----------- SAVE MP3 ------------
    const filename = `tts_${Date.now()}.mp3`;
    fs.writeFileSync(path.join(__dirname, "audio", filename), audioBuffer);

    const publicUrl = `${req.protocol}://${req.get("host")}/audio/${filename}`;
    console.log("🔊 AUDIO URL:", publicUrl);

    // ----------- SEND AUDIO TO DIALOGFLOW ------------
    return res.json({
      payload: {
        google: {
          expectUserResponse: true,
          richResponse: {
            items: [
              {
                mediaResponse: {
                  mediaType: "AUDIO",
                  mediaObjects: [
                    {
                      name: "Aarti Voice",
                      contentUrl: publicUrl
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.json({ fulfillmentText: "Server error" });
  }
});

// -----------------------
app.get("/", (req, res) => {
  res.send("Dialogflow + Azure TTS Webhook Running 🚀");
});
// -----------------------

export default app;
