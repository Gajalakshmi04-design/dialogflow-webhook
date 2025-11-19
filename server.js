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
// 1. STATIC HOSTING FOR AUDIO
// -------------------------------
app.use("/audio", express.static(path.join(__dirname, "audio")));

// -------------------------------
// 2. AZURE CONFIG
// -------------------------------
const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

// -------------------------------
// 3. MAIN DIALOGFLOW WEBHOOK
// -------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const text = req.body.queryResult.fulfillmentText || "Hello from Azure";

    // ---------------------------
    // 4. GENERATE AUDIO FROM AZURE
    // ---------------------------
    const ssml = `
      <speak version='1.0' xml:lang='hi-IN'>
        <voice name='hi-IN-AartiNeural'>
        <prosody rate="0.85">
          ${text}
        </voice>
      </speak>
    `;

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
      return res.json({
        fulfillmentText: "Azure TTS error"
      });
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // ---------------------------
    // 5. SAVE MP3 FILE
    // ---------------------------
    const filename = `tts_${Date.now()}.mp3`;
    const filepath = path.join(__dirname, "audio", filename);

    fs.writeFileSync(filepath, audioBuffer);

    const publicUrl = `${req.protocol}://${req.get("host")}/audio/${filename}`;

    console.log("Generated Audio URL:", publicUrl);

    // ---------------------------
    // 6. RETURN AUDIO TO DIALOGFLOW PHONE GATEWAY
    // ---------------------------
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
                      name: "Azure Aarti Voice",
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
    res.json({
      fulfillmentText: "Internal server error"
    });
  }
});

// -------------------------------
// 7. HEALTH CHECK
// -------------------------------
app.get("/", (req, res) => {
  res.send("Dialogflow Webhook + Azure TTS is running 🚀");
});

// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

