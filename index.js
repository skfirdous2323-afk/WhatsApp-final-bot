require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Welcome menu
const welcomeMenu = `💪 *Welcome back!*

1️⃣ Check-in
2️⃣ My Details
3️⃣ Due Date
4️⃣ Workout Plan
5️⃣ Diet Plan

✍️ Reply with the option number.`;

// Twilio WhatsApp webhook
app.post("/webhook", async (req, res) => {
  // Twilio sends phone as whatsapp:+919876543210
  let from = req.body.From || "";
  let incomingMessage = (req.body.Body || "").trim().toLowerCase();

  // Extract only last 10 digits
  let mobile = from.replace("whatsapp:+91", "").replace("whatsapp:", "");
  if (mobile.length > 10) {
    mobile = mobile.slice(-10);
  }

  let reply = "";

  // Check-in command
  if (
    incomingMessage === "1" ||
    incomingMessage === "check in" ||
    incomingMessage === "check-in" ||
    incomingMessage === "checkin"
  ) {
    // 1. Check customer exists in customers table
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("mobile_number", mobile)
      .single();

    // If customer not found
    if (customerError || !customer) {
      reply = `❌ First join the gym.

Please contact the gym front desk.`;
    } else {
      const today = new Date().toISOString().split("T")[0];

      // 2. Check if already checked in today
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("mobile_number", mobile)
        .eq("visit_date", today);

      if (existing && existing.length > 0) {
        reply = `✅ You are already checked-in today.`;
      } else {
        // 3. Insert attendance
        await supabase
          .from("attendance")
          .insert([{ mobile_number: mobile, visit_date: today }]);

        // 4. Update last visit date
        await supabase
          .from("customers")
          .update({ last_visit_date: today })
          .eq("mobile_number", mobile);

        reply = `✅ Check-in successful!

Welcome to the gym today 💪`;
      }
    }
  } else {
    // Any other message → show menu
    reply = welcomeMenu;
  }

  // Send Twilio XML response
  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
  <Message>${reply}</Message>
</Response>
`);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Gym Bot running on port ${PORT}`);
});


