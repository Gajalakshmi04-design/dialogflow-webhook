import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

app.get("/", (req, res) => {
  res.send("Server is running");
});

// --------------------
// TEST AZURE ENDPOINT
// --------------------
app.get("/test", async (req, res) => {
  try {
    if (!AZURE_KEY || !AZURE_REGION) {
      return res.status(500).send("Azure env vars missing");
    }

    const ttsUrl = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
      <speak version="1.0" xml:lang="en-US">
        <voice name="en-US-JennyNeural">Hello from Azure test.</voice>
      </speak>
    `;

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
      },
      body: ssml
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).send(`Azure Error: ${err}`);
    }

    res.send("Azure TTS working ✔️");
  } catch (err) {
    res.status(500).send("Server Error: " + err.message);
  }
});

// --------------------
app.listen(10000, () => {
  console.log("Server running on port 10000");
});

