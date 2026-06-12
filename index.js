require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

// Home Route
app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running");
});

// Webhook Verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Receive Messages
app.post("/webhook", async (req, res) => {
  try {
    const msg =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (msg) {
      const from = msg.from;

      await axios.post(
        `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: "What is your name?"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error(
      error.response?.data || error.message
    );
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

