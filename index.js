require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

// HOME
app.get("/", (req, res) => {
  res.send("WhatsApp Bot Running");
});

// WEBHOOK VERIFY
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// WEBHOOK RECEIVE
app.post("/webhook", async (req, res) => {
  console.log("WEBHOOK HIT:", JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];

    if (msg) {
      const from = msg.from;

      await axios.post(
        `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: "Hello 👋 Your bot is working!"
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

  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
    res.sendStatus(200);
  }
});

app.get("/test-send", async (req, res) => {

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: "YOUR_NUMBER_WITH_COUNTRY_CODE",
        type: "text",
        text: { body: "Test from Render" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (e) {
    res.json(e.response?.data || e.message);
  }
});




// SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {


console.log("PHONE_NUMBER_ID:", process.env.PHONE_NUMBER_ID);
console.log("VERIFY_TOKEN:", process.env.VERIFY_TOKEN);
console.log("TOKEN EXISTS:", !!process.env.TOKEN);



  console.log("Server running on port", PORT);
});
