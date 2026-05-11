const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Welcome menu
const welcomeMenu = `💪 *Welcome back!*

1️⃣ Check-in
2️⃣ My Details
3️⃣ Due Date
4️⃣ Workout Plan
5️⃣ Diet Plan

✍️ Reply with the option number.`;

// Twilio WhatsApp webhook
app.post("/webhook", (req, res) => {
  const incomingMessage = (req.body.Body || "").trim().toLowerCase();

  let reply = "";

  // ✅ If user sends "1" OR "check in" OR "check-in"
  if (
    incomingMessage === "1" ||
    incomingMessage === "check in" ||
    incomingMessage === "check-in" ||
    incomingMessage === "checkin"
  ) {
    reply = `✅ Check-in successful!

Welcome to the gym today 💪`;
  } else {
    // Show menu for any other message
    reply = welcomeMenu;
  }

  // Send reply to Twilio
  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
  <Message>${reply}</Message>
</Response>
`);
});

// Start server
app.listen(5000, () => {
  console.log("🚀 Gym Bot running on port 5000");
});
