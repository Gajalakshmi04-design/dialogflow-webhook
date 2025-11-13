import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const text = req.body.queryResult.fulfillmentText || "Hello!";

  const speechKey = process.env.AZURE_KEY;
  const region = process.env.AZURE_REGION;
  const voice = "en-IN-AarohiNeural"; // Aarti / Indian English voice
  const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `<speak version='1.0' xml:lang='en-IN'>
                  <voice name='${voice}'>${text}</voice>
                </speak>`;

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": speechKey,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
    },
    body: ssml
  });

  if (!response.ok) {
    return res.json({
      fulfillmentText: "Azure TTS request failed."
    });
  }

  const audioBuffer = await response.arrayBuffer();

  // Send text back to Dialogflow (for now)
  res.json({
    fulfillmentText: "Playing Aarti voice for your Dialogflow response!"
  });

  // (Later we'll connect this audio to Dialogflow Gateway for call playback)
});

app.listen(3000, () => console.log("✅ Webhook running on port 3000"));
