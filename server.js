import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(bodyParser.json());

const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

const __dirname = path.resolve();

// --------------------
// TEST ENDPOINT
// --------------------
app.get("/test", (req, res) => {
  res.send("Azure TTS working ✔️");
});

// --------------------
// DIALOGFLOW WEBHOOK
// --------------------
app.post("/dialogflow", async (req, res) => {
  try {
    const userMessage = req.body.queryResult.queryText;

    if (!userMessage) {
      return res.send({
        fulfillmentText: "No input received."
      });
    }

    // Azure TTS URL
    const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version="1.0" xml:lang="en-US">
        <voice name="en-US-JennyNeural">${userMessage}</voice>
      </speak>
    `;

    const azureResponse = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
      },
      body: ssml
    });

    const audioBuffer = await azureResponse.arrayBuffer();
    const audioFile = Buffer.from(audioBuffer);

    const filename = `audio_${Date.now()}.mp3`;
    const filePath = path.join(__dirname, filename);

    fs.writeFileSync(filePath, audioFile);

    const fileUrl = `https://${req.headers.host}/${filename}`;

    return res.send({
      fulfillmentText: "Here is your audio.",
      fulfillmentMessages: [
        {
          payload: {
            audioUrl: fileUrl
          }
        }
      ]
    });

  } catch (err) {
    return res.send({
      fulfillmentText: "Error: " + err.message
    });
  }
});

// --------------------
// STATIC AUDIO HOSTING
// --------------------
app.use(express.static(__dirname));

app.listen(10000, () => {
  console.log("Server running on port 10000");
});

