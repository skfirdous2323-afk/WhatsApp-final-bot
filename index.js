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
6️⃣ Progress and Motivation
✍️ Reply with the option number.`;

// Progress message
const progressMessage = `🔥 *Your Fitness Journey Progress* 💪

7 Days   ▓
21 Days  ▓▓
30 Days  ▓▓▓
3 Months ▓▓▓▓▓▓
6 Months ▓▓▓▓▓▓▓▓▓▓

🗓️ 7 Days:
⚡ More energy
😊 Body feels lighter

📅 21 Days:
🔥 Habit becomes strong
💪 Strength increases

🏆 30 Days:
👕 Visible body changes
😎 Confidence grows

📈 3 Months:
💥 Transformation starts
👀 People notice your progress

🚀 6 Months:
🏋️ Major transformation
🌟 Stronger, fitter, healthier

💬 "Consistency beats motivation."
Keep showing up every day! 💪🔥`;

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

  let reply = welcomeMenu;



  // =========================
  // 1️⃣ CHECK-IN
  // =========================
  if (
    incomingMessage === "1" ||
    incomingMessage === "check in" ||
    incomingMessage === "check-in" ||
    incomingMessage === "checkin"
  ) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("mobile_number", mobile)
      .single();

    // Customer not found
    if (customerError || !customer) {
      reply = `❌ First join the gym.

Please contact the gym front desk.`;
    } else {
      const today = new Date().toISOString().split("T")[0];

      // Check if already checked in today
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("mobile_number", mobile)
        .eq("visit_date", today);

      if (existing && existing.length > 0) {
        reply = `✅ You are already checked-in today.`;
      } else {
        // Insert attendance
        await supabase
          .from("attendance")
          .insert([{ mobile_number: mobile, visit_date: today }]);

        // Update last visit date
        await supabase
          .from("customers")
          .update({ last_visit_date: today })
          .eq("mobile_number", mobile);

        reply = `✅ Check-in successful!

Welcome to the gym today 💪`;
      }
    }
  }

  // =========================
  // 2️⃣ MY DETAILS
  // =========================
  else if (incomingMessage === "2") {
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("mobile_number", mobile)
      .single();

    if (error || !customer) {
      reply = `❌ First join the gym.

Please contact the gym front desk.`;
    } else {
      // Count total check-ins
      const { data: visits } = await supabase
        .from("attendance")
        .select("id")
        .eq("mobile_number", mobile);

      const totalVisits = visits ? visits.length : 0;

      // Calculate days since join
      let joinedDays = "N/A";
      if (customer.join_date) {
        const joinDate = new Date(customer.join_date);
        const today = new Date();
        const diffTime = today - joinDate;
        joinedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      // Progress stage
      let progressLevel = "🌱 Getting Started";
      if (totalVisits >= 7) progressLevel = "⚡ 7 Days Progress";
      if (totalVisits >= 21) progressLevel = "🔥 21 Days Habit Built";
      if (totalVisits >= 30) progressLevel = "🏆 30 Days Transformation Started";
      if (totalVisits >= 90) progressLevel = "💥 3 Months Visible Transformation";
      if (totalVisits >= 180) progressLevel = "🚀 6 Months Major Transformation";

      reply = `👤 *My Profile*

📝 Name: ${customer.name || "N/A"}
📱 Mobile: ${mobile}
🎂 Age: ${customer.age || "N/A"}
🎯 Goal: ${customer.goal || "N/A"}
📦 Plan: ${customer.plan || "N/A"}
📌 Status: ${customer.status || "Active"}
📅 Join Date: ${customer.join_date || "N/A"}
🗓️ Days Since Join: ${joinedDays}
🏃 Last Visit: ${customer.last_visit_date || "Never"}

📊 *Attendance Summary*
✅ Total Check-ins: ${totalVisits}

🏆 *Current Progress*
${progressLevel}

${progressMessage}`;
    }
  }

// =========================
  // 4️⃣ WORKOUT PLAN
  // =========================
  else if (incomingMessage === "4") {
    // Check customer exists
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name")
      .eq("mobile_number", mobile)
      .single();

    if (customerError || !customer) {
      reply = `❌ First join the gym.

Please contact the gym front desk.`;
    } else {
      // Get today's day name in India timezone
      const todayDay = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata"
      });

      // Fetch workout plan from Supabase table: workouts
      const { data: workouts, error: workoutError } = await supabase
        .from("workouts")
        .select("exercise, reps")
        .eq("mobile_number", mobile)
        .eq("day", todayDay);

      if (workoutError || !workouts || workouts.length === 0) {
        reply = `🏋️ *Workout Plan*

👤 ${customer.name}
📅 Today: ${todayDay}

❌ No workout plan found for today.`;
      } else {
        let workoutText = `🏋️ *Today's Workout Plan*\n\n`;
        workoutText += `👤 ${customer.name}\n`;
        workoutText += `📅 ${todayDay}\n\n`;

        workouts.forEach((item, index) => {
          workoutText += `${index + 1}️⃣ ${item.exercise}\n`;
          workoutText += `🔁 ${item.reps}\n\n`;
        });

        workoutText += `🔥 Stay focused and train hard!\n`;
        workoutText += `💪 Consistency creates results.`;

        reply = workoutText;
      }
    }
  }

  



  // =========================
  // 6️⃣ PROGRESS & MOTIVATION
  // =========================
  else if (incomingMessage === "6") {
    reply = progressMessage;
  }

  // =========================
  // DEFAULT MENU
  // =========================
  else {
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
